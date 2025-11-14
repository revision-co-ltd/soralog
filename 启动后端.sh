#!/bin/bash
# ソラログ (SoraLog) 後端起動スクリプト

echo "🚀 後端サーバーを起動します..."
echo "📍 ディレクトリ: $(pwd)"
echo ""

# 端口検査
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  ポート 3000 は既に使用されています"
    echo "既存のプロセスを停止しますか? (y/n)"
    read -t 5 answer || answer="y"
    if [ "$answer" = "y" ]; then
        echo "🛑 既存のプロセスを停止中..."
        lsof -ti:3000 | xargs kill -9 2>/dev/null
        sleep 2
    fi
fi

# 环境检查
if [ ! -f ".env" ]; then
    echo "❌ .env ファイルが見つかりません"
    exit 1
fi

# Prisma Client 检查
if [ ! -d "node_modules/@prisma/client" ]; then
    echo "⚠️  Prisma Client が見つかりません"
    echo "📦 生成中..."
    npm run prisma:generate
fi

# 启动后端
echo ""
echo "✅ 後端サーバーを起動します"
echo "📡 http://localhost:3000"
echo "📋 API: http://localhost:3000/api"
echo ""
echo "停止するには Ctrl+C を押してください"
echo "=========================================="
echo ""

PORT=3000 npx tsx backend/src/index.ts

