#!/usr/bin/env python3
"""
Convenience CLI for frequent Blueprint updates.

Examples:
  python3 skills/blueprint-onboard/scripts/blueprint_cli.py story-done --id US-202
  python3 skills/blueprint-onboard/scripts/blueprint_cli.py story-update --id US-202 --status doing --progress 60
  python3 skills/blueprint-onboard/scripts/blueprint_cli.py validate
"""

from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict


def run(cmd: list[str]) -> int:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.stdout:
        print(proc.stdout.strip())
    if proc.stderr:
        print(proc.stderr.strip())
    return proc.returncode


def build_story_patch(args: argparse.Namespace) -> Dict[str, Any]:
    story: Dict[str, Any] = {"id": args.id}

    if args.done:
        story["status"] = "done"
        story["progress"] = 100
    else:
        if args.status is not None:
            story["status"] = args.status
        if args.progress is not None:
            story["progress"] = args.progress

    for k in ["title", "epic", "capability", "milestone"]:
        v = getattr(args, k, None)
        if v:
            story[k] = v

    return {"stories": [story]}


def main() -> int:
    here = Path(__file__).resolve().parent
    apply_script = here / "apply_blueprint_merge.py"
    validate_script = here / "validate_blueprint.py"

    parser = argparse.ArgumentParser(description="Blueprint day-to-day CLI")
    parser.add_argument(
        "--blueprint-dir",
        default=str((Path.cwd() / "blueprint").resolve()),
        help="Blueprint directory (default: ./blueprint)",
    )

    sub = parser.add_subparsers(dest="cmd", required=True)

    s_done = sub.add_parser("story-done", help="Mark a story as done (status=done, progress=100)")
    s_done.add_argument("--id", required=True, help="Story ID, e.g. US-202")
    s_done.add_argument("--dry-run", action="store_true")

    s_update = sub.add_parser("story-update", help="Update story status/progress and optional metadata")
    s_update.add_argument("--id", required=True, help="Story ID, e.g. US-202")
    s_update.add_argument("--status", choices=["todo", "doing", "blocked", "done"])
    s_update.add_argument("--progress", type=int, choices=range(0, 101), metavar="0-100")
    s_update.add_argument("--title")
    s_update.add_argument("--epic")
    s_update.add_argument("--capability")
    s_update.add_argument("--milestone")
    s_update.add_argument("--done", action="store_true", help="Shortcut: status=done and progress=100")
    s_update.add_argument("--on-conflict", choices=["keep_old", "use_new"], default="keep_old")
    s_update.add_argument("--dry-run", action="store_true")

    s_validate = sub.add_parser("validate", help="Validate generated blueprint files")

    args = parser.parse_args()
    blueprint_dir = str(Path(args.blueprint_dir).expanduser().resolve())

    if args.cmd == "validate":
        return run(["python3", str(validate_script), "--blueprint-dir", blueprint_dir])

    if args.cmd in {"story-done", "story-update"}:
        if args.cmd == "story-done":
            payload = {"stories": [{"id": args.id, "status": "done", "progress": 100}]}
            on_conflict = "keep_old"
            dry_run = args.dry_run
        else:
            payload = build_story_patch(args)
            on_conflict = args.on_conflict
            dry_run = args.dry_run

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
            tmp_input = f.name

        cmd = [
            "python3",
            str(apply_script),
            "--input",
            tmp_input,
            "--blueprint-dir",
            blueprint_dir,
            "--mode",
            "append",
            "--on-conflict",
            on_conflict,
        ]
        if dry_run:
            cmd.append("--dry-run")

        rc = run(cmd)
        if rc != 0:
            return rc
        return run(["python3", str(validate_script), "--blueprint-dir", blueprint_dir])

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
