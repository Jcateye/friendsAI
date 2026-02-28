#!/usr/bin/env bash
set -euo pipefail

DEFAULT_ROOT="/Users/haoqi/Library/Mobile Documents/iCloud~md~obsidian/Documents/private_knowlegde/project-view"

usage() {
  cat <<'EOF'
Usage:
  setup_blueprint_symlink.sh [--root <project_view_root>] [--project-name <name>]
  setup_blueprint_symlink.sh --vault <obsidian_vault_path>
  setup_blueprint_symlink.sh --target <blueprint_target_path>

Options:
  --root          project-view 根目录（默认使用脚本内置路径）
  --project-name  项目名（默认当前 repo 目录名）
  --vault         Obsidian Vault 路径，目标会是 <vault>/blueprint
  --target        直接指定 blueprint 真实目录
  --dry-run       仅打印动作，不落盘
  -h, --help      显示帮助
EOF
}

is_empty_dir() {
  local dir="$1"
  [[ -d "$dir" ]] || return 1
  [[ -z "$(find "$dir" -mindepth 1 -print -quit 2>/dev/null)" ]]
}

run_cmd() {
  if [[ "$dry_run" -eq 1 ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

root_path="$DEFAULT_ROOT"
vault_path=""
target_path=""
project_name=""
dry_run=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root)
      root_path="${2:-}"
      shift 2
      ;;
    --project-name)
      project_name="${2:-}"
      shift 2
      ;;
    --vault)
      vault_path="${2:-}"
      shift 2
      ;;
    --target)
      target_path="${2:-}"
      shift 2
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(
  git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null \
    || (cd "$script_dir/../../.." && pwd)
)"
if [[ -z "$project_name" ]]; then
  project_name="$(basename "$repo_root")"
fi

mode_count=0
[[ -n "$target_path" ]] && mode_count=$((mode_count + 1))
[[ -n "$vault_path" ]] && mode_count=$((mode_count + 1))
if [[ "$root_path" != "$DEFAULT_ROOT" ]]; then
  mode_count=$((mode_count + 1))
fi

if [[ "$mode_count" -gt 1 ]]; then
  echo "Error: choose only one mode from --root/--vault/--target." >&2
  exit 1
fi

if [[ -n "$target_path" ]]; then
  resolved_target="$target_path"
elif [[ -n "$vault_path" ]]; then
  resolved_target="${vault_path%/}/blueprint"
else
  resolved_target="${root_path%/}/${project_name}/blueprint"
fi

link_path="${repo_root}/blueprint"
timestamp="$(date '+%Y%m%d-%H%M%S')"
backup_path="${repo_root}/blueprint.local-backup.${timestamp}"

run_cmd mkdir -p "$resolved_target"

if [[ -e "$link_path" && ! -L "$link_path" ]]; then
  run_cmd mv "$link_path" "$backup_path"
  echo "Backed up existing local blueprint to: $backup_path"

  if [[ -d "$backup_path" ]] && is_empty_dir "$resolved_target"; then
    run_cmd cp -a "$backup_path/." "$resolved_target/"
    echo "Seeded target blueprint from backup."
  elif [[ -d "$backup_path" ]]; then
    echo "Target blueprint is not empty; skipped seeding from backup."
  fi
fi

if [[ -L "$link_path" ]]; then
  run_cmd rm "$link_path"
fi

run_cmd ln -s "$resolved_target" "$link_path"

echo "Symlink ready:"
echo "  ${link_path} -> ${resolved_target}"
