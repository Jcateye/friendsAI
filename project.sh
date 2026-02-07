#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# 日志目录
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

# 日志和 PID 文件
WEB_LOG="$LOG_DIR/web.log"
SERVER_LOG="$LOG_DIR/server.log"
WEB_PID_FILE="$ROOT_DIR/.web.pid"
SERVER_PID_FILE="$ROOT_DIR/.server.pid"
DB_PID_FILE="$ROOT_DIR/.db.pid"

if [[ -f "$ROOT_DIR/bun.lockb" || -f "$ROOT_DIR/bun.lock" ]]; then
  PKG_MANAGER="bun"
elif [[ -f "$ROOT_DIR/yarn.lock" ]]; then
  PKG_MANAGER="yarn"
else
  PKG_MANAGER="npm"
fi

load_env() {
  local node_env="${NODE_ENV:-development}"
  local nest_env_file="$ROOT_DIR/packages/server-nestjs/.env.${node_env}"
  local nest_env_fallback="$ROOT_DIR/packages/server-nestjs/.env"
  local web_env_file="$ROOT_DIR/packages/web/.env.${node_env}"
  local existing_port="${PORT-}"
  local existing_web_port="${WEB_PORT-}"
  local existing_database_url="${DATABASE_URL-}"
  local existing_jwt_secret="${JWT_SECRET-}"
  local existing_openai_api_key="${OPENAI_API_KEY-}"

  if [[ -f "$nest_env_file" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$nest_env_file"
    set +a
  elif [[ -f "$nest_env_fallback" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$nest_env_fallback"
    set +a
  fi

  if [[ -f "$web_env_file" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$web_env_file"
    set +a
  fi

  if [[ -n "$existing_port" ]]; then
    export PORT="$existing_port"
  fi
  if [[ -n "$existing_web_port" ]]; then
    export WEB_PORT="$existing_web_port"
  fi
  if [[ -n "$existing_database_url" ]]; then
    export DATABASE_URL="$existing_database_url"
  fi
  if [[ -n "$existing_jwt_secret" ]]; then
    export JWT_SECRET="$existing_jwt_secret"
  fi
  if [[ -n "$existing_openai_api_key" ]]; then
    export OPENAI_API_KEY="$existing_openai_api_key"
  fi

  export DATABASE_URL="${DATABASE_URL:-postgres://friendsai:friendsai@localhost:5434/friendsai_v2}"
  export JWT_SECRET="${JWT_SECRET:-dev-smoke-secret}"
  export PORT="${PORT:-3000}"
  export WEB_PORT="${WEB_PORT:-10086}"
}

get_lan_ip() {
  local ip=""
  if command -v ipconfig >/dev/null 2>&1; then
    ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
    if [[ -z "$ip" ]]; then
      ip="$(ipconfig getifaddr en1 2>/dev/null || true)"
    fi
  elif command -v hostname >/dev/null 2>&1; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi
  echo "$ip"
}

# 检查服务是否成功启动
# 参数: $1=服务名称, $2=PID文件, $3=日志文件, $4=监听端口(可选), $5=命令行匹配(可选)
check_service_status() {
  local service_name="$1"
  local pid_file="$2"
  local log_file="$3"
  local port="${4:-}"
  local match_cmd="${5:-}"
  local max_attempts=30
  local attempt=0

  if [[ ! -f "$pid_file" ]]; then
    echo "❌ $service_name 启动失败：PID文件 ($pid_file) 未生成。"
    if [[ -f "$log_file" ]]; then
      echo "📋 最近日志:"
      tail -n 10 "$log_file"
    fi
    return 1
  fi

  local pid
  pid="$(cat "$pid_file")"

  if ! kill -0 "$pid" >/dev/null 2>&1; then
    echo "❌ $service_name 启动失败：进程 (PID: $pid) 不存在或已退出。"
    if [[ -f "$log_file" ]]; then
      echo "📋 最近日志:"
      tail -n 10 "$log_file"
    fi
    return 1
  fi

  if [[ -n "$port" ]]; then
    echo "🔍 等待 $service_name 监听端口 $port..."
    local warned_port_in_use=0
    while true; do
      local port_pids
      port_pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)
      if [[ -n "$port_pids" ]]; then
        if echo "$port_pids" | tr ' ' '\n' | grep -qx "$pid"; then
          break
        fi
        local descendant_match=0
        for port_pid in $port_pids; do
          local check_pid="$port_pid"
          while [[ -n "$check_pid" && "$check_pid" != "1" && "$check_pid" != "0" ]]; do
            local ppid
            ppid="$(ps -o ppid= -p "$check_pid" 2>/dev/null | tr -d ' ')"
            if [[ "$ppid" == "$pid" ]]; then
              descendant_match=1
              break 2
            fi
            check_pid="$ppid"
          done
        done
        if [[ $descendant_match -eq 1 ]]; then
          break
        fi
        if [[ -n "$match_cmd" ]]; then
          for port_pid in $port_pids; do
            local cmd
            cmd="$(ps -o command= -p "$port_pid" 2>/dev/null || true)"
            if [[ -n "$cmd" && "$cmd" == *"$match_cmd"* ]]; then
              echo "ℹ️ 监听进程与 PID 文件不一致，更新 PID 为 $port_pid"
              echo "$port_pid" > "$pid_file"
              break 2
            fi
          done
        fi
        if [[ $warned_port_in_use -eq 0 ]]; then
          echo "⚠️ 端口 $port 已被其他进程占用: $port_pids"
          warned_port_in_use=1
        fi
      fi
      if (( attempt >= max_attempts )); then
        echo "❌ $service_name 启动失败：端口 $port 未能在 ${max_attempts} 秒内开始监听。"
        if [[ -n "${port_pids:-}" ]]; then
          echo "   端口 $port 已被占用: $port_pids"
        fi
        if [[ -f "$log_file" ]]; then
          echo "📋 最近日志:"
          tail -n 10 "$log_file"
        fi
        return 1
      fi
      sleep 1
      attempt=$((attempt + 1))
    done
    echo "✅ $service_name 端口 $port 已监听。"
  fi

  return 0
}

print_usage() {
  cat <<'EOF'
FriendsAI 项目管理脚本

用法:
  ./project.sh <命令> [服务]

命令:
  start [web|server|all]    启动服务 (默认 all)
  start:mvp                 启动 MVP：DB + 迁移 + API + 前端
  stop [web|server|all]     停止服务 (默认 all)
  stop:mvp                  停止 MVP：API + 前端（不关闭 DB）
  restart [web|server|all]  重启服务 (默认 all)
  build [web|server|all]    构建项目 (默认 all)
  logs [web|server]         查看日志 (默认 web)
  status                    查看服务状态
  clean-logs                清理日志文件

示例:
  ./project.sh start           # 启动前后端
  ./project.sh start web       # 仅启动前端
  ./project.sh stop server     # 停止后端
  ./project.sh logs server     # 查看后端日志
  ./project.sh build web       # 构建前端
  ./project.sh start:mvp       # 启动 MVP 全量（含 DB+迁移+前后端）
EOF
}

is_web_running() {
  if [[ -f "$WEB_PID_FILE" ]]; then
    local pid
    pid="$(cat "$WEB_PID_FILE")"
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
  local port_pids
  port_pids=$(lsof -nP -iTCP:"${PORT:-3000}" -sTCP:LISTEN -t 2>/dev/null || true)
  if [[ -n "$port_pids" ]]; then
    for pid in $port_pids; do
      local cmd
      cmd="$(ps -o command= -p "$pid" 2>/dev/null || true)"
      if [[ -n "$cmd" && "$cmd" == *"$ROOT_DIR/packages/server-nestjs/"* ]]; then
        echo "$pid" > "$SERVER_PID_FILE"
        return 0
      fi
    done
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
  $PKG_MANAGER run --cwd "$ROOT_DIR/packages/server-nestjs" migrate
}

start_web_background() {
  if is_web_running; then
    echo "🟢 前端服务已在运行 (PID: $(cat "$WEB_PID_FILE"))"
    return 0
  fi

  load_env
  echo "🚀 启动前端 Vite 开发服务..."
  nohup "$PKG_MANAGER" run web:dev > "$WEB_LOG" 2>&1 &
  echo $! > "$WEB_PID_FILE"
}

verify_web() {
  if check_service_status "web" "$WEB_PID_FILE" "$WEB_LOG" "${WEB_PORT:-5173}"; then
    echo "✅ 前端已启动，PID: $(cat "$WEB_PID_FILE")"
    echo "   日志文件: $WEB_LOG"
    echo "   本机访问：http://localhost:${WEB_PORT:-5173}"
    local lan_ip
    lan_ip="$(get_lan_ip)"
    if [[ -n "$lan_ip" ]]; then
      echo "   局域网访问：http://${lan_ip}:${WEB_PORT:-5173}"
    else
      echo "   局域网访问：未检测到本机局域网 IP"
    fi
    return 0
  else
    return 1
  fi
}

start_web() {
  start_web_background
  verify_web
}

start_server_background() {
  if is_server_running; then
    echo "🟢 后端服务已在运行 (PID: $(cat "$SERVER_PID_FILE"))"
    return 0
  fi

  load_env
  echo "🚀 启动后端开发服务..."
  nohup "$PKG_MANAGER" run server:dev > "$SERVER_LOG" 2>&1 &
  echo $! > "$SERVER_PID_FILE"
}

verify_server() {
  if check_service_status "server" "$SERVER_PID_FILE" "$SERVER_LOG" "${PORT:-3000}" "$ROOT_DIR/packages/server-nestjs/"; then
    echo "✅ 后端已启动，PID: $(cat "$SERVER_PID_FILE")"
    echo "   日志文件: $SERVER_LOG"
    echo "   API 健康检查（本机）：http://localhost:${PORT:-3000}/v1/health"
    local lan_ip
    lan_ip="$(get_lan_ip)"
    if [[ -n "$lan_ip" ]]; then
      echo "   API 健康检查（局域网）：http://${lan_ip}:${PORT:-3000}/v1/health"
    else
      echo "   API 健康检查（局域网）：未检测到本机局域网 IP"
    fi
    return 0
  else
    return 1
  fi
}

start_server() {
  start_server_background
  verify_server
}

kill_port() {
  local port="$1"
  local pid_file="${2:-}"
  local our_pid=""

  if [[ -n "$pid_file" && -f "$pid_file" ]]; then
    our_pid="$(cat "$pid_file" 2>/dev/null || true)"
  fi

  local port_pids
  port_pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)

  if [[ -z "$port_pids" ]]; then
    return 0
  fi

  if [[ -n "$our_pid" ]]; then
    for pid in $port_pids; do
      if [[ "$pid" == "$our_pid" ]] || pgrep -P "$our_pid" 2>/dev/null | grep -qx "$pid"; then
        echo "🔪 杀死端口 $port 的进程: $pid (属于 PID $our_pid)"
        kill -9 "$pid" 2>/dev/null || true
      fi
    done
  fi
  sleep 1
}

kill_orphan_port_process() {
  local port="$1"
  local match="$2"

  local port_pids
  port_pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)
  if [[ -z "$port_pids" ]]; then
    return 0
  fi

  for pid in $port_pids; do
    local cmd
    cmd="$(ps -o command= -p "$pid" 2>/dev/null || true)"
    if [[ -n "$cmd" && "$cmd" == *"$match"* ]]; then
      echo "🔪 发现残留进程占用端口 $port: $pid"
      kill "$pid" 2>/dev/null || true
      sleep 1
      if kill -0 "$pid" >/dev/null 2>&1; then
        echo "⚠️ 进程 $pid 仍在运行，强制结束"
        kill -9 "$pid" 2>/dev/null || true
      fi
    fi
  done
}

stop_web() {
  if is_web_running; then
    local pid
    pid="$(cat "$WEB_PID_FILE")"
    echo "⏹️  停止前端服务 (PID: $pid)..."
    pkill -P "$pid" 2>/dev/null || true
    sleep 1
    kill "$pid" 2>/dev/null || true
    rm -f "$WEB_PID_FILE"
  else
    echo "⚪ 前端服务未运行"
  fi
  kill_port "${WEB_PORT:-5173}" "$WEB_PID_FILE"
  echo "✅ 前端已停止"
}

stop_server() {
  if is_server_running; then
    local pid
    pid="$(cat "$SERVER_PID_FILE")"
    echo "⏹️  停止后端服务 (PID: $pid)..."
    pkill -P "$pid" 2>/dev/null || true
    sleep 1
    kill "$pid" 2>/dev/null || true
    rm -f "$SERVER_PID_FILE"
  else
    echo "⚪ 后端服务未运行"
  fi
  kill_port "${PORT:-3000}" "$SERVER_PID_FILE"
  kill_orphan_port_process "${PORT:-3000}" "$ROOT_DIR/packages/server-nestjs/"
  echo "✅ 后端已停止"
}

start() {
  local target="${1:-all}"
  local web_start_status=0
  local server_start_status=0

  case "$target" in
    web)
      start_web_background || web_start_status=$?
      ;;
    server)
      start_server_background || server_start_status=$?
      ;;
    all)
      start_web_background || web_start_status=$?
      start_server_background || server_start_status=$?
      ;;
    *)
      echo "未知服务: $target"
      exit 1
      ;;
  esac

  local web_verify_status=0
  local server_verify_status=0

  case "$target" in
    web)
      verify_web || web_verify_status=$?
      ;;
    server)
      verify_server || server_verify_status=$?
      ;;
    all)
      verify_web || web_verify_status=$?
      verify_server || server_verify_status=$?
      ;;
  esac

  local has_failure=0
  if [[ $web_start_status -ne 0 || $web_verify_status -ne 0 ]]; then
    echo ""
    echo "❌ 前端服务启动失败"
    echo "   请查看日志: $WEB_LOG"
    has_failure=1
  fi
  if [[ $server_start_status -ne 0 || $server_verify_status -ne 0 ]]; then
    echo ""
    echo "❌ 后端服务启动失败"
    echo "   请查看日志: $SERVER_LOG"
    has_failure=1
  fi

  if [[ $has_failure -eq 1 ]]; then
    echo ""
    echo "⚠️ 部分服务启动失败，请检查上述日志文件获取详细信息"
    return 1
  fi

  return 0
}

start_mvp() {
  load_env
  export DEV_VERIFY_CODE="${DEV_VERIFY_CODE:-123456}"

  start_db
  run_migrate

  local server_start_status=0
  start_server_background || server_start_status=$?

  local web_start_status=0
  start_web_background || web_start_status=$?

  local server_verify_status=0
  verify_server || server_verify_status=$?

  local web_verify_status=0
  verify_web || web_verify_status=$?

  local has_failure=0
  if [[ $server_start_status -ne 0 || $server_verify_status -ne 0 ]]; then
    echo ""
    echo "❌ 后端服务启动失败"
    echo "   请查看日志: $SERVER_LOG"
    has_failure=1
  fi
  if [[ $web_start_status -ne 0 || $web_verify_status -ne 0 ]]; then
    echo ""
    echo "❌ 前端服务启动失败"
    echo "   请查看日志: $WEB_LOG"
    has_failure=1
  fi

  if [[ $has_failure -eq 1 ]]; then
    echo ""
    echo "⚠️ 部分服务启动失败，请检查上述日志文件获取详细信息"
    return 1
  fi

  echo "✅ MVP 已启动"
  echo "👉 访问提示："
  echo "   前端地址（本机）：http://localhost:${WEB_PORT:-5173}"
  echo "   API 地址（本机）：http://localhost:${PORT:-3000}/v1/health"
  local lan_ip
  lan_ip="$(get_lan_ip)"
  if [[ -n "$lan_ip" ]]; then
    echo "   前端地址（局域网）：http://${lan_ip}:${WEB_PORT:-5173}"
    echo "   API 地址（局域网）：http://${lan_ip}:${PORT:-3000}/v1/health"
  else
    echo "   局域网访问：未检测到本机局域网 IP"
  fi
  return 0
}

stop() {
  local target="${1:-all}"
  case "$target" in
    web)
      stop_web
      ;;
    server)
      stop_server
      ;;
    all)
      stop_web
      stop_server
      ;;
    *)
      echo "未知服务: $target"
      exit 1
      ;;
  esac
}

stop_mvp() {
  stop_web
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
    web)
      echo "📦 构建前端..."
      $PKG_MANAGER run web:build
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
  local target="${1:-web}"
  case "$target" in
    web)
      if [[ -f "$WEB_LOG" ]]; then
        echo "📋 前端日志 ($WEB_LOG):"
        tail -f "$WEB_LOG"
      else
        echo "未找到前端日志文件: $WEB_LOG"
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
      echo "未知服务: $target (可选: web, server)"
      exit 1
      ;;
  esac
}

status() {
  echo "📊 服务状态:"
  echo ""
  if is_web_running; then
    echo "  🟢 前端: 运行中 (PID: $(cat "$WEB_PID_FILE"))"
  else
    echo "  ⚪ 前端: 未运行"
  fi

  if is_server_running; then
    echo "  🟢 后端: 运行中 (PID: $(cat "$SERVER_PID_FILE"))"
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
    start "${2:-all}" || exit $?
    ;;
  start:mvp)
    start_mvp || exit $?
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
    logs "${2:-web}"
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
