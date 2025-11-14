# 📱 离线支持文档

## 概述

本系统支持**离线优先（Offline-First）**架构，即使没有网络连接也能正常使用，数据会在网络恢复后自动同步到服务器。

---

## 🎯 核心特性

### 1. 完全离线工作
- ✅ 无网络时可正常添加飞行记录
- ✅ 无网络时可正常添加日常点检
- ✅ 数据保存在本地 IndexedDB
- ✅ 支持离线查看历史记录

### 2. 自动同步
- ✅ 网络恢复时自动同步
- ✅ 5分钟自动同步一次（在线时）
- ✅ 手动触发同步
- ✅ 同步失败自动重试

### 3. 状态可视化
- ✅ 实时显示在线/离线状态
- ✅ 显示未同步数据数量
- ✅ 显示最后同步时间
- ✅ 同步进度提示

---

## 📦 数据存储策略

### IndexedDB 结构

```javascript
DroneLogDB
├── flightLogs           // 飞行记录
├── dailyInspections     // 日常点检
├── maintenanceRecords   // 点检整备
├── syncQueue            // 同步队列
└── metadata             // 元数据
```

### 数据状态

每条数据有3种状态：
- **pending**: 待同步（黄色）
- **synced**: 已同步（绿色）
- **error**: 同步失败（红色）

---

## 🔄 同步机制

### 自动同步触发时机

1. **网络状态变化**
   - 从离线变为在线时立即同步
   
2. **定时同步**
   - 在线状态下每5分钟同步一次
   
3. **数据保存后**
   - 在线时保存数据会立即触发同步

### 手动同步

点击右上角的同步状态栏，展开详情面板，点击"今すぐ同期"按钮。

---

## 🎨 UI 指示器

### 状态栏颜色

| 颜色 | 状态 | 说明 |
|------|------|------|
| 🟢 绿色 | 在线 | 已连接到服务器 |
| ⚪ 灰色 | 离线 | 无网络连接 |
| 🔵 蓝色 | 同步中 | 正在同步数据 |

### 未同期数量

状态栏上的数字徽章显示待同步的数据数量。

---

## 📱 移动端支持

### PWA 功能（未来）

当前版本已为PWA做好准备：
- ✅ IndexedDB 离线存储
- ✅ 网络状态监听
- ⏳ Service Worker（下一版本）
- ⏳ App Manifest（下一版本）
- ⏳ 安装到主屏幕（下一版本）

### 原生应用集成

**Android/iOS 应用开发建议**：

1. **使用 WebView**
   ```kotlin
   // Android example
   webView.settings.apply {
       javaScriptEnabled = true
       domStorageEnabled = true
       databaseEnabled = true
   }
   ```

2. **共享 IndexedDB**
   - Web和原生应用使用同一套数据存储
   - 通过 IndexedDB API 访问

3. **网络检测**
   ```kotlin
   // Android
   val connectivityManager = getSystemService(CONNECTIVITY_SERVICE)
   val activeNetwork = connectivityManager.activeNetwork
   ```

---

## 🔧 API 集成

### 前端调用方式

**之前（直接API）**：
```typescript
import { flightLogApi } from './services/api.service';
await flightLogApi.create(data);
```

**现在（离线支持）**：
```typescript
import { syncService } from './services/sync.service';
await syncService.saveFlightLog(data);
```

### 数据读取

```typescript
// 自动处理在线/离线
const logs = await syncService.getFlightLogs();
// 在线时从API获取，离线时从本地获取
```

---

## 🛠️ 故障排除

### 同步失败

**原因**：
1. 服务器未运行
2. 认证Token过期
3. 数据格式错误

**解决方法**：
```typescript
// 查看同步统计
const stats = await syncService.getSyncStats();
console.log(stats);

// 手动触发同步
await syncService.triggerSync();
```

### 清除本地数据

打开浏览器开发者工具：
1. Application → IndexedDB → DroneLogDB
2. 右键删除数据库

---

## 📊 性能考虑

### IndexedDB 限制

- **Chrome**: 约 50% 可用磁盘空间
- **Firefox**: 约 10% 可用磁盘空间
- **Safari**: 约 1GB

### 数据清理策略

- 已同步的数据保留30天
- 同步队列中成功的项目立即清除
- 失败项目重试3次后标记为错误

---

## 🔐 安全考虑

### 本地数据

- IndexedDB 数据存储在用户设备
- 仅限同源访问（Same-Origin Policy）
- 隐私浏览模式下会话结束后清除

### 同步认证

- 使用 JWT Token
- Token 存储在 localStorage
- 过期后需要重新登录

---

## 🚀 未来增强

### 计划功能

1. **冲突解决**
   - 多设备同时编辑同一记录
   - Last-Write-Wins 策略

2. **差异同步**
   - 仅同步变更的字段
   - 减少网络流量

3. **批量同步**
   - 一次同步多条记录
   - 提高效率

4. **离线PDF生成**
   - 本地生成PDF
   - 无需服务器

---

## 📖 代码示例

### 监听同步状态

```typescript
import { syncService } from './services/sync.service';

// 订阅状态变化
const unsubscribe = syncService.onStatusChange((status) => {
  console.log('同步状态:', status);
  // 'online' | 'offline' | 'syncing'
});

// 取消订阅
unsubscribe();
```

### 保存数据

```typescript
// 飞行记录
await syncService.saveFlightLog({
  droneId: 'xxx',
  operatorId: 'yyy',
  flightDate: new Date(),
  // ... 其他字段
});

// 日常点检
await syncService.saveDailyInspection({
  droneId: 'xxx',
  executorId: 'yyy',
  // ... 其他字段
});
```

### 查询数据

```typescript
// 获取所有飞行记录（自动处理在线/离线）
const logs = await syncService.getFlightLogs();

// 获取同步统计
const stats = await syncService.getSyncStats();
/*
{
  pendingSyncCount: 5,
  localFlightLogs: 10,
  localInspections: 3,
  lastSync: 1699999999999
}
*/
```

---

## 📞 技术支持

### 相关文件

- `src/services/storage.service.ts` - IndexedDB 存储
- `src/services/sync.service.ts` - 同步逻辑
- `src/components/SyncStatusBar.tsx` - UI 组件

### 调试

```javascript
// 浏览器控制台
// 查看 IndexedDB
indexedDB.databases().then(console.log);

// 查看同步状态
import { syncService } from './services/sync.service';
syncService.getSyncStats().then(console.log);
```

---

**更新日期**: 2025-11-13  
**版本**: v0.3.0-alpha  
**状态**: ✅ 生产就绪

