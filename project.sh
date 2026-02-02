#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# 日志目录
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

# 日志和 PID 文件
CLIENT_LOG="$LOG_DIR/client.log"
SERVER_LOG="$LOG_DIR/server.log"
CLIENT_PID_FILE="$ROOT_DIR/.client.pid"
SERVER_PID_FILE="$ROOT_DIR/.server.pid"
WORKER_PID_FILE="$ROOT_DIR/.worker.pid"
DB_PID_FILE="$ROOT_DIR/.db.pid"
WORKER_LOG="$LOG_DIR/worker.log"

if [[ -f "$ROOT_DIR/yarn.lock" ]]; then
  PKG_MANAGER="yarn"
else
  PKG_MANAGER="npm"
fi

load_env() {
  local env_file="$ROOT_DIR/packages/server/.env"
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$env_file"
    set +a
  fi
  export DATABASE_URL="${DATABASE_URL:-postgres://friendsai:friendsai@localhost:5432/friendsai}"
  export JWT_SECRET="${JWT_SECRET:-dev-smoke-secret}"
  export PORT="${PORT:-3000}"
}

print_usage() {
  cat <<'EOF'
FriendsAI 项目管理脚本

用法:
  ./project.sh <命令> [服务]

命令:
  start [client|server|all]   启动服务 (默认 all)
  start:mvp                   启动 MVP：DB + 迁移 + API + Worker + 前端
  stop [client|server|all]    停止服务 (默认 all)
  stop:mvp                    停止 MVP：API + Worker + 前端（不关闭 DB）
  restart [client|server|all] 重启服务 (默认 all)
  build [client|server|all]   构建项目 (默认 all)
  logs [client|server|worker] 查看日志 (默认 client)
  status                      查看服务状态
  clean-logs                  清理日志文件

示例:
  ./project.sh start           # 启动前后端
  ./project.sh start client    # 仅启动前端
  ./project.sh stop server     # 停止后端
  ./project.sh logs server     # 查看后端日志
  ./project.sh build client    # 构建前端 H5
  ./project.sh start:mvp       # 启动 MVP 全量（含 DB+迁移+worker）
EOF
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

is_worker_running() {
  if [[ -f "$WORKER_PID_FILE" ]]; then
    local pid
    pid="$(cat "$WORKER_PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

start_db() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "❌ 未检测到 docker，请先安装 Docker Desktop。"
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker 未启动，请先打开 Docker Desktop。"
    exit 1
  fi
  echo "🐘 启动 pgvector Postgres..."
  docker compose -f docker-compose.dev.yml up -d
}

run_migrate() {
  echo "🧱 运行数据库迁移..."
  $PKG_MANAGER run server:migrate
}

start_client() {
  if is_client_running; then
    echo "🟢 前端服务已在运行 (PID: $(cat "$CLIENT_PID_FILE"))"
    return 0
  fi

  echo "🚀 启动前端 H5 开发服务..."
  nohup $PKG_MANAGER run client:dev > "$CLIENT_LOG" 2>&1 &
  echo $! > "$CLIENT_PID_FILE"
  echo "✅ 前端已启动，PID: $(cat "$CLIENT_PID_FILE")"
  echo "   日志文件: $CLIENT_LOG"
  echo "   访问地址：请在日志中查看 devServer URL（常见为 http://localhost:10086）"
}

start_server() {
  if is_server_running; then
    echo "🟢 后端服务已在运行 (PID: $(cat "$SERVER_PID_FILE"))"
    return 0
  fi

  load_env
  echo "🚀 启动后端开发服务..."
  nohup $PKG_MANAGER run server:dev > "$SERVER_LOG" 2>&1 &
  echo $! > "$SERVER_PID_FILE"
  echo "✅ 后端已启动，PID: $(cat "$SERVER_PID_FILE")"
  echo "   日志文件: $SERVER_LOG"
  echo "   API 健康检查：http://localhost:${PORT:-3000}/health"
}

start_worker() {
  if is_worker_running; then
    echo "🟢 Worker 已在运行 (PID: $(cat "$WORKER_PID_FILE"))"
    return 0
  fi

  load_env
  echo "🧰 启动 Worker..."
  nohup $PKG_MANAGER run -w @friends-ai/server worker > "$WORKER_LOG" 2>&1 &
  echo $! > "$WORKER_PID_FILE"
  echo "✅ Worker 已启动，PID: $(cat "$WORKER_PID_FILE")"
  echo "   日志文件: $WORKER_LOG"
}

stop_client() {
  if is_client_running; then
    local pid
    pid="$(cat "$CLIENT_PID_FILE")"
    echo "⏹️  停止前端服务 (PID: $pid)..."
    kill "$pid" 2>/dev/null || true
    # 等待进程结束
    sleep 1
    # 强制结束子进程
    pkill -P "$pid" 2>/dev/null || true
    rm -f "$CLIENT_PID_FILE"
    echo "✅ 前端已停止"
  else
    echo "⚪ 前端服务未运行"
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
  fi
}

stop_worker() {
  if is_worker_running; then
    local pid
    pid="$(cat "$WORKER_PID_FILE")"
    echo "⏹️  停止 Worker (PID: $pid)..."
    kill "$pid" 2>/dev/null || true
    sleep 1
    pkill -P "$pid" 2>/dev/null || true
    rm -f "$WORKER_PID_FILE"
    echo "✅ Worker 已停止"
  else
    echo "⚪ Worker 未运行"
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
      start_client
      start_server
      ;;
    *)
      echo "未知服务: $target"
      exit 1
      ;;
  esac
}

start_mvp() {
  load_env
  export DEV_VERIFY_CODE="${DEV_VERIFY_CODE:-123456}"
  start_db
  run_migrate
  start_server
  start_worker
  start_client
  echo "✅ MVP 已启动"
  echo "👉 访问提示："
  echo "   前端地址：查看 $CLIENT_LOG 内输出的 devServer URL（常见 http://localhost:10086）"
  echo "   API 地址：http://localhost:${PORT:-3000}/health"
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
      echo "未知服务: $target"
      exit 1
      ;;
  esac
}

stop_mvp() {
  stop_client
  stop_worker
  stop_server
}

restart() {
  local target="${1:-all}"
  stop "$target"
  sleep 1
  start "$target"
}

build() {
  local target="${1:-all}"
  case "$target" in
    client)
      echo "📦 构建前端 H5..."
      $PKG_MANAGER run client:build
      echo "✅ 前端构建完成"
      ;;
    server)
      echo "📦 构建后端..."
      $PKG_MANAGER run server:build
      echo "✅ 后端构建完成"
      ;;
    all)
      echo "📦 构建前后端..."
      $PKG_MANAGER run build
      echo "✅ 构建完成"
      ;;
    *)
      echo "未知目标: $target"
      exit 1
      ;;
  esac
}

logs() {
  local target="${1:-client}"
  case "$target" in
    client)
      if [[ -f "$CLIENT_LOG" ]]; then
        echo "📋 前端日志 ($CLIENT_LOG):"
        tail -f "$CLIENT_LOG"
      else
        echo "未找到前端日志文件: $CLIENT_LOG"
      fi
      ;;
    server)
      if [[ -f "$SERVER_LOG" ]]; then
        echo "📋 后端日志 ($SERVER_LOG):"
        tail -f "$SERVER_LOG"
      else
        echo "未找到后端日志文件: $SERVER_LOG"
      fi
      ;;
    worker)
      if [[ -f "$WORKER_LOG" ]]; then
        echo "📋 Worker 日志 ($WORKER_LOG):"
        tail -f "$WORKER_LOG"
      else
        echo "未找到 Worker 日志文件: $WORKER_LOG"
      fi
      ;;
    *)
      echo "未知服务: $target (可选: client, server, worker)"
      exit 1
      ;;
  esac
}

status() {
  echo "📊 服务状态:"
  echo ""
  if is_client_running; then
    echo "  🟢 前端: 运行中 (PID: $(cat "$CLIENT_PID_FILE"))"
  else
    echo "  ⚪ 前端: 未运行"
  fi

  if is_server_running; then
    echo "  🟢 后端: 运行中 (PID: $(cat "$SERVER_PID_FILE"))"
  else
    echo "  ⚪ 后端: 未运行"
  fi
  if is_worker_running; then
    echo "  🟢 Worker: 运行中 (PID: $(cat "$WORKER_PID_FILE"))"
  else
    echo "  ⚪ Worker: 未运行"
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
  start:mvp)
    start_mvp
    ;;
  stop)
    stop "${2:-all}"
    ;;
  stop:mvp)
    stop_mvp
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
  clean-logs)
    clean_logs
    ;;
  *)
    print_usage
    exit 1
    ;;
esac
