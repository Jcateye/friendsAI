#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# 配置
CLIENT_DIR="$ROOT_DIR/packages/client"
SERVER_DIR="$ROOT_DIR/packages/server-nestjs"
CLIENT_PORT=${CLIENT_PORT:-10087}
SERVER_PORT=${SERVER_PORT:-4001}

# 日志目录
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

# 日志和 PID 文件
CLIENT_LOG="$LOG_DIR/client.log"
SERVER_LOG="$LOG_DIR/server.log"
CLIENT_PID_FILE="$ROOT_DIR/.client.pid"
SERVER_PID_FILE="$ROOT_DIR/.server.pid"

if [[ -f "$ROOT_DIR/yarn.lock" ]]; then
  PKG_MANAGER="yarn"
elif [[ -f "$ROOT_DIR/pnpm-lock.yaml" ]]; then
  PKG_MANAGER="pnpm"
else
  PKG_MANAGER="npm"
fi

print_usage() {
  cat <<'EOF'
FriendsAI 项目管理脚本

用法:
  ./project.sh <命令> [服务]

命令:
  start [client|server|all]   启动服务 (默认 all)
  stop [client|server|all]    停止服务 (默认 all)
  restart [client|server|all] 重启服务 (默认 all)
  build [client|server|all]   构建项目 (默认 all)
  logs [client|server]        查看日志 (默认 client)
  status                      查看服务状态
  clean-logs                  清理日志文件
  install                     安装依赖
  clean                       清理构建和缓存

端口:
  前端: 10087
  后端: 4001

示例:
  ./project.sh start           # 启动前后端
  ./project.sh start client    # 仅启动前端
  ./project.sh stop server     # 停止后端
  ./project.sh logs server     # 查看后端日志
  ./project.sh build client    # 构建前端
EOF
}

is_port_in_use() {
  local port=$1
  lsof -i ":$port" >/dev/null 2>&1
}

is_client_running() {
  if [[ -f "$CLIENT_PID_FILE" ]]; then
    local pid
    pid="$(cat "$CLIENT_PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

is_server_running() {
  if [[ -f "$SERVER_PID_FILE" ]]; then
    local pid
    pid="$(cat "$SERVER_PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

kill_port() {
  local port=$1
  local service_name=$2
  if is_port_in_use "$port"; then
    echo "⚠️  端口 $port 已被占用，正在终止..."
    lsof -ti ":$port" | xargs kill -9 2>/dev/null || true
    sleep 1
    echo "✅ 已释放端口 $port"
  fi
}

start_client() {
  if is_client_running; then
    echo "🟢 前端服务已在运行 (PID: $(cat "$CLIENT_PID_FILE"))"
    return 0
  fi

  kill_port "$CLIENT_PORT" "前端"

  echo "🚀 启动前端开发服务 (端口: $CLIENT_PORT)..."
  cd "$CLIENT_DIR"

  # 确保 client 依赖已安装
  if [[ ! -d "node_modules" ]]; then
    echo "📦 安装前端依赖..."
    $PKG_MANAGER install
  fi

  PORT=$CLIENT_PORT nohup npx next dev > "$CLIENT_LOG" 2>&1 &
  echo $! > "$CLIENT_PID_FILE"
  cd "$ROOT_DIR"

  echo "✅ 前端已启动，PID: $(cat "$CLIENT_PID_FILE")"
  echo "   访问地址: http://localhost:$CLIENT_PORT"
  echo "   日志文件: $CLIENT_LOG"
}

start_server() {
  if is_server_running; then
    echo "🟢 后端服务已在运行 (PID: $(cat "$SERVER_PID_FILE"))"
    return 0
  fi

  kill_port "$SERVER_PORT" "后端"

  echo "🚀 启动后端开发服务 (端口: $SERVER_PORT)..."
  cd "$ROOT_DIR"

  # 确保 server 依赖已安装
  if [[ ! -d "$SERVER_DIR/node_modules" ]]; then
    echo "📦 安装后端依赖..."
    $PKG_MANAGER install
  fi

  nohup $PKG_MANAGER run server:dev > "$SERVER_LOG" 2>&1 &
  echo $! > "$SERVER_PID_FILE"

  echo "✅ 后端已启动，PID: $(cat "$SERVER_PID_FILE")"
  echo "   API 地址: http://localhost:$SERVER_PORT"
  echo "   日志文件: $SERVER_LOG"
}

stop_client() {
  if is_client_running; then
    local pid
    pid="$(cat "$CLIENT_PID_FILE")"
    echo "⏹️  停止前端服务 (PID: $pid)..."
    kill "$pid" 2>/dev/null || true
    sleep 1
    pkill -P "$pid" 2>/dev/null || true
    rm -f "$CLIENT_PID_FILE"
    echo "✅ 前端已停止"
  else
    echo "⚪ 前端服务未运行"
    # 清理可能残留的端口占用
    kill_port "$CLIENT_PORT" "前端"
  fi
}

stop_server() {
  if is_server_running; then
    local pid
    pid="$(cat "$SERVER_PID_FILE")"
    echo "⏹️  停止后端服务 (PID: $pid)..."
    kill "$pid" 2>/dev/null || true
    sleep 1
    pkill -P "$pid" 2>/dev/null || true
    rm -f "$SERVER_PID_FILE"
    echo "✅ 后端已停止"
  else
    echo "⚪ 后端服务未运行"
    # 清理可能残留的端口占用
    kill_port "$SERVER_PORT" "后端"
  fi
}

start() {
  local target="${1:-all}"
  case "$target" in
    client)
      start_client
      ;;
    server)
      start_server
      ;;
    all)
      start_server
      sleep 2
      start_client
      ;;
    *)
      echo "❌ 未知服务: $target"
      exit 1
      ;;
  esac
}

stop() {
  local target="${1:-all}"
  case "$target" in
    client)
      stop_client
      ;;
    server)
      stop_server
      ;;
    all)
      stop_client
      stop_server
      ;;
    *)
      echo "❌ 未知服务: $target"
      exit 1
      ;;
  esac
}

restart() {
  local target="${1:-all}"
  stop "$target"
  sleep 2
  start "$target"
}

build() {
  local target="${1:-all}"
  case "$target" in
    client)
      echo "📦 构建前端..."
      cd "$CLIENT_DIR"
      $PKG_MANAGER run build
      echo "✅ 前端构建完成"
      ;;
    server)
      echo "📦 构建后端..."
      cd "$ROOT_DIR"
      $PKG_MANAGER run server:build
      echo "✅ 后端构建完成"
      ;;
    all)
      echo "📦 构建前后端..."
      cd "$ROOT_DIR"
      $PKG_MANAGER run build
      echo "✅ 构建完成"
      ;;
    *)
      echo "❌ 未知目标: $target"
      exit 1
      ;;
  esac
}

install_deps() {
  echo "📦 安装项目依赖..."
  cd "$ROOT_DIR"
  $PKG_MANAGER install
  echo "✅ 依赖安装完成"
}

clean() {
  echo "🧹 清理构建和缓存..."
  cd "$ROOT_DIR"

  # 清理 client
  rm -rf "$CLIENT_DIR/.next"
  rm -rf "$CLIENT_DIR/node_modules"

  # 清理 server
  rm -rf "$SERVER_DIR/dist"
  rm -rf "$SERVER_DIR/node_modules"

  # 清理根目录
  rm -rf node_modules

  echo "✅ 清理完成"
  echo "💡 运行 './project.sh install' 重新安装依赖"
}

logs() {
  local target="${1:-client}"
  case "$target" in
    client)
      if [[ -f "$CLIENT_LOG" ]]; then
        echo "📋 前端日志 ($CLIENT_LOG):"
        echo "---"
        tail -f "$CLIENT_LOG"
      else
        echo "⚠️  未找到前端日志文件: $CLIENT_LOG"
      fi
      ;;
    server)
      if [[ -f "$SERVER_LOG" ]]; then
        echo "📋 后端日志 ($SERVER_LOG):"
        echo "---"
        tail -f "$SERVER_LOG"
      else
        echo "⚠️  未找到后端日志文件: $SERVER_LOG"
      fi
      ;;
    *)
      echo "❌ 未知服务: $target (可选: client, server)"
      exit 1
      ;;
  esac
}

status() {
  echo "📊 FriendsAI 服务状态"
  echo "════════════════════════"
  echo ""

  if is_client_running; then
    local pid=$(cat "$CLIENT_PID_FILE")
    echo "  🟢 前端: 运行中 (PID: $pid)"
    echo "     地址: http://localhost:$CLIENT_PORT"
    if is_port_in_use "$CLIENT_PORT"; then
      echo "     端口: ✅ 正常"
    else
      echo "     端口: ⚠️  异常"
    fi
  else
    echo "  ⚪ 前端: 未运行"
    if is_port_in_use "$CLIENT_PORT"; then
      echo "     ⚠️  端口 $CLIENT_PORT 被其他进程占用"
    fi
  fi
  echo ""

  if is_server_running; then
    local pid=$(cat "$SERVER_PID_FILE")
    echo "  🟢 后端: 运行中 (PID: $pid)"
    echo "     地址: http://localhost:$SERVER_PORT"
    if is_port_in_use "$SERVER_PORT"; then
      echo "     端口: ✅ 正常"
    else
      echo "     端口: ⚠️  异常"
    fi
  else
    echo "  ⚪ 后端: 未运行"
    if is_port_in_use "$SERVER_PORT"; then
      echo "     ⚠️  端口 $SERVER_PORT 被其他进程占用"
    fi
  fi
  echo ""
}

clean_logs() {
  echo "🧹 清理日志文件..."
  rm -f "$LOG_DIR"/*.log
  echo "✅ 日志已清理"
}

case "${1:-}" in
  start)
    start "${2:-all}"
    ;;
  stop)
    stop "${2:-all}"
    ;;
  restart)
    restart "${2:-all}"
    ;;
  build)
    build "${2:-all}"
    ;;
  logs)
    logs "${2:-client}"
    ;;
  status)
    status
    ;;
  install)
    install_deps
    ;;
  clean)
    clean
    ;;
  clean-logs)
    clean_logs
    ;;
  *)
    print_usage
    exit 1
    ;;
esac
