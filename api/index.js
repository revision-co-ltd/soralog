/**
 * Vercel Serverless API Handler
 * 将Express应用转换为Serverless函数
 */

// 注意：这是从TypeScript转译的版本
// 在实际部署前需要构建TypeScript代码

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// 中间件
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 导入路由（需要从TypeScript编译后的JS文件导入）
// 注意：在实际部署中，这些文件需要先被编译
try {
  const authRoutes = require('../backend/dist/routes/auth.routes').default;
  const flightLogRoutes = require('../backend/dist/routes/flight-log.routes').default;
  const dailyInspectionRoutes = require('../backend/dist/routes/daily-inspection.routes').default;
  const maintenanceRecordRoutes = require('../backend/dist/routes/maintenance-record.routes').default;
  const droneRoutes = require('../backend/dist/routes/drone.routes').default;
  const userRoutes = require('../backend/dist/routes/user.routes').default;
  const locationRoutes = require('../backend/dist/routes/location.routes').default;
  const exportRoutes = require('../backend/dist/routes/export.routes').default;

  app.use('/api/auth', authRoutes);
  app.use('/api/flight-logs', flightLogRoutes);
  app.use('/api/daily-inspections', dailyInspectionRoutes);
  app.use('/api/maintenance-records', maintenanceRecordRoutes);
  app.use('/api/drones', droneRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/export', exportRoutes);
} catch (error) {
  console.error('路由加载失败:', error);
  
  // 提供基本的API响应
  app.use('/api/*', (req, res) => {
    res.status(503).json({
      error: '服务暂时不可用',
      message: '后端路由正在初始化，请稍后再试'
    });
  });
}

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后再试'
  });
});

// 导出为Serverless函数
module.exports = app;

