# 🚀 快速启动指南

## 前置要求
- Node.js 18+
- Docker Desktop（用于PostgreSQL）

---

## 方式A: 使用Docker（推荐）

### 1. 复制环境变量文件
```bash
cp .env.example .env
```

### 2. 启动PostgreSQL
```bash
docker-compose up -d
```

### 3. 初始化数据库
```bash
npm run setup
```
这将：
- 生成 Prisma Client
- 运行数据库迁移
- 填充示例数据

### 4. 启动服务

**终端1 - 后端服务器**
```bash
npm run backend
```

**终端2 - 前端开发服务器**
```bash
npm run dev
```

### 5. 测试登录
- 打开浏览器访问 `http://localhost:5173`
- 登录凭据：
  - Email: `admin@example.com`
  - Password: `password123`

---

## 方式B: 使用云端数据库（无需Docker）

### 1. 注册免费PostgreSQL
推荐服务：
- [Supabase](https://supabase.com) - 免费500MB
- [Railway](https://railway.app) - 免费500MB
- [Neon](https://neon.tech) - 免费500MB

### 2. 修改 .env
```bash
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

### 3. 初始化数据库
```bash
npm run setup
```

### 4. 启动服务（同方式A步骤4-5）

---

## 常用命令

```bash
# 前端开发
npm run dev

# 后端开发
npm run backend

# 查看数据库
npm run prisma:studio

# 重置数据库
npm run prisma:migrate reset

# 仅填充数据
npm run prisma:seed
```

---

## API测试

### 登录
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### 获取飞行记录（需要token）
```bash
curl http://localhost:3000/api/flight-logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 故障排除

### Docker未运行
```bash
# 检查Docker状态
docker ps

# 重启PostgreSQL
docker-compose restart
```

### 端口被占用
```bash
# 修改端口（.env文件）
PORT=3001
```

### 数据库连接失败
```bash
# 检查连接字符串
echo $DATABASE_URL

# 测试连接
npx prisma db pull
```

---

## 下一步

查看完整文档：
- `docs/README.md` - 项目概览
- `docs/開発要件定義書.md` - 系统需求
- `README-Backend.md` - 后端API详情

