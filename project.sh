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

# 端口配置
CLIENT_PORT=10001
SERVER_PORT=3000

if [[ -f "$ROOT_DIR/bun.lock" ]] || [[ -f "$ROOT_DIR/bun.lockb" ]]; then
  PKG_MANAGER="bun"
elif [[ -f "$ROOT_DIR/yarn.lock" ]]; then
  PKG_MANAGER="yarn"
else
  PKG_MANAGER="bun"
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
  status                      查看服务状态 (含健康检查)
  clean-logs                  清理日志文件

示例:
  ./project.sh start           # 启动前后端
  ./project.sh start client    # 仅启动前端
  ./project.sh stop server     # 停止后端
  ./project.sh logs server     # 查看后端日志
  ./project.sh build client    # 构建前端 H5
EOF
}

# 检查端口是否被占用
is_port_in_use() {
  local port="$1"
  lsof -i ":$port" >/dev/null 2>&1
}

# 杀掉占用端口的进程
kill_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti ":$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "   清理端口 $port 上的进程..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
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

# 检查服务健康状态
check_client_health() {
  if [[ -f "$CLIENT_LOG" ]]; then
    if grep -q "Compiled successfully\|编译成功" "$CLIENT_LOG" 2>/dev/null; then
      return 0
    fi
    if grep -q "ERROR\|error:" "$CLIENT_LOG" 2>/dev/null; then
      return 2  # 有错误
    fi
  fi
  return 1  # 还在启动中
}

check_server_health() {
  # 检查端口是否在监听
  if is_port_in_use "$SERVER_PORT"; then
    # 进一步检查是否是我们的服务
    if curl -s "http://localhost:$SERVER_PORT/api" >/dev/null 2>&1; then
      return 0
    fi
  fi
  if [[ -f "$SERVER_LOG" ]]; then
    if grep -q "Nest application successfully started\|Application is running" "$SERVER_LOG" 2>/dev/null; then
      return 0
    fi
    if grep -q "EADDRINUSE\|Error:\|error:" "$SERVER_LOG" 2>/dev/null; then
      return 2  # 有错误
    fi
  fi
  return 1  # 还在启动中
}

# 获取日志中的最后一个错误
get_last_error() {
  local log_file="$1"
  if [[ -f "$log_file" ]]; then
    grep -E "Error:|error:|ERROR|EADDRINUSE" "$log_file" 2>/dev/null | tail -3
  fi
}

start_client() {
  if is_client_running; then
    echo "🟢 前端服务已在运行 (PID: $(cat "$CLIENT_PID_FILE"))"
    return 0
  fi

  # 清理可能占用的端口
  if is_port_in_use "$CLIENT_PORT"; then
    kill_port "$CLIENT_PORT"
  fi

  echo "🚀 启动前端 H5 开发服务..."
  > "$CLIENT_LOG"  # 清空日志
  nohup $PKG_MANAGER run client:dev > "$CLIENT_LOG" 2>&1 &
  echo $! > "$CLIENT_PID_FILE"

  # 等待启动并检查状态
  echo "   等待编译..."
  local max_wait=60
  local waited=0
  while [[ $waited -lt $max_wait ]]; do
    sleep 2
    waited=$((waited + 2))

    local health_status
    check_client_health
    health_status=$?

    if [[ $health_status -eq 0 ]]; then
      echo "✅ 前端启动成功"
      echo "   PID: $(cat "$CLIENT_PID_FILE")"
      echo "   访问: http://localhost:$CLIENT_PORT"
      return 0
    elif [[ $health_status -eq 2 ]]; then
      echo "❌ 前端启动失败"
      echo "   错误信息:"
      get_last_error "$CLIENT_LOG" | sed 's/^/   /'
      echo "   查看完整日志: ./project.sh logs client"
      return 1
    fi

    # 显示进度
    printf "\r   编译中... (%ds)" "$waited"
  done

  echo ""
  echo "⚠️  前端启动超时，请检查日志"
  echo "   ./project.sh logs client"
}

start_server() {
  if is_server_running; then
    echo "🟢 后端服务已在运行 (PID: $(cat "$SERVER_PID_FILE"))"
    return 0
  fi

  # 清理可能占用的端口
  if is_port_in_use "$SERVER_PORT"; then
    echo "   端口 $SERVER_PORT 被占用，正在清理..."
    kill_port "$SERVER_PORT"
  fi

  echo "🚀 启动后端开发服务 (NestJS)..."
  > "$SERVER_LOG"  # 清空日志
  cd "$ROOT_DIR/packages/server-nestjs"
  nohup $PKG_MANAGER run start:dev > "$SERVER_LOG" 2>&1 &
  cd "$ROOT_DIR"
  echo $! > "$SERVER_PID_FILE"

  # 等待启动并检查状态
  echo "   等待启动..."
  local max_wait=30
  local waited=0
  while [[ $waited -lt $max_wait ]]; do
    sleep 2
    waited=$((waited + 2))

    local health_status
    check_server_health
    health_status=$?

    if [[ $health_status -eq 0 ]]; then
      echo "✅ 后端启动成功"
      echo "   PID: $(cat "$SERVER_PID_FILE")"
      echo "   API: http://localhost:$SERVER_PORT/api"
      return 0
    elif [[ $health_status -eq 2 ]]; then
      echo "❌ 后端启动失败"
      echo "   错误信息:"
      get_last_error "$SERVER_LOG" | sed 's/^/   /'
      echo "   查看完整日志: ./project.sh logs server"
      return 1
    fi

    printf "\r   启动中... (%ds)" "$waited"
  done

  echo ""
  echo "⚠️  后端启动超时，请检查日志"
  echo "   ./project.sh logs server"
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
  fi
  # 确保端口被释放
  if is_port_in_use "$CLIENT_PORT"; then
    kill_port "$CLIENT_PORT"
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
  # 确保端口被释放
  if is_port_in_use "$SERVER_PORT"; then
    kill_port "$SERVER_PORT"
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
      echo ""
      start_server
      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      status
      ;;
    *)
      echo "未知服务: $target"
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
      echo "未知服务: $target"
      exit 1
      ;;
  esac
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
      echo "📦 构建后端 (NestJS)..."
      cd "$ROOT_DIR/packages/server-nestjs"
      $PKG_MANAGER run build
      cd "$ROOT_DIR"
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
    *)
      echo "未知服务: $target (可选: client, server)"
      exit 1
      ;;
  esac
}

status() {
  echo "📊 服务状态:"
  echo ""

  # 前端状态
  if is_client_running; then
    local client_health
    check_client_health
    client_health=$?
    if [[ $client_health -eq 0 ]]; then
      echo "  🟢 前端: 运行中 (PID: $(cat "$CLIENT_PID_FILE")) - 健康"
      echo "     访问: http://localhost:$CLIENT_PORT"
    elif [[ $client_health -eq 2 ]]; then
      echo "  🔴 前端: 运行中但有错误 (PID: $(cat "$CLIENT_PID_FILE"))"
      get_last_error "$CLIENT_LOG" | head -1 | sed 's/^/     /'
    else
      echo "  🟡 前端: 启动中 (PID: $(cat "$CLIENT_PID_FILE"))"
    fi
  else
    echo "  ⚪ 前端: 未运行"
  fi

  # 后端状态
  if is_server_running; then
    local server_health
    check_server_health
    server_health=$?
    if [[ $server_health -eq 0 ]]; then
      echo "  🟢 后端: 运行中 (PID: $(cat "$SERVER_PID_FILE")) - 健康"
      echo "     API: http://localhost:$SERVER_PORT/api"
    elif [[ $server_health -eq 2 ]]; then
      echo "  🔴 后端: 运行中但有错误 (PID: $(cat "$SERVER_PID_FILE"))"
      get_last_error "$SERVER_LOG" | head -1 | sed 's/^/     /'
    else
      echo "  🟡 后端: 启动中 (PID: $(cat "$SERVER_PID_FILE"))"
    fi
  else
    echo "  ⚪ 后端: 未运行"
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
  clean-logs)
    clean_logs
    ;;
  *)
    print_usage
    exit 1
    ;;
esac
