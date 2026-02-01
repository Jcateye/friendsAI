#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

SERVER_LOG="$LOG_DIR/mvp-server.log"
WORKER_LOG="$LOG_DIR/mvp-worker.log"
CLIENT_LOG="$LOG_DIR/mvp-client.log"

SERVER_PID_FILE="$ROOT_DIR/.mvp-server.pid"
WORKER_PID_FILE="$ROOT_DIR/.mvp-worker.pid"
CLIENT_PID_FILE="$ROOT_DIR/.mvp-client.pid"

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
  else
    echo "⚠️  未找到 packages/server/.env，使用默认本地配置（你可以复制 .env.example 后再改）。"
  fi

  export DATABASE_URL="${DATABASE_URL:-postgres://friendsai:friendsai@localhost:5432/friendsai}"
  export JWT_SECRET="${JWT_SECRET:-dev-smoke-secret}"
  export PORT="${PORT:-3000}"
}

is_running() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
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

migrate_db() {
  echo "🧱 运行数据库迁移..."
  $PKG_MANAGER run server:migrate
}

start_server() {
  if is_running "$SERVER_PID_FILE"; then
    echo "🟢 后端已运行 (PID: $(cat "$SERVER_PID_FILE"))"
    return 0
  fi
  echo "🚀 启动后端 (dev)..."
  nohup $PKG_MANAGER run server:dev > "$SERVER_LOG" 2>&1 &
  echo $! > "$SERVER_PID_FILE"
  echo "✅ 后端已启动，PID: $(cat "$SERVER_PID_FILE")"
}

start_worker() {
  if is_running "$WORKER_PID_FILE"; then
    echo "🟢 Worker 已运行 (PID: $(cat "$WORKER_PID_FILE"))"
    return 0
  fi
  echo "🧰 启动 Worker (dev)..."
  nohup $PKG_MANAGER run -w @friends-ai/server worker > "$WORKER_LOG" 2>&1 &
  echo $! > "$WORKER_PID_FILE"
  echo "✅ Worker 已启动，PID: $(cat "$WORKER_PID_FILE")"
}

start_client() {
  if is_running "$CLIENT_PID_FILE"; then
    echo "🟢 前端已运行 (PID: $(cat "$CLIENT_PID_FILE"))"
    return 0
  fi
  echo "🌐 启动前端 H5 (dev)..."
  nohup $PKG_MANAGER run client:dev > "$CLIENT_LOG" 2>&1 &
  echo $! > "$CLIENT_PID_FILE"
  echo "✅ 前端已启动，PID: $(cat "$CLIENT_PID_FILE")"
}

stop_pid() {
  local pid_file="$1"
  local name="$2"
  if is_running "$pid_file"; then
    local pid
    pid="$(cat "$pid_file")"
    echo "⏹️  停止 $name (PID: $pid)..."
    kill "$pid" 2>/dev/null || true
    sleep 1
    pkill -P "$pid" 2>/dev/null || true
    rm -f "$pid_file"
  else
    echo "⚪ $name 未运行"
  fi
}

status() {
  echo "📊 MVP 服务状态:"
  if is_running "$SERVER_PID_FILE"; then
    echo "  🟢 API: 运行中 (PID: $(cat "$SERVER_PID_FILE"))"
  else
    echo "  ⚪ API: 未运行"
  fi
  if is_running "$WORKER_PID_FILE"; then
    echo "  🟢 Worker: 运行中 (PID: $(cat "$WORKER_PID_FILE"))"
  else
    echo "  ⚪ Worker: 未运行"
  fi
  if is_running "$CLIENT_PID_FILE"; then
    echo "  🟢 Web: 运行中 (PID: $(cat "$CLIENT_PID_FILE"))"
  else
    echo "  ⚪ Web: 未运行"
  fi
}

logs() {
  local target="${1:-server}"
  case "$target" in
    server) tail -f "$SERVER_LOG" ;;
    worker) tail -f "$WORKER_LOG" ;;
    client) tail -f "$CLIENT_LOG" ;;
    *) echo "可选: server|worker|client"; exit 1 ;;
  esac
}

print_usage() {
  cat <<'EOF'
MVP 一键脚本

用法:
  ./scripts/mvp.sh start
  ./scripts/mvp.sh stop
  ./scripts/mvp.sh status
  ./scripts/mvp.sh logs [server|worker|client]

说明:
- start: 启动 DB → 迁移 → API → Worker → 前端
- stop: 停止 API/Worker/前端（不关闭 DB）
EOF
}

case "${1:-}" in
  start)
    load_env
    start_db
    migrate_db
    start_server
    start_worker
    start_client
    echo "✅ MVP 已启动。Web 页面请看前端日志或终端输出。"
    ;;
  stop)
    stop_pid "$CLIENT_PID_FILE" "前端"
    stop_pid "$WORKER_PID_FILE" "Worker"
    stop_pid "$SERVER_PID_FILE" "后端"
    ;;
  status)
    status
    ;;
  logs)
    logs "${2:-server}"
    ;;
  *)
    print_usage
    exit 1
    ;;
esac

