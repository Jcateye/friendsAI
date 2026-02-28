#!/usr/bin/env python3
"""
Validate Blueprint V3 files.

Usage:
  python3 validate_blueprint.py --blueprint-dir /path/to/blueprint
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple


def extract_auto_content(text: str) -> str:
    m = re.search(
        re.escape("<!-- AUTO:START -->")
        + r"\n?(.*?)\n?"
        + re.escape("<!-- AUTO:END -->"),
        text,
        re.DOTALL,
    )
    if m:
        return m.group(1).strip()
    return text.strip()


def extract_mermaid_blocks(md: str) -> List[str]:
    return re.findall(r"```mermaid\n(.*?)```", md, re.DOTALL)


def parse_story_frontmatter(md: str) -> Dict[str, Any] | None:
    m = re.match(r"^---\n(.*?)\n---\n", md, re.DOTALL)
    if not m:
        return None
    try:
        import yaml  # type: ignore
        data = yaml.safe_load(m.group(1))
    except Exception:
        data = {}
        for raw_line in m.group(1).splitlines():
            line = raw_line.strip()
            if not line or line.startswith('#') or ':' not in line:
                continue
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()
            if not key:
                continue
            if value.startswith('[') and value.endswith(']'):
                inner = value[1:-1].strip()
                data[key] = [part.strip() for part in inner.split(',') if part.strip()] if inner else []
                continue
            if value.isdigit():
                data[key] = int(value)
                continue
            data[key] = value
    return data if isinstance(data, dict) else None


def add_issue(issues: List[Dict[str, Any]], file: Path, rule: str, message: str) -> None:
    issues.append({"file": str(file), "rule": rule, "message": message})


def validate_roadmap_tree(file: Path, issues: List[Dict[str, Any]]) -> None:
    if not file.exists():
        add_issue(issues, file, "exists", "missing file")
        return
    auto = extract_auto_content(file.read_text(encoding="utf-8"))
    blocks = extract_mermaid_blocks(auto)
    if not blocks:
        add_issue(issues, file, "mermaid", "missing mermaid block")
        return
    first = blocks[0].strip().splitlines()[0].strip() if blocks[0].strip() else ""
    if first not in {"flowchart TB", "flowchart LR"}:
        add_issue(issues, file, "mermaid_type", f"expected flowchart TB or flowchart LR, got: {first}")

    if not re.search(r'\["E-\d+\s+[^"\]]+', auto):
        add_issue(issues, file, "node_label", "missing 'ID + 名称摘要' epic labels")


def validate_dependencies(file: Path, issues: List[Dict[str, Any]]) -> None:
    if not file.exists():
        add_issue(issues, file, "exists", "missing file")
        return
    auto = extract_auto_content(file.read_text(encoding="utf-8"))
    blocks = extract_mermaid_blocks(auto)
    if not blocks:
        add_issue(issues, file, "mermaid", "missing mermaid block")
        return
    first = blocks[0].strip().splitlines()[0].strip() if blocks[0].strip() else ""
    if first != "flowchart LR":
        add_issue(issues, file, "mermaid_type", f"expected flowchart LR, got: {first}")
    has_any_nodes = bool(re.search(r'\["[^"\]]+"\]', auto))
    has_capability_labels = bool(re.search(r'\["C-\d+\s+[^"\]]+', auto))
    if has_any_nodes and not has_capability_labels:
        add_issue(issues, file, "node_label", "missing 'ID + 名称摘要' capability labels")


def validate_milestones(file: Path, issues: List[Dict[str, Any]]) -> None:
    if not file.exists():
        add_issue(issues, file, "exists", "missing file")
        return
    auto = extract_auto_content(file.read_text(encoding="utf-8"))
    blocks = extract_mermaid_blocks(auto)
    if not blocks:
        add_issue(issues, file, "mermaid", "missing mermaid block")
        return
    first = blocks[0].strip().splitlines()[0].strip() if blocks[0].strip() else ""
    if first != "gantt":
        add_issue(issues, file, "mermaid_type", f"expected gantt, got: {first}")


def validate_arch_a(file: Path, issues: List[Dict[str, Any]]) -> None:
    if not file.exists():
        add_issue(issues, file, "exists", "missing file")
        return
    auto = extract_auto_content(file.read_text(encoding="utf-8"))
    blocks = extract_mermaid_blocks(auto)
    if not blocks:
        add_issue(issues, file, "mermaid", "missing mermaid block")
        return
    block = blocks[0]
    if not block.strip().startswith("flowchart"):
        add_issue(issues, file, "mermaid_type", "expected flowchart in architecture A")
    if "subgraph" not in block:
        add_issue(issues, file, "subgraph", "architecture A should contain subgraph")


def validate_arch_b(file: Path, issues: List[Dict[str, Any]]) -> None:
    if not file.exists():
        add_issue(issues, file, "exists", "missing file")
        return
    auto = extract_auto_content(file.read_text(encoding="utf-8"))
    blocks = extract_mermaid_blocks(auto)
    if not blocks:
        add_issue(issues, file, "mermaid", "missing mermaid block")
        return
    first = blocks[0].strip().splitlines()[0].strip() if blocks[0].strip() else ""
    if first != "flowchart LR":
        add_issue(issues, file, "mermaid_type", f"expected flowchart LR, got: {first}")


def validate_stories(stories_dir: Path, issues: List[Dict[str, Any]]) -> None:
    if not stories_dir.exists():
        add_issue(issues, stories_dir, "exists", "missing Stories dir")
        return

    for p in sorted(stories_dir.glob("US-*.md")):
        if p.name == "US-xxx.md":
            continue
        raw = p.read_text(encoding="utf-8")
        auto = extract_auto_content(raw)
        fm = parse_story_frontmatter(auto)
        if fm is None:
            add_issue(issues, p, "frontmatter", "missing or invalid frontmatter")
            continue
        for req in ["id", "capability", "milestone"]:
            if req not in fm or fm.get(req) in (None, ""):
                add_issue(issues, p, "required_field", f"missing required field: {req}")

        file_id = p.stem
        story_id = str(fm.get("id", ""))
        if story_id and story_id != file_id:
            add_issue(issues, p, "id_filename", f"frontmatter id ({story_id}) != filename ({file_id})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate Blueprint V3 markdown structure")
    parser.add_argument("--blueprint-dir", required=True, help="Path to blueprint directory")
    args = parser.parse_args()

    root = Path(args.blueprint_dir).expanduser().resolve()
    issues: List[Dict[str, Any]] = []

    validate_roadmap_tree(root / "Roadmap/Blueprint Tree.md", issues)
    validate_dependencies(root / "Roadmap/Dependencies.md", issues)
    validate_milestones(root / "Roadmap/Milestones.md", issues)
    validate_arch_a(root / "Architecture/Architecture A - Layers.md", issues)
    validate_arch_b(root / "Architecture/Architecture B - Containers.md", issues)
    validate_stories(root / "Stories", issues)

    out = {
        "status": "ok" if not issues else "failed",
        "issues": issues,
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))
    raise SystemExit(0 if not issues else 1)


if __name__ == "__main__":
    main()
