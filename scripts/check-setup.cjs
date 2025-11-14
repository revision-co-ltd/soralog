#!/usr/bin/env node

const fs = require('fs');
const { exec } = require('child_process');

console.log('🔍 环境检查...\n');

// 检查 .env 文件
if (!fs.existsSync('.env')) {
  console.log('⚠️  .env 文件不存在');
  console.log('   执行: cp .env.example .env');
  console.log('   然后编辑 .env 文件配置数据库连接\n');
} else {
  console.log('✅ .env 文件存在\n');
}

// 检查 Docker
exec('docker --version', (error) => {
  if (error) {
    console.log('⚠️  Docker 未安装');
    console.log('   选项1: 安装 Docker Desktop (https://docker.com)');
    console.log('   选项2: 使用云端数据库 (Supabase/Railway/Neon)\n');
  } else {
    console.log('✅ Docker 已安装\n');
    
    // 检查 PostgreSQL 容器
    exec('docker ps | grep drone-log-db', (err, stdout) => {
      if (err || !stdout) {
        console.log('⚠️  PostgreSQL 容器未运行');
        console.log('   执行: docker-compose up -d\n');
      } else {
        console.log('✅ PostgreSQL 容器运行中\n');
      }
    });
  }
});

// 检查 node_modules
if (!fs.existsSync('node_modules')) {
  console.log('⚠️  依赖未安装');
  console.log('   执行: npm install\n');
} else {
  console.log('✅ 依赖已安装\n');
}

// 检查 Prisma Client
if (!fs.existsSync('node_modules/.prisma')) {
  console.log('⚠️  Prisma Client 未生成');
  console.log('   执行: npm run prisma:generate\n');
} else {
  console.log('✅ Prisma Client 已生成\n');
}

console.log('\n📋 后续步骤:');
console.log('1. 确保数据库运行 (docker-compose up -d)');
console.log('2. 运行迁移 (npm run prisma:migrate)');
console.log('3. 填充数据 (npm run prisma:seed)');
console.log('4. 启动后端 (npm run backend)');
console.log('5. 启动前端 (npm run dev)\n');

