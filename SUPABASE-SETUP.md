# Supabase 集成指南

## 🎯 概述

本应用已完全切换到 **Supabase + IndexedDB 离线优先架构**，提供：

- ✅ **完整离线支持** - 无网络也能正常使用
- ✅ **自动云同步** - 联网时自动同步到 Supabase
- ✅ **多设备同步** - 数据在所有设备间自动同步
- ✅ **实时更新** - 支持实时数据订阅（可选）
- ✅ **数据安全** - 行级安全策略，用户数据隔离

---

## 📋 前提条件

1. **Node.js** 16+ 已安装
2. **npm** 或 **yarn** 包管理器
3. **Supabase 账号**（免费）

---

## 🚀 快速开始

### 步骤 1：创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com)
2. 点击 **"Start your project"** 注册/登录
3. 创建新项目：
   - **Project Name**: 无人机飞行记录系统（或任意名称）
   - **Database Password**: 设置强密码（请记住！）
   - **Region**: 选择 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)** 获得最佳延迟
4. 等待项目初始化（约2分钟）

### 步骤 2：执行数据库迁移

1. 在 Supabase 控制台，进入 **SQL Editor**
2. 点击 **"New query"**
3. 复制 `supabase-migration.sql` 文件的全部内容
4. 粘贴到 SQL 编辑器
5. 点击 **"RUN"** 执行

**预期输出：**
```
✅ Supabase 数据库迁移完成！
已创建表: flight_logs, pilots, uavs
已启用行级安全 (RLS)
已创建索引和触发器
```

### 步骤 3：获取 API 密钥

1. 在 Supabase 控制台，进入 **Settings** → **API**
2. 找到以下信息：
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public** key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 步骤 4：配置环境变量

在项目根目录创建 `.env` 文件：

```bash
# Supabase 配置
VITE_SUPABASE_URL=https://你的项目id.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon密钥

# 应用配置
VITE_APP_NAME=無人機飛行記録アプリ
VITE_APP_VERSION=2.0.0-supabase
```

**重要**: 
- 将 `你的项目id` 和 `你的anon密钥` 替换为实际值
- `.env` 文件已在 `.gitignore` 中，不会被提交到 Git

### 步骤 5：启动应用

```bash
# 安装依赖（如果还没安装）
npm install

# 启动开发服务器
npm run dev
```

打开浏览器访问 `http://localhost:5173`

---

## 🔍 验证集成

### 1. 检查控制台日志

打开浏览器开发者工具（F12），应该看到：

```
🚀 初始化应用...
✅ 同步服务初始化完成
📡 同步状态: online
✅ Supabase 连接成功
📥 加载数据...
✅ 数据加载完成: { flights: 5, pilots: 3, uavs: 3 }
```

如果看到 `offline`，说明未配置或无法连接 Supabase（但应用仍可离线使用）

### 2. 测试离线功能

1. 打开应用
2. 添加一条飞行记录
3. **断开网络** （Wi-Fi 或飞行模式）
4. 再添加一条飞行记录
5. 刷新页面 - 数据仍然存在 ✅
6. **重新联网**
7. 等待几秒 - 数据自动同步到云端 ✅

### 3. 查看 Supabase 数据

1. 进入 Supabase 控制台
2. 点击 **Table Editor**
3. 选择 `flight_logs` 表
4. 应该看到你刚才添加的记录

---

## 📊 数据架构

### 表结构

#### flight_logs（飞行记录）
```sql
- id: UUID (主键)
- user_id: UUID (关联用户)
- date: DATE (飞行日期)
- time: TEXT (飞行时间)
- duration: INTEGER (飞行时长-分钟)
- location: TEXT (飞行地点)
- drone_model: TEXT (无人机型号)
- pilot: TEXT (操作员)
- ... 更多字段
```

#### pilots（飞行员）
```sql
- id: UUID
- user_id: UUID
- name: TEXT
- license_number: TEXT
- total_flight_hours: INTEGER (总飞行时间-分钟)
- ...
```

#### uavs（无人机）
```sql
- id: UUID
- user_id: UUID
- nickname: TEXT
- model: TEXT
- category: TEXT (certified/uncertified)
- total_flight_hours: FLOAT (总飞行时间-小时)
- ...
```

### 行级安全 (RLS)

每个表都启用了 RLS，确保：
- ✅ 用户只能访问自己的数据
- ✅ 匿名用户自动分配唯一 ID
- ✅ 数据隔离，安全可靠

---

## 🔧 工作原理

### 离线优先架构

```
用户操作 (添加飞行记录)
    ↓
1. 立即保存到 IndexedDB (离线存储)
    ↓
2. 添加到同步队列
    ↓
3. UI 立即更新（用户无感知延迟）
    ↓
4. 检测网络状态
    ├─ 在线 → 后台自动同步到 Supabase
    └─ 离线 → 队列等待，网络恢复后自动同步
```

### 数据流

```
┌─────────────────────────────────┐
│   React 组件 (App.tsx)          │
│   - 显示数据                     │
│   - 触发操作                     │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ supabaseSyncService             │
│ - 离线优先逻辑                   │
│ - 自动同步                       │
└────┬──────────────────┬─────────┘
     ↓                  ↓
┌────────────┐    ┌─────────────┐
│ IndexedDB  │    │  Supabase   │
│  (离线)     │    │   (云端)     │
└────────────┘    └─────────────┘
```

### 同步策略

- **添加记录**: 立即保存本地 → 后台同步云端
- **页面加载**: 优先从云端获取 → 失败则使用本地
- **自动同步**: 每 5 分钟检查待同步项目
- **网络恢复**: 立即触发同步
- **冲突解决**: 最后写入优先（Last Write Wins）

---

## 🎯 使用场景

### ✅ 完全离线使用

**场景**: 在野外飞行，无网络信号

1. 打开应用（已缓存）
2. 记录飞行数据 → 保存到 IndexedDB
3. 飞行结束后返回基地
4. 连接 Wi-Fi → 自动同步到云端

### ✅ 多设备同步

**场景**: 办公室电脑和现场平板共享数据

1. 办公室电脑添加飞行计划 → 云端
2. 现场平板打开应用 → 自动下载最新数据
3. 平板记录飞行 → 保存本地 + 同步云端
4. 回到办公室 → 电脑自动更新

### ✅ 团队协作

**场景**: 多个操作员使用不同账号

- 每个用户看到自己的数据（RLS 隔离）
- 未来可扩展：共享组织数据

---

## 🐛 常见问题

### Q1: 控制台显示"Supabase 未配置"

**原因**: `.env` 文件不存在或配置错误

**解决**:
1. 确认根目录有 `.env` 文件
2. 检查 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 是否正确
3. **重启开发服务器** (`npm run dev`)

### Q2: 数据保存失败

**检查**:
1. 网络是否连接 → 离线时数据保存在本地
2. Supabase 项目是否暂停 → 免费项目7天无活动会暂停
3. 浏览器控制台是否有错误

**快速修复**:
```bash
# 清除浏览器数据
localStorage.clear();
indexedDB.deleteDatabase('DroneLogDB');
# 刷新页面
```

### Q3: 页面加载慢

**原因**: 首次加载从云端获取数据

**优化**:
- 数据会缓存到 IndexedDB
- 后续加载会更快（离线优先）

### Q4: 数据在设备间不同步

**检查**:
1. 两个设备是否使用同一账号？（匿名模式每次都不同）
2. 网络是否正常？
3. 打开控制台查看同步状态

**解决**: 未来版本将添加邮箱登录功能

### Q5: 如何切换回纯localStorage模式

如果不想使用 Supabase：

1. 不配置 `.env` 文件
2. 应用会自动降级到离线模式
3. 数据仍保存在 IndexedDB（比localStorage更强大）

---

## 📚 API 文档

### supabaseSyncService

#### 飞行记录

```typescript
// 保存飞行记录（离线优先）
const id = await supabaseSyncService.saveFlightLog({
  date: '2024-11-15',
  time: '10:30',
  duration: 45,
  location: '东京',
  droneModel: 'DJI Mini 3',
  pilot: '山田太郎',
  purpose: '摄影'
});

// 获取所有飞行记录
const flights = await supabaseSyncService.getFlightLogs();

// 更新飞行记录
await supabaseSyncService.updateFlightLog(id, { duration: 50 });

// 删除飞行记录
await supabaseSyncService.deleteFlightLog(id);
```

#### 飞行员

```typescript
// 添加飞行员
const id = await supabaseSyncService.savePilot({
  name: '山田太郎',
  licenseNumber: '123456',
  totalFlightHours: 6000
});

// 获取所有飞行员
const pilots = await supabaseSyncService.getPilots();
```

#### 无人机

```typescript
// 添加无人机
const id = await supabaseSyncService.saveUAV({
  nickname: '主力机',
  model: 'DJI Mavic 3',
  category: 'certified'
});

// 获取所有无人机
const uavs = await supabaseSyncService.getUAVs();
```

#### 同步状态

```typescript
// 获取同步状态
const status = supabaseSyncService.getStatus();
// 'online' | 'offline' | 'syncing'

// 监听状态变化
const unsubscribe = supabaseSyncService.onStatusChange((status) => {
  console.log('状态变化:', status);
});

// 手动触发同步
const result = await supabaseSyncService.triggerSync();
// { success: 5, failed: 0 }

// 获取统计信息
const stats = await supabaseSyncService.getSyncStats();
// { pendingSyncCount, localFlightLogs, status, ... }
```

---

## 🔒 安全性

### 认证方式

**当前**: 匿名认证
- 每个设备自动分配唯一 ID
- 数据隔离，互不影响
- 适合个人使用

**未来扩展**: 邮箱/密码认证
- 多设备真正同步
- 团队协作功能

### 数据隔离

- ✅ 行级安全 (RLS) 确保用户只能访问自己的数据
- ✅ Anon key 是公开的，但受 RLS 保护
- ✅ 所有写操作检查 `user_id`

---

## 📈 性能优化

### IndexedDB 优化

- ✅ 索引优化查询
- ✅ 批量写入
- ✅ 异步操作不阻塞 UI

### Supabase 优化

- ✅ 连接池管理
- ✅ 自动重连
- ✅ 请求去抖动

### 网络优化

- ✅ 离线优先，无网络延迟
- ✅ 后台同步，不影响用户体验
- ✅ 失败自动重试（最多3次）

---

## 🚧 未来计划

- [ ] 邮箱/密码登录
- [ ] 实时协作（多用户同时编辑）
- [ ] 冲突解决UI
- [ ] 数据导入/导出
- [ ] 离线地图缓存
- [ ] PWA 完整支持

---

## 📞 支持

如果遇到问题：

1. 查看浏览器控制台日志
2. 检查 Supabase 控制台
3. 参考本文档常见问题部分

---

**更新日期**: 2025-11-15  
**版本**: 2.0.0-supabase  
**状态**: ✅ 生产就绪

