# 🚀 Vercel 部署指南

本指南将帮助你将无人机飞行记录APP部署到Vercel平台。

## 📋 部署前准备

### 1. 必需账户
- ✅ [Vercel账户](https://vercel.com/signup)（免费）
- ✅ [GitHub账户](https://github.com)（用于代码托管）
- ✅ 云数据库账户（选择以下之一）：
  - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)（推荐，与Vercel集成最好）
  - [Supabase](https://supabase.com)（免费套餐）
  - [Neon](https://neon.tech)（无服务器PostgreSQL）
  - [Railway](https://railway.app)（支持PostgreSQL）

### 2. 本地测试
在部署前，确保应用在本地正常运行：

```bash
# 安装依赖
npm install

# 启动数据库（Docker）
docker-compose up -d

# 初始化数据库
npm run setup

# 测试前端
npm run dev

# 测试后端
npm run backend
```

---

## 🗂️ 方案一：使用Vercel部署（推荐）

### 步骤1：准备代码仓库

#### 1.1 初始化Git仓库（如果还没有）
```bash
cd "/Users/yang/Downloads/20251113无人机飞行记录APP "
git init
git add .
git commit -m "初始提交：无人机飞行记录APP"
```

#### 1.2 推送到GitHub
```bash
# 在GitHub创建新仓库后
git remote add origin https://github.com/你的用户名/你的仓库名.git
git branch -M main
git push -u origin main
```

### 步骤2：设置云数据库

#### 选项A：使用Vercel Postgres（推荐）

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入 **Storage** → **Create Database**
3. 选择 **Postgres**
4. 创建数据库后，复制 `DATABASE_URL` 连接字符串

#### 选项B：使用Supabase

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目
3. 进入 **Settings** → **Database**
4. 复制 **Connection String** (选择 `Transaction` 模式)
5. 格式：`postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

#### 选项C：使用Neon

1. 登录 [Neon Console](https://console.neon.tech)
2. 创建新项目
3. 复制连接字符串
4. 格式：`postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname`

### 步骤3：配置Vercel项目

#### 3.1 导入GitHub仓库
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New** → **Project**
3. 选择你的GitHub仓库
4. 点击 **Import**

#### 3.2 配置构建设置
在项目设置中配置：

- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

#### 3.3 配置环境变量
在 **Settings** → **Environment Variables** 中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://...` | 数据库连接字符串 |
| `JWT_SECRET` | `your-secret-key` | JWT密钥（至少32字符） |
| `NODE_ENV` | `production` | 生产环境标识 |

**重要提示**：
- `DATABASE_URL`：使用步骤2中获取的数据库连接字符串
- `JWT_SECRET`：生成强密钥，例如：
  ```bash
  # 使用Node.js生成
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

#### 3.4 数据库迁移设置

由于Vercel是Serverless环境，需要特殊处理Prisma迁移。

**方法1：使用Vercel的Build命令（推荐）**

在 `package.json` 中修改构建脚本：

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && vite build",
    "vercel-build": "prisma generate && prisma migrate deploy && vite build"
  }
}
```

**方法2：手动运行迁移**

在本地运行：
```bash
# 设置生产数据库URL
export DATABASE_URL="你的生产数据库URL"

# 运行迁移
npx prisma migrate deploy

# 生成Prisma Client
npx prisma generate

# （可选）填充初始数据
npx tsx prisma/seed.ts
```

### 步骤4：部署

#### 4.1 触发部署
点击 **Deploy** 按钮，Vercel将自动：
1. 克隆代码
2. 安装依赖
3. 运行Prisma生成
4. 执行数据库迁移
5. 构建前端
6. 部署到全球CDN

#### 4.2 查看部署状态
部署通常需要2-5分钟，你可以在 **Deployments** 标签查看实时日志。

#### 4.3 获取部署URL
部署成功后，Vercel会提供一个URL，格式：
```
https://your-project-name.vercel.app
```

---

## 🔧 后端API部署（重要）

### 问题：Vercel主要用于静态网站和Serverless函数

当前项目使用Express服务器，需要调整架构：

### 解决方案1：将后端改为Serverless函数（推荐）

#### 创建API路由

在项目根目录创建 `api/` 文件夹（已创建），每个路由一个文件：

```
api/
├── index.js          # 主入口
├── auth.js           # 认证路由
├── flight-logs.js    # 飞行记录路由
├── drones.js         # 无人机路由
└── ...
```

#### 修改 `vercel.json`（已配置）

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api" }
  ]
}
```

### 解决方案2：分离部署（简单方案）

#### 前端部署到Vercel
- 部署静态网站到Vercel
- 修改API调用地址

#### 后端部署到其他平台
选择支持Node.js服务器的平台：

**选项A：Railway（推荐）**
```bash
# 安装Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
railway up
```

**选项B：Render**
1. 访问 [Render Dashboard](https://dashboard.render.com)
2. 创建新 **Web Service**
3. 连接GitHub仓库
4. 配置：
   - **Build Command**: `cd backend && npm install && npx prisma generate`
   - **Start Command**: `cd backend && npm start`
   - **环境变量**：添加 `DATABASE_URL`, `JWT_SECRET`

**选项C：Heroku**
```bash
# 安装Heroku CLI
npm install -g heroku

# 登录
heroku login

# 创建应用
heroku create your-app-name

# 添加PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# 部署
git push heroku main
```

### 解决方案3：使用Vercel + Vercel Serverless Functions

需要重构后端代码，将Express路由转换为Serverless函数。

#### 示例：创建单个API函数

**文件：`api/flight-logs.ts`**
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'GET') {
    const logs = await prisma.flightLog.findMany({
      take: 10,
      orderBy: { flightDate: 'desc' }
    });
    return res.json(logs);
  }
  
  if (req.method === 'POST') {
    const log = await prisma.flightLog.create({
      data: req.body
    });
    return res.json(log);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
```

---

## 🔄 更新API端点配置

### 修改前端API配置

**文件：`src/services/api.service.ts`**

```typescript
// 原来的配置
const API_BASE_URL = 'http://localhost:3000/api';

// 改为动态配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://your-backend.railway.app/api'  // 生产环境
    : 'http://localhost:3000/api');           // 开发环境
```

### 添加环境变量文件

**文件：`.env.production`**
```
VITE_API_URL=https://your-backend.railway.app/api
```

---

## ✅ 部署后检查清单

### 1. 前端检查
- [ ] 访问 `https://your-app.vercel.app`
- [ ] 检查页面是否正常加载
- [ ] 检查样式是否正确
- [ ] 测试路由跳转

### 2. 后端检查
- [ ] 访问 `https://your-api-url/api/health`
- [ ] 应返回 `{"status":"ok"}`

### 3. 数据库检查
```bash
# 使用Prisma Studio检查数据库
npx prisma studio --url="你的DATABASE_URL"
```

### 4. 功能测试
- [ ] 用户登录/注册
- [ ] 创建飞行记录
- [ ] 创建日常点检
- [ ] 创建维护记录
- [ ] 数据导出（CSV/Excel/PDF）
- [ ] 离线模式（如果支持）

---

## 🐛 常见问题排查

### 问题1：数据库连接失败
**错误信息**：`Can't reach database server`

**解决方法**：
1. 检查 `DATABASE_URL` 环境变量是否正确
2. 确保数据库服务正在运行
3. 检查IP白名单（某些数据库需要添加Vercel的IP）
4. 使用 `?sslmode=require` 参数（PostgreSQL）

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

### 问题2：Prisma Client未生成
**错误信息**：`@prisma/client did not initialize yet`

**解决方法**：
在构建命令中添加 Prisma 生成步骤：
```json
{
  "scripts": {
    "vercel-build": "prisma generate && npm run build"
  }
}
```

### 问题3：API请求CORS错误
**错误信息**：`CORS policy: No 'Access-Control-Allow-Origin' header`

**解决方法**：
在后端添加正确的CORS配置：
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

### 问题4：环境变量未加载
**解决方法**：
1. 检查Vercel Dashboard中的环境变量设置
2. 确保选择了正确的环境（Production/Preview/Development）
3. 重新部署项目

### 问题5：文件上传失败
**原因**：Vercel Serverless函数有50MB请求体限制

**解决方法**：
1. 使用云存储服务（AWS S3、Cloudinary等）
2. 或使用其他支持大文件的后端平台

### 问题6：PDF生成失败
**原因**：Puppeteer在Serverless环境中需要特殊配置

**解决方法**：
使用 `@sparticuz/chromium` 和 `puppeteer-core`：

```bash
npm install @sparticuz/chromium puppeteer-core
```

```typescript
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});
```

---

## 📊 性能优化建议

### 1. 启用CDN缓存
```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2. 优化图片
- 使用Vercel Image Optimization
- 或使用 Cloudinary/ImageKit

### 3. 代码分割
- Vite自动进行代码分割
- 使用动态import：
```typescript
const Component = lazy(() => import('./Component'));
```

### 4. 数据库连接池
```typescript
// prisma.config.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## 🔒 安全建议

### 1. 环境变量安全
- ✅ 永远不要提交 `.env` 到Git
- ✅ 使用强密码和随机JWT密钥
- ✅ 生产环境使用不同的密钥

### 2. 数据库安全
- ✅ 启用SSL连接
- ✅ 限制数据库访问IP
- ✅ 定期备份数据

### 3. API安全
- ✅ 启用HTTPS（Vercel自动提供）
- ✅ 实施速率限制
- ✅ 验证所有输入数据

### 4. CORS配置
```typescript
// 生产环境只允许特定域名
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-app.vercel.app']
    : '*'
}));
```

---

## 📈 监控和日志

### 1. Vercel Analytics
```typescript
// 在 main.tsx 中添加
import { Analytics } from '@vercel/analytics/react';

<App />
<Analytics />
```

### 2. 错误追踪
推荐使用：
- [Sentry](https://sentry.io)
- [LogRocket](https://logrocket.com)
- [Datadog](https://www.datadoghq.com)

### 3. 性能监控
```typescript
// Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

---

## 🎯 推荐的最佳部署方案

根据项目特点，推荐使用以下组合：

### 方案A：全Vercel生态（最简单）
```
前端：Vercel
后端：Vercel Serverless Functions（需重构）
数据库：Vercel Postgres
存储：Vercel Blob
```

**优点**：
- ✅ 一站式管理
- ✅ 自动HTTPS
- ✅ 全球CDN
- ✅ 零配置部署

**缺点**：
- ❌ 需要重构后端代码
- ❌ Serverless限制（执行时间、内存）

### 方案B：混合部署（最推荐）
```
前端：Vercel
后端：Railway/Render
数据库：Supabase/Neon
```

**优点**：
- ✅ 无需重构代码
- ✅ 后端无限制
- ✅ 前端速度快
- ✅ 成本较低

**缺点**：
- ❌ 需要管理多个平台
- ❌ 需要配置CORS

### 方案C：全部Railway（最简单的全栈方案）
```
前端：Railway
后端：Railway
数据库：Railway PostgreSQL
```

**优点**：
- ✅ 一个平台管理
- ✅ 无需代码修改
- ✅ 包含数据库

**缺点**：
- ❌ CDN不如Vercel
- ❌ 免费额度较少

---

## 📞 获取帮助

### 官方文档
- [Vercel文档](https://vercel.com/docs)
- [Prisma文档](https://www.prisma.io/docs)
- [Railway文档](https://docs.railway.app)

### 社区支持
- [Vercel Discord](https://vercel.com/discord)
- [Prisma Slack](https://slack.prisma.io)

---

## ✨ 下一步

部署成功后，你可以：

1. **配置自定义域名**
   - 在Vercel Dashboard → Settings → Domains
   - 添加你的域名并配置DNS

2. **设置自动部署**
   - 每次推送到GitHub main分支自动部署
   - 创建预览环境用于测试

3. **配置环境**
   - Production：生产环境
   - Preview：预览环境（PR自动创建）
   - Development：本地开发

4. **优化性能**
   - 启用Edge Functions
   - 配置ISR（增量静态再生成）
   - 使用Vercel Analytics监控

5. **添加CI/CD**
   - GitHub Actions自动测试
   - 部署前运行Lint和测试

---

**祝部署顺利！🎉**

如有问题，请查看[常见问题](#-常见问题排查)或联系技术支持。

