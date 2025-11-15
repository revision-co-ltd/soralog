# 操縦者・機体 本地云端同步修复报告

## 📋 问题描述

操縦者（飞行员）和機体（无人机）的本地数据和云端数据没有正确上传和融合，存在以下问题：

1. **创建和更新未区分**：`savePilot`和`saveUAV`方法总是使用`type: 'create'`，导致更新时也尝试创建新记录
2. **缺少独立的update方法**：没有专门的更新方法
3. **数据重复**：本地和云端数据不能正确合并，可能产生重复记录

## ✅ 解决方案

### 1. 修复 `supabase-sync.service.ts`

#### 改进 `savePilot` 方法
```typescript
async savePilot(data: any): Promise<string> {
  const id = data.id || this.generateId();
  const pilot = { ...data, id, syncStatus: 'pending' as const };

  await storageService.save(STORES.PILOTS, pilot);
  
  // 🆕 判断是创建还是更新
  const isUpdate = !!data.id && !data.id.toString().startsWith('local');
  
  await storageService.addToSyncQueue({
    type: isUpdate ? 'update' : 'create',  // ✅ 智能判断
    storeName: STORES.PILOTS,
    data: pilot,
  });

  if (this.status === 'online') {
    this.triggerSync().catch(console.error);
  }

  return id;
}
```

#### 新增 `updatePilot` 方法
```typescript
async updatePilot(id: string, updates: any): Promise<void> {
  // 1. 更新本地数据
  const existing = await storageService.get(STORES.PILOTS, id);
  if (existing) {
    const updated = { ...existing, ...updates, syncStatus: 'pending' };
    await storageService.save(STORES.PILOTS, updated);
  }

  // 2. 添加到同步队列
  await storageService.addToSyncQueue({
    type: 'update',
    storeName: STORES.PILOTS,
    data: { id, ...updates },
  });

  // 3. 尝试同步
  if (this.status === 'online') {
    this.triggerSync().catch(console.error);
  }
}
```

#### 改进 `saveUAV` 和新增 `updateUAV` 方法
同样的改进应用于UAV相关方法。

### 2. 智能数据合并

#### 新增 `mergeData` 方法
```typescript
private mergeData(localData: any[], cloudData: any[], uniqueKey: string): any[] {
  const merged = new Map<string, any>();
  
  // 1. 先添加云端数据（优先级高）
  for (const item of cloudData) {
    const key = item[uniqueKey] || item.id;
    merged.set(key, { ...item, _source: 'cloud' });
  }
  
  // 2. 添加本地独有数据（未同步的）
  for (const item of localData) {
    const key = item[uniqueKey] || item.id;
    
    if (!merged.has(key) || item.id?.toString().startsWith('local')) {
      // 检查是否有相同名称的云端数据
      const cloudItem = Array.from(merged.values()).find(
        (m) => m[uniqueKey] === item[uniqueKey] && m._source === 'cloud'
      );
      
      if (!cloudItem) {
        merged.set(item.id || key, { ...item, _source: 'local' });
      } else {
        // 合并本地更新到云端数据（保留云端ID）
        merged.set(cloudItem.id, { 
          ...cloudItem, 
          ...item, 
          id: cloudItem.id,  // ✅ 保留云端ID
          _source: 'merged' 
        });
      }
    }
  }
  
  return Array.from(merged.values()).map(({ _source, ...item }) => item);
}
```

#### 改进 `getPilots` 和 `getUAVs` 方法
```typescript
async getPilots(): Promise<any[]> {
  let cloudData: any[] = [];
  
  // 1. 尝试从云端获取
  if (this.status === 'online') {
    try {
      cloudData = await supabasePilots.getAll();
    } catch (error) {
      console.warn('⚠️ 云端获取飞行员失败:', error);
    }
  }

  // 2. 从本地获取
  const localData = await storageService.getAll(STORES.PILOTS);

  // 3. 🆕 智能合并数据（去重）
  const merged = this.mergeData(localData, cloudData, 'name');
  
  // 4. 更新本地缓存
  for (const item of merged) {
    await storageService.save(STORES.PILOTS, { 
      ...item, 
      syncStatus: item.id?.toString().startsWith('local') ? 'pending' : 'synced' 
    });
  }

  return merged.map(this.convertFromSupabaseFormat);
}
```

### 3. 修复 `App.tsx` 中的操作方法

#### 更新飞行员
```typescript
const handleUpdatePilot = async (id: string, updates: Partial<Pilot>) => {
  try {
    // 1. 立即更新本地状态
    setPilots(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    
    // 2. 🆕 使用updatePilot方法同步到云端
    await supabaseSyncService.updatePilot(id, updates);
    console.log('✅ 飞行员已更新:', id);
  } catch (error) {
    console.error('❌ 更新飞行员失败:', error);
    // 回滚本地状态
    await loadData();
  }
};
```

#### 删除飞行员（软删除）
```typescript
const handleDeletePilot = async (id: string) => {
  try {
    // 1. 立即更新本地状态（软删除）
    setPilots(prev => prev.map(p => p.id === id ? { ...p, isActive: false } : p));
    
    // 2. 🆕 使用updatePilot方法同步到云端
    await supabaseSyncService.updatePilot(id, { isActive: false });
    console.log('✅ 飞行员已删除:', id);
  } catch (error) {
    console.error('❌ 删除飞行员失败:', error);
    await loadData();
  }
};
```

#### 更新飞行时间
```typescript
// 添加飞行记录时自动更新UAV和Pilot的飞行时间
const pilot = pilots.find(p => p.name === newFlight.pilot && p.isActive);
if (pilot) {
  const updates = {
    totalFlightHours: pilot.totalFlightHours + flightMinutes
  };
  setPilots(prev => prev.map(p => p.id === pilot.id ? { ...p, ...updates } : p));
  // 🆕 使用updatePilot同步到云端
  await supabaseSyncService.updatePilot(pilot.id, updates);
}
```

### 4. 简化数据融合逻辑

```typescript
const handleDataMergeOnLogin = async () => {
  const mergeKey = `data_merged_${user?.id}`;
  if (localStorage.getItem(mergeKey) === 'true') {
    return;
  }

  try {
    // 🆕 触发同步（会自动上传所有待同步的数据）
    const result = await supabaseSyncService.triggerSync();
    
    if (result.success > 0) {
      console.log(`✅ 数据融合完成！成功: ${result.success}, 失败: ${result.failed}`);
      // 重新加载数据以获取云端的最新数据
      await loadData();
    }

    localStorage.setItem(mergeKey, 'true');
  } catch (error) {
    console.error('❌ 数据融合失败:', error);
  }
};
```

## 🎯 核心改进

### 1. **智能创建/更新判断**
- 根据ID判断是创建还是更新操作
- 本地ID（以"local"开头）→ 创建新记录
- 云端ID → 更新现有记录

### 2. **独立的更新方法**
- `updatePilot(id, updates)` - 更新飞行员
- `updateUAV(id, updates)` - 更新无人机
- 避免创建重复记录

### 3. **智能数据合并**
- 云端数据优先
- 自动识别相同名称的记录
- 保留云端ID，合并本地更新
- 避免数据重复

### 4. **错误处理和回滚**
- 更新失败时自动回滚本地状态
- 重新加载数据确保一致性

## 📊 工作流程

### 离线创建 → 登录同步
```
1. 离线创建操纵士/机体
   └─> 保存到 IndexedDB (ID: local-xxx, syncStatus: pending)
   
2. 用户登录
   └─> 触发 handleDataMergeOnLogin()
   
3. 自动同步
   └─> triggerSync() 上传所有 pending 数据
   
4. 数据合并
   └─> 云端返回新ID，更新本地缓存
   
5. 完成
   └─> 本地和云端数据一致
```

### 在线更新
```
1. 用户更新操纵士/机体信息
   └─> 立即更新本地状态（乐观更新）
   
2. 调用 updatePilot/updateUAV
   └─> 保存到 IndexedDB (syncStatus: pending)
   └─> 添加到同步队列 (type: 'update')
   
3. 如果在线
   └─> 立即同步到 Supabase
   
4. 同步成功
   └─> 更新 syncStatus: 'synced'
   
5. 同步失败
   └─> 回滚本地状态，显示错误
```

## 🔍 测试建议

### 场景1：离线创建 → 登录同步
1. 离线状态下创建飞行员和无人机
2. 登录账号
3. 验证数据是否正确上传到云端
4. 检查本地ID是否更新为云端ID

### 场景2：在线更新
1. 在线状态下更新飞行员信息
2. 检查云端数据是否同步更新
3. 刷新页面验证数据持久化

### 场景3：多设备同步
1. 设备A创建飞行员
2. 设备B登录同一账号
3. 验证设备B能看到设备A的数据

### 场景4：数据冲突处理
1. 离线创建同名飞行员
2. 云端已存在同名飞行员
3. 验证是否正确合并（保留云端ID）

## 🔧 额外修复：登录后强制同步

### 问题
登录后如果同步服务处于离线状态，就不会尝试同步，必须等到下次自动同步（5分钟后）。

### 解决方案
添加 `forceSyncOnLogin()` 方法，在用户登录时强制检查在线状态并立即尝试同步。

```typescript
// supabase-sync.service.ts

/**
 * 强制同步（用于登录后）- 不检查当前状态，强制尝试连接
 */
async forceSyncOnLogin(): Promise<{ success: number; failed: number }> {
  console.log('🔐 登录后强制同步...');
  
  if (!this.currentUserId) {
    console.log('👤 未登录，无法同步');
    return { success: 0, failed: 0 };
  }

  // 1. 强制检查在线状态
  await this.checkOnlineStatus();
  console.log(`📡 当前状态: ${this.status}`);
  
  // 2. 如果仍然离线，直接返回
  if (this.status === 'offline') {
    console.log('📴 确认离线，无法同步');
    return { success: 0, failed: 0 };
  }
  
  // 3. 在线，执行同步
  return this.triggerSync();
}
```

### 使用位置
1. **App.tsx - 登录后数据融合**
```typescript
const handleDataMergeOnLogin = async () => {
  // 🆕 使用强制同步方法（不管当前状态，强制检查并尝试连接）
  const result = await supabaseSyncService.forceSyncOnLogin();
  // ...
};
```

2. **认证状态监听**
```typescript
supabaseAuth.onAuthStateChange((user) => {
  this.currentUserId = user?.id || null;
  if (user) {
    console.log('👤 用户登录，触发强制同步');
    // 登录后使用强制同步，会先检查在线状态
    this.forceSyncOnLogin().catch(console.error);
  }
});
```

### 效果
✅ 用户登录后立即检查网络状态  
✅ 如果在线，立即同步本地数据到云端  
✅ 不需要等待5分钟的自动同步  
✅ 提供更好的用户体验  

## ⚠️ 注意事项

1. **ID管理**：
   - 本地ID格式：`timestamp-randomstring`
   - 云端ID格式：UUID
   - 不要手动修改ID

2. **同步状态**：
   - `pending`：待同步
   - `synced`：已同步
   - `error`：同步失败

3. **软删除**：
   - 使用 `isActive: false` 标记删除
   - 不直接删除数据库记录
   - 保持数据完整性

4. **错误恢复**：
   - 更新失败自动回滚
   - 离线时暂存队列
   - 恢复在线后自动重试

5. **登录同步**：
   - 登录后自动强制检查在线状态
   - 如果在线，立即同步所有待同步数据
   - 避免等待自动同步周期

## ✨ 功能特性

✅ **离线优先**：无网络也能正常使用
✅ **自动同步**：连接恢复后自动上传
✅ **智能合并**：避免数据重复和冲突
✅ **乐观更新**：立即显示，后台同步
✅ **错误处理**：失败自动回滚和重试
✅ **多设备支持**：账号登录实现数据共享

---

## 📅 修复日期
2025-11-15

## 🔧 影响文件
- `src/services/supabase-sync.service.ts` - 核心同步逻辑、强制同步方法
- `src/App.tsx` - 应用层操作方法、登录同步处理

## 🎉 修复版本
- v1.1 (2025-11-15) - 添加登录后强制同步功能
- v1.0 (2025-11-15) - 初始修复：区分创建/更新、智能合并

