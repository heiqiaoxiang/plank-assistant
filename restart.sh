#!/bin/bash

PORT=23366

echo "🔍 检查端口 $PORT 是否被占用..."
PID=$(lsof -ti:$PORT 2>/dev/null)

if [ -n "$PID" ]; then
  echo "🛑 停止现有进程 (PID: $PID)..."
  kill $PID 2>/dev/null
  sleep 1
else
  echo "✅ 端口 $PORT 空闲"
fi

echo "📦 安装依赖..."
npm install 2>/dev/null || true

echo "🚀 启动 Vite 开发服务器 http://localhost:$PORT"
cd "$(dirname "$0")"
npx vite --port $PORT --host
