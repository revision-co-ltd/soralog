# 后端快速启动指南

## 1. 创建 .env 文件
```bash
DATABASE_URL="postgresql://drone_log_user:drone_log_pass_2025@localhost:5432/drone_log_db?schema=public"
JWT_SECRET="your-secret-key-change-this"
PORT=3000
```

## 2. 启动 PostgreSQL（需要先安装 Docker）
```bash
docker-compose up -d
```

## 3. 运行数据库迁移
```bash
npm run prisma:migrate
```

## 4. 启动后端服务器
```bash
npm run backend
```

服务器将运行在 http://localhost:3000

## API 端点

### 认证
- POST /api/auth/login
- POST /api/auth/register

### 飞行记录（样式1）
- GET /api/flight-logs
- POST /api/flight-logs
- GET /api/flight-logs/:id
- PUT /api/flight-logs/:id
- DELETE /api/flight-logs/:id

### 日常点检（样式2）
- GET /api/daily-inspections
- POST /api/daily-inspections
- GET /api/daily-inspections/:id

### 机体管理
- GET /api/drones
- POST /api/drones

### 用户管理
- GET /api/users

### 场所管理
- GET /api/locations
- POST /api/locations

## 注意事项

如果没有 Docker，可以：
1. 安装 Docker Desktop
2. 或使用云端 PostgreSQL（如 Supabase、Railway）

