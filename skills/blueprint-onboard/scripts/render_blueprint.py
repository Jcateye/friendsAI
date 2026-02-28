#!/usr/bin/env python3
"""
Render Blueprint V3 (5 views) from structured project input.

Usage:
  python3 render_blueprint.py --input /path/to/project-blueprint.yaml --output /path/to/blueprint [--overwrite]
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def safe_node_id(raw: str) -> str:
    cleaned = re.sub(r"[^0-9A-Za-z_]", "_", raw)
    cleaned = re.sub(r"_+", "_", cleaned).strip("_")
    if not cleaned:
        cleaned = "NODE"
    if cleaned[0].isdigit():
        cleaned = f"N_{cleaned}"
    return cleaned


def mermaid_text(s: Any) -> str:
    text = str(s) if s is not None else ""
    return text.replace('"', "'").replace("\n", " ")


def parse_input_file(path: Path) -> Dict[str, Any]:
    raw = path.read_text(encoding="utf-8")
    suffix = path.suffix.lower()

    if suffix == ".json":
        data = json.loads(raw)
    else:
        try:
            import yaml  # type: ignore
        except Exception as exc:
            raise RuntimeError(
                "YAML input requires pyyaml. Install with: python3 -m pip install --user pyyaml"
            ) from exc
        data = yaml.safe_load(raw)

    if not isinstance(data, dict):
        raise ValueError("Input root must be an object/map.")
    return data


def write_file(path: Path, content: str, overwrite: bool) -> None:
    if path.exists() and not overwrite:
        print(f"skip: {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"write: {path}")


def to_story_list(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    stories = data.get("stories", [])
    if stories and isinstance(stories, list):
        return [s for s in stories if isinstance(s, dict)]

    # Fallback: derive stories from roadmap_tree leaves if stories not provided.
    result: List[Dict[str, Any]] = []
    tree = data.get("roadmap_tree", {})
    epics = tree.get("epics", []) if isinstance(tree, dict) else []
    if not isinstance(epics, list):
        return result

    for epic in epics:
        if not isinstance(epic, dict):
            continue
        epic_id = epic.get("id", "E-001")
        caps = epic.get("capabilities", [])
        if not isinstance(caps, list):
            continue
        for cap in caps:
            if not isinstance(cap, dict):
                continue
            cap_id = cap.get("id", "C-001")
            us_list = cap.get("stories", [])
            if not isinstance(us_list, list):
                continue
            for us in us_list:
                if not isinstance(us, dict):
                    continue
                result.append(
                    {
                        "id": us.get("id", "US-001"),
                        "epic": epic_id,
                        "capability": cap_id,
                        "milestone": us.get("milestone", "M-yyy"),
                        "title": us.get("title", "Story"),
                        "status": us.get("status", "todo"),
                        "progress": us.get("progress", 0),
                    }
                )
    return result


def status_class(status: str) -> str:
    s = (status or "todo").lower().strip()
    if s in {"doing", "blocked", "done", "todo"}:
        return s
    return "todo"


def grouped_tree_from_stories(stories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    epic_map: Dict[str, Dict[str, Any]] = {}
    cap_map: Dict[Tuple[str, str], Dict[str, Any]] = {}

    for story in stories:
        epic_id = story.get("epic", "E-001")
        cap_id = story.get("capability", "C-001")
        epic_title = story.get("epic_title", "Epic")
        cap_title = story.get("capability_title", "Capability")

        if epic_id not in epic_map:
            epic_map[epic_id] = {
                "id": epic_id,
                "title": epic_title,
                "progress": 0,
                "capabilities": [],
            }
        key = (epic_id, cap_id)
        if key not in cap_map:
            cap_obj = {
                "id": cap_id,
                "title": cap_title,
                "progress": 0,
                "stories": [],
            }
            cap_map[key] = cap_obj
            epic_map[epic_id]["capabilities"].append(cap_obj)

        cap_map[key]["stories"].append(story)

    # Calculate progress from child stories.
    for epic in epic_map.values():
        cap_progress_values = []
        for cap in epic["capabilities"]:
            stories_in_cap = cap["stories"]
            if stories_in_cap:
                cap_progress = int(
                    round(
                        sum(float(s.get("progress", 0)) for s in stories_in_cap)
                        / len(stories_in_cap)
                    )
                )
            else:
                cap_progress = 0
            cap["progress"] = cap_progress
            cap_progress_values.append(cap_progress)

        epic["progress"] = (
            int(round(sum(cap_progress_values) / len(cap_progress_values)))
            if cap_progress_values
            else 0
        )

    return list(epic_map.values())


def get_epics_for_tree(data: Dict[str, Any], stories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    tree = data.get("roadmap_tree", {})
    if isinstance(tree, dict):
        epics = tree.get("epics", [])
        if isinstance(epics, list) and epics:
            return [e for e in epics if isinstance(e, dict)]
    return grouped_tree_from_stories(stories)


def render_blueprint_tree(epics: List[Dict[str, Any]]) -> str:
    lines: List[str] = []
    lines.append("# 视图 A：Blueprint Tree（主视图）")
    lines.append("")
    lines.append("```mermaid")
    lines.append("flowchart LR")
    lines.append("")
    lines.append("classDef todo fill:#f5f5f5,stroke:#999,color:#111;")
    lines.append("classDef doing fill:#e8f0fe,stroke:#4c8bf5,color:#111;")
    lines.append("classDef blocked fill:#fde8e8,stroke:#d93025,color:#111;")
    lines.append("classDef done fill:#e6f4ea,stroke:#1e8e3e,color:#111;")
    lines.append("classDef level fill:#eef3ff,stroke:#7b8ab8,color:#111;")
    lines.append('ROOT["Blueprint Tree"]:::level')
    lines.append("")

    for epic in epics:
        epic_id = str(epic.get("id", "E-001"))
        epic_title = mermaid_text(epic.get("title", "Epic"))
        epic_progress = int(float(epic.get("progress", 0)))
        epic_node = safe_node_id(f"EPIC_{epic_id}")
        lines.append(f'{epic_node}["{epic_id} {epic_title} ({epic_progress}%)"]:::level')
        lines.append(f"ROOT --> {epic_node}")

        caps = epic.get("capabilities", [])
        if not isinstance(caps, list):
            caps = []

        for cap in caps:
            if not isinstance(cap, dict):
                continue
            cap_id = str(cap.get("id", "C-001"))
            cap_title = mermaid_text(cap.get("title", "Capability"))
            cap_progress = int(float(cap.get("progress", 0)))
            cap_node = safe_node_id(f"CAP_{epic_id}_{cap_id}")
            lines.append(f'{cap_node}["{cap_id} {cap_title} ({cap_progress}%)"]:::level')
            lines.append(f"{epic_node} --> {cap_node}")

            us_list = cap.get("stories", [])
            if not isinstance(us_list, list):
                us_list = []

            for us in us_list:
                if not isinstance(us, dict):
                    continue
                us_id = str(us.get("id", "US-001"))
                us_title = mermaid_text(us.get("title", "Story"))
                us_status = status_class(str(us.get("status", "todo")))
                us_progress = int(float(us.get("progress", 0)))
                node_id = safe_node_id(f"US_{epic_id}_{cap_id}_{us_id}")
                lines.append(
                    f'{node_id}["{us_id} {us_title} ({us_status}, {us_progress}%)"]:::{us_status}'
                )
                lines.append(f"{cap_node} --> {node_id}")
        lines.append("")

    lines.append("```")
    return "\n".join(lines) + "\n"


def render_dependencies(data: Dict[str, Any]) -> str:
    deps = data.get("dependencies", {})
    if not isinstance(deps, dict):
        deps = {}

    capabilities = deps.get("capabilities", [])
    externals = deps.get("externals", [])
    if not isinstance(capabilities, list):
        capabilities = []
    if not isinstance(externals, list):
        externals = []

    lines: List[str] = []
    lines.append("# 视图 B：Dependencies（风险视图）")
    lines.append("")
    lines.append("```mermaid")
    lines.append("flowchart LR")
    lines.append("")
    lines.append("classDef normal fill:#f5f5f5,stroke:#999,color:#111;")
    lines.append("classDef risk fill:#fde8e8,stroke:#d93025,color:#111;")
    lines.append("classDef ext fill:#fff7e0,stroke:#c78a00,color:#111;")
    lines.append("")

    cap_by_id: Dict[str, Dict[str, Any]] = {}
    for cap in capabilities:
        if not isinstance(cap, dict):
            continue
        cap_id = str(cap.get("id", "C-001"))
        cap_title = mermaid_text(cap.get("title", "Capability"))
        blocked_reason = mermaid_text(cap.get("blocked_reason", "")).strip()
        risk = bool(blocked_reason) or str(cap.get("status", "")).lower() == "blocked"
        cls = "risk" if risk else "normal"
        suffix = f" [blocked: {blocked_reason}]" if blocked_reason else ""
        lines.append(
            f'{safe_node_id(cap_id)}["{cap_id} {cap_title}{suffix}"]:::{cls}'
        )
        cap_by_id[cap_id] = cap

    if capabilities:
        lines.append("")

    for ext in externals:
        if not isinstance(ext, dict):
            continue
        ext_id = str(ext.get("id", "EXT-001"))
        ext_title = mermaid_text(ext.get("title", "External"))
        lines.append(f'{safe_node_id(ext_id)}["{ext_id} {ext_title}"]:::ext')

    lines.append("")

    # Edges from capability depends_on.
    for cap_id, cap in cap_by_id.items():
        depends_on = cap.get("depends_on", [])
        if not isinstance(depends_on, list):
            continue
        for dep in depends_on:
            dep_id = ""
            reason = ""
            if isinstance(dep, dict):
                dep_id = str(dep.get("id", "")).strip()
                reason = mermaid_text(dep.get("reason", "")).strip()
            else:
                dep_id = str(dep).strip()
            if not dep_id:
                continue
            from_node = safe_node_id(dep_id)
            to_node = safe_node_id(cap_id)
            if reason:
                lines.append(f'{from_node} -->|"{reason}"| {to_node}')
            else:
                lines.append(f"{from_node} --> {to_node}")

    # Optional explicit edges.
    explicit_edges = deps.get("edges", [])
    if isinstance(explicit_edges, list):
        for edge in explicit_edges:
            if not isinstance(edge, dict):
                continue
            from_id = str(edge.get("from", "")).strip()
            to_id = str(edge.get("to", "")).strip()
            reason = mermaid_text(edge.get("reason", "")).strip()
            if not from_id or not to_id:
                continue
            if reason:
                lines.append(f'{safe_node_id(from_id)} -->|"{reason}"| {safe_node_id(to_id)}')
            else:
                lines.append(f"{safe_node_id(from_id)} --> {safe_node_id(to_id)}")

    lines.append("```")
    return "\n".join(lines) + "\n"


def task_status_prefix(status: str) -> str:
    s = (status or "").lower().strip()
    if s == "doing":
        return "active"
    if s == "done":
        return "done"
    if s == "blocked":
        return "crit"
    return ""


def render_milestones(data: Dict[str, Any]) -> str:
    milestones = data.get("milestones", [])
    if not isinstance(milestones, list):
        milestones = []

    lines: List[str] = []
    lines.append("# 视图 C：Milestones（发布视图）")
    lines.append("")
    lines.append("```mermaid")
    lines.append("gantt")
    lines.append("title Milestones (ID + 名称摘要)")
    lines.append("dateFormat YYYY-MM-DD")
    lines.append("axisFormat %m/%d")
    lines.append("")

    table_rows: List[List[str]] = []

    for m in milestones:
        if not isinstance(m, dict):
            continue
        m_id = str(m.get("id", "M-yyy"))
        m_title = mermaid_text(m.get("title", "里程碑"))
        lines.append(f"section {m_id} {m_title}")

        items = m.get("items", [])
        if not isinstance(items, list):
            items = []
        for item in items:
            if not isinstance(item, dict):
                continue
            i_id = str(item.get("id", "C-xxx"))
            i_title = mermaid_text(item.get("title", "能力"))
            start = str(item.get("start", "2026-01-01"))
            end = str(item.get("end", "2026-01-15"))
            prefix = task_status_prefix(str(item.get("status", "")))
            if prefix:
                lines.append(f"{i_id} {i_title} :{prefix}, {safe_node_id(i_id)}, {start}, {end}")
            else:
                lines.append(f"{i_id} {i_title} :{safe_node_id(i_id)}, {start}, {end}")

        checkpoint = m.get("checkpoint", {})
        if isinstance(checkpoint, dict):
            cp_date = checkpoint.get("date")
            if cp_date:
                cp_title = mermaid_text(checkpoint.get("title", f"{m_id} 出口检查"))
                lines.append(f"{cp_title} :milestone, {safe_node_id(m_id)}_checkpoint, {cp_date}, 1d")

        lines.append("")

        scope = m.get("scope", [])
        if isinstance(scope, list):
            scope_str = ", ".join(str(x) for x in scope)
        else:
            scope_str = str(scope)
        window = f"{m.get('start', '')} ~ {m.get('end', '')}".strip(" ~")
        table_rows.append(
            [m_id, str(m_title), window or "-", scope_str or "-", str(m.get("dod", "-"))]
        )

    lines.append("```")
    lines.append("")
    lines.append("| milestone | 名称摘要 | 时间窗口 | 包含范围 | DoD |")
    lines.append("|---|---|---|---|---|")
    if table_rows:
        for row in table_rows:
            lines.append("| " + " | ".join(row) + " |")
    else:
        lines.append("| M-yyy | 示例里程碑 | 2026-01 ~ 2026-03 | E-001, C-001 | 写明出口标准 |")
    lines.append("")
    return "\n".join(lines)


def render_architecture_a(data: Dict[str, Any]) -> str:
    arch = data.get("architecture", {})
    if not isinstance(arch, dict):
        arch = {}

    layers = arch.get("layers", [])
    layer_edges = arch.get("layer_edges", [])
    if not isinstance(layers, list):
        layers = []
    if not isinstance(layer_edges, list):
        layer_edges = []

    if not layers:
        layers = [
            {"id": "L1", "title": "Presentation", "modules": [{"id": "UI", "title": "CLI/TUI"}]},
            {"id": "L2", "title": "Application", "modules": [{"id": "APP", "title": "Orchestrator"}]},
            {"id": "L3", "title": "Domain", "modules": [{"id": "D", "title": "Policies / Contracts"}]},
            {"id": "L4", "title": "Infrastructure", "modules": [{"id": "INF", "title": "Adapters"}]},
        ]
        layer_edges = [{"from": "UI", "to": "APP"}, {"from": "APP", "to": "D"}, {"from": "D", "to": "INF"}]

    lines: List[str] = []
    lines.append("# 架构图 A：分层架构 + 模块边界")
    lines.append("")
    lines.append("```mermaid")
    lines.append("flowchart LR")
    lines.append("")

    for layer in layers:
        if not isinstance(layer, dict):
            continue
        layer_id = safe_node_id(str(layer.get("id", "L")))
        layer_title = mermaid_text(layer.get("title", "Layer"))
        lines.append(f'subgraph {layer_id}["{layer_title}"]')
        modules = layer.get("modules", [])
        if not isinstance(modules, list):
            modules = []
        for m in modules:
            if not isinstance(m, dict):
                continue
            m_id = safe_node_id(str(m.get("id", "M")))
            m_title = mermaid_text(m.get("title", "Module"))
            lines.append(f'  {m_id}["{m_id} {m_title}"]')
        lines.append("end")
        lines.append("")

    for edge in layer_edges:
        if not isinstance(edge, dict):
            continue
        from_id = safe_node_id(str(edge.get("from", "")))
        to_id = safe_node_id(str(edge.get("to", "")))
        label = mermaid_text(edge.get("label", "")).strip()
        if not from_id or not to_id:
            continue
        if label:
            lines.append(f'{from_id} -->|"{label}"| {to_id}')
        else:
            lines.append(f"{from_id} --> {to_id}")

    lines.append("```")
    lines.append("")
    lines.append("## 规则")
    lines.append("- 只画层间允许依赖方向，不画所有细节调用。")
    lines.append("- 节点统一为“编号 + 名称摘要”。")
    lines.append("")
    return "\n".join(lines)


def render_architecture_b(data: Dict[str, Any]) -> str:
    arch = data.get("architecture", {})
    if not isinstance(arch, dict):
        arch = {}

    containers = arch.get("containers", {})
    if not isinstance(containers, dict):
        containers = {}

    boundaries = containers.get("boundaries", [])
    edges = containers.get("edges", [])
    if not isinstance(boundaries, list):
        boundaries = []
    if not isinstance(edges, list):
        edges = []

    if not boundaries:
        boundaries = [
            {"id": "PUBLIC", "title": "Public", "nodes": [{"id": "C", "title": "Client App"}]},
            {
                "id": "PRIVATE",
                "title": "Private",
                "nodes": [
                    {"id": "API", "title": "Agent API"},
                    {"id": "W", "title": "Worker"},
                    {"id": "DB", "title": "Session DB"},
                ],
            },
            {"id": "EXT", "title": "External", "nodes": [{"id": "LLM", "title": "LLM Service"}]},
        ]
        edges = [
            {"from": "C", "to": "API", "label": "HTTPS"},
            {"from": "API", "to": "W", "label": "Async"},
            {"from": "W", "to": "DB", "label": "R/W"},
            {"from": "W", "to": "LLM", "label": "HTTPS"},
        ]

    lines: List[str] = []
    lines.append("# 架构图 B：容器图（运行单元 + 通信）")
    lines.append("")
    lines.append("```mermaid")
    lines.append("flowchart LR")
    lines.append("")

    for b in boundaries:
        if not isinstance(b, dict):
            continue
        b_id = safe_node_id(str(b.get("id", "BOUNDARY")))
        b_title = mermaid_text(b.get("title", "Boundary"))
        lines.append(f'subgraph {b_id}["{b_title}"]')
        nodes = b.get("nodes", [])
        if not isinstance(nodes, list):
            nodes = []
        for n in nodes:
            if not isinstance(n, dict):
                continue
            n_id = safe_node_id(str(n.get("id", "NODE")))
            n_title = mermaid_text(n.get("title", "Container"))
            lines.append(f'  {n_id}["{n_id} {n_title}"]')
        lines.append("end")
        lines.append("")

    for edge in edges:
        if not isinstance(edge, dict):
            continue
        from_id = safe_node_id(str(edge.get("from", "")))
        to_id = safe_node_id(str(edge.get("to", "")))
        label = mermaid_text(edge.get("label", "")).strip()
        if not from_id or not to_id:
            continue
        if label:
            lines.append(f'{from_id} -->|"{label}"| {to_id}')
        else:
            lines.append(f"{from_id} --> {to_id}")

    lines.append("```")
    lines.append("")
    lines.append("## 规则")
    lines.append("- 节点只放运行单元（容器），不用类/函数粒度。")
    lines.append("- 边上写协议：HTTPS / WebSocket / Async / Cron。")
    lines.append("")
    return "\n".join(lines)


def story_frontmatter(story: Dict[str, Any]) -> str:
    vibe_tasks = story.get("vibe_tasks", [])
    if not isinstance(vibe_tasks, list):
        vibe_tasks = []
    vibe_tasks_str = ", ".join(str(x) for x in vibe_tasks)
    return (
        "---\n"
        f"id: {story.get('id', 'US-001')}\n"
        f"epic: {story.get('epic', 'E-001')}\n"
        f"capability: {story.get('capability', 'C-001')}\n"
        f"milestone: {story.get('milestone', 'M-yyy')}\n"
        f"title: {story.get('title', 'Story')}\n"
        f"status: {story.get('status', 'todo')}\n"
        f"progress: {int(float(story.get('progress', 0)))}\n"
        f"effort: {int(float(story.get('effort', 1)))}\n"
        f"openspec_change: {story.get('openspec_change', 'replace-with-change-id')}\n"
        f"vibe_parent_task: {story.get('vibe_parent_task', 'replace-with-parent-task-id')}\n"
        f"vibe_tasks: [{vibe_tasks_str}]\n"
        "---\n"
    )


def render_story_md(story: Dict[str, Any]) -> str:
    user_story = story.get("user_story", {})
    if not isinstance(user_story, dict):
        user_story = {}
    as_user = user_story.get("as", "<目标用户>")
    want = user_story.get("want", "<目标能力>")
    so_that = user_story.get("so_that", "<业务价值>")

    acceptance = story.get("acceptance", [])
    if not isinstance(acceptance, list):
        acceptance = []
    notes = story.get("notes", {})
    if not isinstance(notes, dict):
        notes = {}

    lines: List[str] = []
    lines.append(story_frontmatter(story).rstrip())
    lines.append("")
    lines.append(f"# {story.get('id', 'US-001')} {story.get('title', 'Story')}")
    lines.append("")
    lines.append("## User Story")
    lines.append(f"作为：{as_user}")
    lines.append(f"我想要：{want}")
    lines.append(f"以便于：{so_that}")
    lines.append("")
    lines.append("## Acceptance Criteria（验收）")
    if acceptance:
        for item in acceptance:
            lines.append(f"- [ ] {item}")
    else:
        lines.append("- [ ] 验收条件 1")
        lines.append("- [ ] 验收条件 2")
    lines.append("")
    lines.append("## Notes（给 OpenSpec 拆分用）")
    lines.append(f"- 数据模型：{notes.get('data_model', '')}")
    lines.append(f"- API 草案：{notes.get('api', '')}")
    lines.append(f"- 边界情况：{notes.get('edge_cases', '')}")
    lines.append(f"- 回滚/迁移：{notes.get('rollback', '')}")
    lines.append("")
    return "\n".join(lines)


def render_stories(stories: List[Dict[str, Any]], output_dir: Path, overwrite: bool) -> None:
    stories_dir = output_dir / "Stories"
    stories_dir.mkdir(parents=True, exist_ok=True)

    lines = ["# Stories（叶子 User Stories）", ""]
    if stories:
        lines.append("当前故事：")
        for s in stories:
            lines.append(f"- {s.get('id', 'US-001')}：{s.get('title', 'Story')}")
    else:
        lines.append("当前故事：")
        lines.append("- US-001：示例 Story")
    lines.append("")
    lines.append("每个 Story frontmatter 最小字段（强制）：")
    lines.append("- `id`")
    lines.append("- `capability`")
    lines.append("- `milestone`")
    lines.append("")
    write_file(stories_dir / "README.md", "\n".join(lines), overwrite)

    if not stories:
        stories = [
            {
                "id": "US-001",
                "epic": "E-001",
                "capability": "C-001",
                "milestone": "M-yyy",
                "title": "示例 Story",
                "status": "todo",
                "progress": 0,
            }
        ]

    for s in stories:
        if not isinstance(s, dict):
            continue
        story_id = str(s.get("id", "US-001"))
        path = stories_dir / f"{story_id}.md"
        write_file(path, render_story_md(s), overwrite)

    template = (
        "---\n"
        "id: US-xxx\n"
        "epic: E-xxx\n"
        "capability: C-xxx\n"
        "milestone: M-yyy\n"
        "title: <Story 标题>\n"
        "status: todo\n"
        "progress: 0\n"
        "effort: 1\n"
        "openspec_change: <change-id>\n"
        "vibe_parent_task: <vibe-parent-id>\n"
        "vibe_tasks: [<vibe-task-id-1>, <vibe-task-id-2>]\n"
        "---\n\n"
        "# US-xxx <Story 标题>\n\n"
        "## User Story\n"
        "作为：<目标用户>\n"
        "我想要：<目标能力>\n"
        "以便于：<业务价值>\n"
    )
    write_file(stories_dir / "US-xxx.md", template, overwrite)


def _to_lines(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if value in (None, ""):
        return []
    return [str(value).strip()]


def _section(title: str, items: List[str]) -> str:
    if not items:
        return ""
    lines = [f"## {title}"]
    for item in items:
        lines.append(f"- {item}")
    lines.append("")
    return "\n".join(lines)


def render_readme(data: Dict[str, Any], project_name: str, stories: List[Dict[str, Any]]) -> str:
    project = data.get("project", {}) if isinstance(data.get("project"), dict) else {}
    design_doc = project.get("design_doc", {}) if isinstance(project.get("design_doc"), dict) else {}

    summary = str(project.get("summary", "")).strip()
    doc_title = str(design_doc.get("title", "")).strip()
    doc_scope = str(design_doc.get("scope", "")).strip()
    doc_non_goals = _to_lines(design_doc.get("non_goals"))
    doc_constraints = _to_lines(design_doc.get("constraints"))
    doc_decisions = _to_lines(design_doc.get("decisions"))
    doc_api_changes = _to_lines(design_doc.get("api_changes"))
    doc_data_changes = _to_lines(design_doc.get("data_model_changes"))
    doc_runtime_rules = _to_lines(design_doc.get("runtime_rules"))
    doc_acceptance = _to_lines(design_doc.get("acceptance"))

    story_count = len([s for s in stories if isinstance(s, dict)])
    epic_count = len({str(s.get("epic", "")).strip() for s in stories if isinstance(s, dict) and str(s.get("epic", "")).strip()})
    capability_count = len(
        {str(s.get("capability", "")).strip() for s in stories if isinstance(s, dict) and str(s.get("capability", "")).strip()}
    )
    milestone_count = len(
        {
            str(m.get("id", "")).strip()
            for m in (data.get("milestones", []) if isinstance(data.get("milestones"), list) else [])
            if isinstance(m, dict) and str(m.get("id", "")).strip()
        }
    )

    parts: List[str] = []
    parts.append("# Blueprint README（文字版）")
    parts.append("")
    parts.append(f"项目：{project_name}")
    parts.append("")
    if summary:
        parts.append("## 项目概览")
        parts.append(f"- {summary}")
        parts.append("")

    parts.append("## 蓝图结构总览")
    parts.append("- `Roadmap/Blueprint Tree.md`：目录树风格主视图（Epic -> Capability -> User Story），看范围与进度。")
    parts.append("- `Roadmap/Dependencies.md`：风险依赖视图（Capability/External），看阻塞与关键路径。")
    parts.append("- `Roadmap/Milestones.md`：里程碑时间线，按版本/时间窗口看交付节奏。")
    parts.append("- `Architecture/Architecture A - Layers.md`：分层架构与模块边界。")
    parts.append("- `Architecture/Architecture B - Containers.md`：运行单元与通信关系。")
    parts.append("")
    parts.append("## 当前规模（由蓝图统计）")
    parts.append(f"- Epics: {epic_count}")
    parts.append(f"- Capabilities: {capability_count}")
    parts.append(f"- Stories: {story_count}")
    parts.append(f"- Milestones: {milestone_count}")
    parts.append("")

    if doc_title:
        parts.append("## 设计文档")
        parts.append(f"- 文档标题：{doc_title}")
        if doc_scope:
            parts.append(f"- 设计范围：{doc_scope}")
        parts.append("")

    parts.append(_section("设计约束", doc_constraints).rstrip())
    if doc_constraints:
        parts.append("")
    parts.append(_section("核心决策", doc_decisions).rstrip())
    if doc_decisions:
        parts.append("")
    parts.append(_section("接口与兼容变更", doc_api_changes).rstrip())
    if doc_api_changes:
        parts.append("")
    parts.append(_section("数据模型与迁移", doc_data_changes).rstrip())
    if doc_data_changes:
        parts.append("")
    parts.append(_section("运行时规则", doc_runtime_rules).rstrip())
    if doc_runtime_rules:
        parts.append("")
    parts.append(_section("验收与测试", doc_acceptance).rstrip())
    if doc_acceptance:
        parts.append("")
    parts.append(_section("本轮不做项", doc_non_goals).rstrip())
    if doc_non_goals:
        parts.append("")

    parts.append("## 维护规则")
    parts.append("- 节点统一写法：`编号 + 名称摘要`。")
    parts.append("- Tree 只到 User Story；Dependencies 只到 Capability/Module；Milestones 只到 Epic/Capability。")
    parts.append("- 任务/日志/测试证据放 OpenSpec 或 vibe-kanban，不回填到蓝图图节点。")
    parts.append("")

    # Remove possible empty placeholders from optional sections.
    text = "\n".join([p for p in parts if p is not None and p != ""])
    text = re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"
    return text


def main() -> None:
    parser = argparse.ArgumentParser(description="Render Blueprint V3 files from structured input.")
    parser.add_argument("--input", required=True, help="Path to blueprint input (.yaml/.yml/.json)")
    parser.add_argument("--output", required=True, help="Blueprint output directory path")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing files")
    args = parser.parse_args()

    input_path = Path(args.input).expanduser().resolve()
    output_dir = Path(args.output).expanduser().resolve()

    data = parse_input_file(input_path)
    project = data.get("project", {}) if isinstance(data.get("project"), dict) else {}
    project_name = str(project.get("name", output_dir.parent.name if output_dir.name == "blueprint" else "Project"))

    stories = to_story_list(data)
    epics = get_epics_for_tree(data, stories)

    (output_dir / "Roadmap").mkdir(parents=True, exist_ok=True)
    (output_dir / "Architecture").mkdir(parents=True, exist_ok=True)
    (output_dir / "Stories").mkdir(parents=True, exist_ok=True)

    write_file(output_dir / "README.md", render_readme(data, project_name, stories), args.overwrite)
    write_file(output_dir / "Roadmap/Blueprint Tree.md", render_blueprint_tree(epics), args.overwrite)
    write_file(output_dir / "Roadmap/Dependencies.md", render_dependencies(data), args.overwrite)
    write_file(output_dir / "Roadmap/Milestones.md", render_milestones(data), args.overwrite)
    write_file(output_dir / "Architecture/Architecture A - Layers.md", render_architecture_a(data), args.overwrite)
    write_file(output_dir / "Architecture/Architecture B - Containers.md", render_architecture_b(data), args.overwrite)
    render_stories(stories, output_dir, args.overwrite)

    print("done: blueprint rendered")
    print(f"input: {input_path}")
    print(f"output: {output_dir}")


if __name__ == "__main__":
    main()
