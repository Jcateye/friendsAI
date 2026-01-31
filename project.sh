#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

LOG_FILE="$ROOT_DIR/project.log"
PID_FILE="$ROOT_DIR/project.pid"

if [[ -f "$ROOT_DIR/yarn.lock" ]]; then
  PKG_MANAGER="yarn"
else
  PKG_MANAGER="npm"
fi

print_usage() {
  cat <<'EOF'
用法:
  ./project.sh start    启动 H5 开发服务 (后台)
  ./project.sh stop     停止服务
  ./project.sh restart  重启服务
  ./project.sh build    构建 H5
  ./project.sh logs     查看日志
EOF
}

is_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

start() {
  if is_running; then
    echo "服务已在运行 (PID: $(cat "$PID_FILE"))"
    return 0
  fi

  echo "启动 H5 开发服务..."
  nohup $PKG_MANAGER run dev:h5 > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  echo "已启动，PID: $(cat "$PID_FILE")"
  echo "日志文件: $LOG_FILE"
}

stop() {
  if is_running; then
    local pid
    pid="$(cat "$PID_FILE")"
    echo "停止服务 (PID: $pid)..."
    kill "$pid" || true
    rm -f "$PID_FILE"
    echo "已停止"
  else
    echo "服务未运行"
  fi
}

restart() {
  stop
  start
}

build() {
  echo "开始构建 H5..."
  $PKG_MANAGER run build:h5
  echo "构建完成"
}

logs() {
  if [[ -f "$LOG_FILE" ]]; then
    tail -f "$LOG_FILE"
  else
    echo "未找到日志文件: $LOG_FILE"
  fi
}

case "${1:-}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    restart
    ;;
  build)
    build
    ;;
  logs)
    logs
    ;;
  *)
    print_usage
    exit 1
    ;;
esac
