#!/usr/bin/env python3
"""
Apply Blueprint merge with managed AUTO/MANUAL markdown blocks.

Usage:
  python3 apply_blueprint_merge.py \
    --input /tmp/candidate.yaml \
    --blueprint-dir /path/to/blueprint \
    --mode append \
    --on-conflict prompt \
    [--resolutions /tmp/resolutions.json] \
    [--dry-run]
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import tempfile
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List, Tuple

AUTO_START = "<!-- AUTO:START -->"
AUTO_END = "<!-- AUTO:END -->"
MANUAL_START = "<!-- MANUAL:START -->"
MANUAL_END = "<!-- MANUAL:END -->"
MODEL_START = "<!-- AUTO:MODEL:BEGIN -->"
MODEL_END = "<!-- AUTO:MODEL:END -->"


def normalize_scalar_types(value: Any) -> Any:
    if isinstance(value, (dt.date, dt.datetime)):
        return value.isoformat()
    if isinstance(value, list):
        return [normalize_scalar_types(v) for v in value]
    if isinstance(value, dict):
        return {str(k): normalize_scalar_types(v) for k, v in value.items()}
    return value


def dumps_json(data: Any) -> str:
    def _default(o: Any) -> Any:
        if isinstance(o, (dt.date, dt.datetime)):
            return o.isoformat()
        return str(o)

    return json.dumps(data, ensure_ascii=False, indent=2, default=_default)


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
                "YAML input requires pyyaml. Install: python3 -m pip install --user pyyaml"
            ) from exc
        data = yaml.safe_load(raw)
    if not isinstance(data, dict):
        raise ValueError("Input root must be object/map")
    return normalize_scalar_types(data)


def dump_yaml(path: Path, data: Dict[str, Any]) -> None:
    try:
        import yaml  # type: ignore
    except Exception as exc:
        raise RuntimeError(
            "YAML output requires pyyaml. Install: python3 -m pip install --user pyyaml"
        ) from exc
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def parse_managed_sections(text: str) -> Tuple[str, str] | None:
    pattern = re.compile(
        re.escape(AUTO_START)
        + r"\n?(.*?)\n?"
        + re.escape(AUTO_END)
        + r"\n*"
        + re.escape(MANUAL_START)
        + r"\n?(.*?)\n?"
        + re.escape(MANUAL_END),
        re.DOTALL,
    )
    m = pattern.search(text)
    if not m:
        return None
    return m.group(1).strip(), m.group(2).strip()


def compose_managed(auto_content: str, manual_content: str) -> str:
    auto = auto_content.strip()
    manual = manual_content.strip()
    return (
        f"{AUTO_START}\n"
        f"{auto}\n"
        f"{AUTO_END}\n\n"
        f"{MANUAL_START}\n"
        f"{manual}\n"
        f"{MANUAL_END}\n"
    )


def extract_auto_content(text: str) -> str:
    parsed = parse_managed_sections(text)
    if parsed:
        return parsed[0].strip()
    return text.strip()


def read_auto_markdown(path: Path) -> str:
    if not path.exists():
        return ""
    return extract_auto_content(path.read_text(encoding="utf-8"))


def extract_mermaid_block(md: str) -> str:
    m = re.search(r"```mermaid\n(.*?)```", md, re.DOTALL)
    if not m:
        return ""
    return m.group(1).strip()


def parse_node_label(label: str) -> Tuple[str, str]:
    m = re.match(r"^([A-Z]+-\d+)\s+(.+)$", label.strip())
    if not m:
        return "", label.strip()
    return m.group(1).strip(), m.group(2).strip()


def extract_model_from_auto(auto_content: str) -> Dict[str, Any] | None:
    pattern = re.compile(re.escape(MODEL_START) + r"\n?(.*?)\n?" + re.escape(MODEL_END), re.DOTALL)
    m = pattern.search(auto_content)
    if not m:
        return None
    raw = m.group(1).strip()
    try:
        data = json.loads(raw)
    except Exception:
        return None
    if isinstance(data, dict):
        return data
    return None


def strip_model_comments(auto_content: str) -> str:
    pattern = re.compile(re.escape(MODEL_START) + r".*?" + re.escape(MODEL_END), re.DOTALL)
    return pattern.sub("", auto_content).strip()


def parse_story_frontmatter(path: Path) -> Dict[str, Any] | None:
    if not path.exists():
        return None
    raw = extract_auto_content(path.read_text(encoding="utf-8"))
    m = re.match(r"^---\n(.*?)\n---\n", raw, re.DOTALL)
    if not m:
        return None
    try:
        import yaml  # type: ignore
        data = yaml.safe_load(m.group(1))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def parse_dependencies_model(path: Path) -> Dict[str, Any]:
    block = extract_mermaid_block(read_auto_markdown(path))
    deps: Dict[str, Any] = {"capabilities": [], "externals": [], "edges": []}
    if not block:
        return deps

    safe_to_real: Dict[str, str] = {}
    capabilities: Dict[str, Dict[str, Any]] = {}
    externals: Dict[str, Dict[str, Any]] = {}

    for raw in block.splitlines():
        line = raw.strip()
        m = re.match(r'^([A-Za-z0-9_]+)\["([^"]+)"\]:::(normal|risk|ext)\s*$', line)
        if not m:
            continue
        safe_id, label, cls = m.group(1), m.group(2), m.group(3)
        real_id, title = parse_node_label(label)
        if not real_id:
            continue
        blocked_reason = ""
        b = re.match(r"^(.*)\s+\[blocked:\s*(.+)\]$", title)
        if b:
            title = b.group(1).strip()
            blocked_reason = b.group(2).strip()
        safe_to_real[safe_id] = real_id
        if cls == "ext" or real_id.startswith("EXT-"):
            externals[real_id] = {"id": real_id, "title": title}
        else:
            cap = {"id": real_id, "title": title, "depends_on": []}
            if cls == "risk" and blocked_reason:
                cap["status"] = "blocked"
                cap["blocked_reason"] = blocked_reason
            capabilities[real_id] = cap

    edge_seen = set()
    for raw in block.splitlines():
        line = raw.strip()
        m = re.match(r'^([A-Za-z0-9_]+)\s+-->(?:\|"([^"]*)"\|)?\s+([A-Za-z0-9_]+)\s*$', line)
        if not m:
            continue
        from_safe, reason, to_safe = m.group(1), (m.group(2) or "").strip(), m.group(3)
        from_id = safe_to_real.get(from_safe, from_safe)
        to_id = safe_to_real.get(to_safe, to_safe)
        key = (from_id, to_id, reason)
        if key in edge_seen:
            continue
        edge_seen.add(key)
        deps["edges"].append({"from": from_id, "to": to_id, "reason": reason})

        if to_id.startswith("C-") and (from_id.startswith("C-") or from_id.startswith("EXT-")):
            cap = capabilities.get(to_id)
            if cap is None:
                cap = {"id": to_id, "title": to_id, "depends_on": []}
                capabilities[to_id] = cap
            dep_obj = {"id": from_id}
            if reason:
                dep_obj["reason"] = reason
            exists = any(
                isinstance(d, dict) and d.get("id") == dep_obj["id"] and d.get("reason", "") == dep_obj.get("reason", "")
                for d in cap.get("depends_on", [])
            )
            if not exists:
                cap.setdefault("depends_on", []).append(dep_obj)

    deps["capabilities"] = [capabilities[k] for k in sorted(capabilities.keys())]
    deps["externals"] = [externals[k] for k in sorted(externals.keys())]
    return deps


def parse_milestones_model(path: Path) -> List[Dict[str, Any]]:
    auto = read_auto_markdown(path)
    block = extract_mermaid_block(auto)
    if not block:
        return []

    by_id: Dict[str, Dict[str, Any]] = {}
    current_id = ""

    for raw in block.splitlines():
        line = raw.strip()
        if not line or line in {"gantt"} or line.startswith("title ") or line.startswith("dateFormat ") or line.startswith("axisFormat "):
            continue

        m_section = re.match(r"^section\s+(M-[^\s]+)\s+(.+)$", line)
        if m_section:
            current_id = m_section.group(1).strip()
            by_id.setdefault(current_id, {"id": current_id, "title": m_section.group(2).strip(), "items": []})
            continue

        m_checkpoint = re.match(r"^(.+?)\s+:milestone,\s*([A-Za-z0-9_]+),\s*(\d{4}-\d{2}-\d{2}),\s*1d$", line)
        if m_checkpoint and current_id:
            by_id[current_id]["checkpoint"] = {"title": m_checkpoint.group(1).strip(), "date": m_checkpoint.group(3).strip()}
            continue

        m_item = re.match(r"^(.+?)\s+:(?:(active|done|crit),\s*)?([A-Za-z0-9_]+),\s*(\d{4}-\d{2}-\d{2}),\s*(\d{4}-\d{2}-\d{2})$", line)
        if m_item and current_id:
            label = m_item.group(1).strip()
            status_token = (m_item.group(2) or "").strip()
            start = m_item.group(4).strip()
            end = m_item.group(5).strip()
            item_id, item_title = parse_node_label(label)
            if not item_id:
                item_id = label
                item_title = label
            status_map = {"active": "doing", "done": "done", "crit": "blocked"}
            item: Dict[str, Any] = {"id": item_id, "title": item_title, "start": start, "end": end}
            if status_token in status_map:
                item["status"] = status_map[status_token]
            by_id[current_id].setdefault("items", []).append(item)

    # Parse supplemental markdown table rows for window/scope/dod.
    for raw in auto.splitlines():
        line = raw.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 5:
            continue
        if cells[0] == "milestone" or set(cells[0]) == {"-"}:
            continue
        if not cells[0].startswith("M-"):
            continue
        milestone_id = cells[0]
        milestone = by_id.setdefault(milestone_id, {"id": milestone_id, "title": cells[1], "items": []})
        milestone["title"] = cells[1]
        if "~" in cells[2]:
            w = re.match(r"^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$", cells[2])
            if w:
                milestone["start"] = w.group(1)
                milestone["end"] = w.group(2)
        scope = [x.strip() for x in cells[3].split(",") if x.strip()]
        if scope:
            milestone["scope"] = scope
        if cells[4]:
            milestone["dod"] = cells[4]

    return [by_id[k] for k in sorted(by_id.keys())]


def parse_arch_subgraph(path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    block = extract_mermaid_block(read_auto_markdown(path))
    if not block:
        return [], []

    groups: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    current: Dict[str, Any] | None = None

    for raw in block.splitlines():
        line = raw.strip()
        if not line or line.startswith("flowchart "):
            continue

        m_sub = re.match(r'^subgraph\s+([A-Za-z0-9_]+)\["([^"]+)"\]\s*$', line)
        if m_sub:
            current = {"id": m_sub.group(1).strip(), "title": m_sub.group(2).strip(), "nodes": []}
            groups.append(current)
            continue

        if line == "end":
            current = None
            continue

        m_edge = re.match(r'^([A-Za-z0-9_]+)\s+-->(?:\|"([^"]*)"\|)?\s+([A-Za-z0-9_]+)\s*$', line)
        if m_edge:
            edge: Dict[str, Any] = {"from": m_edge.group(1), "to": m_edge.group(3)}
            label = (m_edge.group(2) or "").strip()
            if label:
                edge["label"] = label
            edges.append(edge)
            continue

        if current is not None:
            m_node = re.match(r'^([A-Za-z0-9_]+)\["([^"]+)"\]\s*$', line)
            if m_node:
                node_id = m_node.group(1).strip()
                label = m_node.group(2).strip()
                if label.startswith(f"{node_id} "):
                    label = label[len(node_id) + 1 :].strip()
                current["nodes"].append({"id": node_id, "title": label})

    return groups, edges


def build_existing_model(blueprint_dir: Path) -> Dict[str, Any]:
    model: Dict[str, Any] = {
        "project": {"name": blueprint_dir.parent.name},
        "stories": [],
        "dependencies": {"capabilities": [], "externals": [], "edges": []},
        "milestones": [],
        "architecture": {},
    }

    readme = blueprint_dir / "README.md"
    if readme.exists():
        text = readme.read_text(encoding="utf-8")
        parsed = parse_managed_sections(text)
        if parsed:
            auto, _ = parsed
            embedded = extract_model_from_auto(auto)
            if embedded:
                return embedded
            m_name = re.search(r"^项目：(.+)$", auto, re.MULTILINE)
            if m_name:
                model["project"]["name"] = m_name.group(1).strip()
        else:
            m_name = re.search(r"^项目：(.+)$", text, re.MULTILINE)
            if m_name:
                model["project"]["name"] = m_name.group(1).strip()

    stories_dir = blueprint_dir / "Stories"
    if stories_dir.exists():
        for p in sorted(stories_dir.glob("US-*.md")):
            if p.name == "US-xxx.md":
                continue
            fm = parse_story_frontmatter(p)
            if fm:
                model["stories"].append(fm)

    model["dependencies"] = parse_dependencies_model(blueprint_dir / "Roadmap" / "Dependencies.md")
    model["milestones"] = parse_milestones_model(blueprint_dir / "Roadmap" / "Milestones.md")

    arch_layers, arch_layer_edges = parse_arch_subgraph(
        blueprint_dir / "Architecture" / "Architecture A - Layers.md"
    )
    arch_boundaries, arch_edges = parse_arch_subgraph(
        blueprint_dir / "Architecture" / "Architecture B - Containers.md"
    )
    model["architecture"] = {
        "layers": arch_layers,
        "layer_edges": arch_layer_edges,
        "containers": {
            "boundaries": arch_boundaries,
            "edges": arch_edges,
        },
    }

    return model


def normalize_model(model: Dict[str, Any]) -> Dict[str, Any]:
    out = deepcopy(model)
    out.setdefault("project", {})
    if not isinstance(out["project"], dict):
        out["project"] = {}
    out.setdefault("stories", [])
    out.setdefault("dependencies", {"capabilities": [], "externals": [], "edges": []})
    if not isinstance(out["dependencies"], dict):
        out["dependencies"] = {"capabilities": [], "externals": [], "edges": []}
    out["dependencies"].setdefault("capabilities", [])
    out["dependencies"].setdefault("externals", [])
    out["dependencies"].setdefault("edges", [])
    out.setdefault("milestones", [])
    out.setdefault("architecture", {})
    if not isinstance(out["architecture"], dict):
        out["architecture"] = {}
    return out


def parse_resolutions(path: Path | None) -> Dict[str, Any]:
    if path is None:
        return {}
    if not path.exists():
        raise FileNotFoundError(f"resolutions file not found: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("resolutions file must be a JSON object")
    return data


def conflict_key(entity_type: str, entity_id: str, field: str) -> str:
    return f"{entity_type}:{entity_id}:{field}"


def apply_resolution(
    *,
    key: str,
    old_value: Any,
    new_value: Any,
    resolution: Any,
    on_conflict: str,
) -> Tuple[Any, str, bool]:
    """Returns: (chosen_value, action_label, resolved)."""
    if isinstance(resolution, str):
        action = resolution
        if action == "keep_old":
            return old_value, action, True
        if action == "use_new":
            return new_value, action, True
    elif isinstance(resolution, dict):
        action = str(resolution.get("action", "")).strip()
        if action == "manual":
            return resolution.get("value"), action, True
        if action == "keep_old":
            return old_value, action, True
        if action == "use_new":
            return new_value, action, True

    if on_conflict == "keep_old":
        return old_value, "keep_old(default)", True
    if on_conflict == "use_new":
        return new_value, "use_new(default)", True
    return old_value, "unresolved", False


def merge_list_by_id(
    *,
    entity_type: str,
    existing: List[Dict[str, Any]],
    incoming: List[Dict[str, Any]],
    id_field: str,
    conflict_fields: List[str],
    on_conflict: str,
    resolutions: Dict[str, Any],
    report: Dict[str, Any],
) -> List[Dict[str, Any]]:
    table: Dict[str, Dict[str, Any]] = {}
    for item in existing:
        if not isinstance(item, dict):
            continue
        entity_id = str(item.get(id_field, "")).strip()
        if entity_id:
            table[entity_id] = deepcopy(item)

    for inc in incoming:
        if not isinstance(inc, dict):
            continue
        entity_id = str(inc.get(id_field, "")).strip()
        if not entity_id:
            report["warnings"].append(f"{entity_type}: skipped item without {id_field}")
            continue

        if entity_id not in table:
            table[entity_id] = deepcopy(inc)
            report["created"].append(f"{entity_type}:{entity_id}")
            continue

        cur = deepcopy(table[entity_id])
        changed = False
        for field, new_value in inc.items():
            if field == id_field:
                continue
            old_value = cur.get(field)
            if old_value == new_value:
                continue

            if field in conflict_fields and old_value not in (None, "", [], {}):
                key = conflict_key(entity_type, entity_id, field)
                chosen, action, resolved = apply_resolution(
                    key=key,
                    old_value=old_value,
                    new_value=new_value,
                    resolution=resolutions.get(key),
                    on_conflict=on_conflict,
                )
                conflict_obj = {
                    "entity_type": entity_type,
                    "id": entity_id,
                    "field": field,
                    "old_value": old_value,
                    "new_value": new_value,
                    "recommendation": "use_new",
                    "key": key,
                    "action": action,
                    "resolved": resolved,
                }
                report["conflicts"].append(conflict_obj)
                if resolved:
                    report["conflicts_resolved"].append(conflict_obj)
                else:
                    report["conflicts_unresolved"].append(conflict_obj)
                if chosen != old_value:
                    cur[field] = chosen
                    changed = True
            else:
                cur[field] = new_value
                changed = True

        table[entity_id] = cur
        if changed:
            report["updated"].append(f"{entity_type}:{entity_id}")
        else:
            report["unchanged"].append(f"{entity_type}:{entity_id}")

    return list(table.values())


def merge_model(
    existing: Dict[str, Any],
    incoming: Dict[str, Any],
    mode: str,
    on_conflict: str,
    resolutions: Dict[str, Any],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    report: Dict[str, Any] = {
        "status": "ok",
        "created": [],
        "updated": [],
        "unchanged": [],
        "conflicts": [],
        "conflicts_resolved": [],
        "conflicts_unresolved": [],
        "warnings": [],
    }

    ex = normalize_model(existing)
    inc = normalize_model(incoming)

    if mode == "generate":
        merged = inc
    else:
        merged = deepcopy(ex)

        # project metadata (soft update)
        in_project = inc.get("project", {}) if isinstance(inc.get("project"), dict) else {}
        ex_project = merged.get("project", {}) if isinstance(merged.get("project"), dict) else {}
        ex_project.update({k: v for k, v in in_project.items() if v not in (None, "")})
        merged["project"] = ex_project

        incoming_stories_raw = inc.get("stories", [])
        incoming_stories: List[Dict[str, Any]] = []
        existing_story_ids = {
            str(s.get("id", "")).strip()
            for s in ex.get("stories", [])
            if isinstance(s, dict) and str(s.get("id", "")).strip()
        }
        if isinstance(incoming_stories_raw, list):
            for s in incoming_stories_raw:
                if not isinstance(s, dict):
                    continue
                sid = str(s.get("id", "")).strip()
                if not sid:
                    report["warnings"].append("story: skipped item without id")
                    continue
                st = deepcopy(s)
                # For new stories we need minimum fields; for existing stories allow patch updates
                # like only status/progress without forcing fallback values.
                if sid not in existing_story_ids:
                    if not st.get("capability"):
                        st["capability"] = "C-unknown"
                        report["warnings"].append(f"story:{sid} missing capability -> default C-unknown")
                    if not st.get("milestone"):
                        st["milestone"] = "M-yyy"
                        report["warnings"].append(f"story:{sid} missing milestone -> default M-yyy")
                    if not st.get("title"):
                        st["title"] = f"Story {sid}"
                        report["warnings"].append(f"story:{sid} missing title -> default generated title")
                incoming_stories.append(st)

        merged["stories"] = merge_list_by_id(
            entity_type="story",
            existing=ex.get("stories", []),
            incoming=incoming_stories,
            id_field="id",
            conflict_fields=["title", "capability", "milestone", "epic"],
            on_conflict=on_conflict,
            resolutions=resolutions,
            report=report,
        )

        ex_deps = ex.get("dependencies", {}) if isinstance(ex.get("dependencies"), dict) else {}
        in_deps = inc.get("dependencies", {}) if isinstance(inc.get("dependencies"), dict) else {}
        merged_deps: Dict[str, Any] = {}

        merged_deps["capabilities"] = merge_list_by_id(
            entity_type="capability",
            existing=ex_deps.get("capabilities", []),
            incoming=in_deps.get("capabilities", []),
            id_field="id",
            conflict_fields=["title", "status", "blocked_reason"],
            on_conflict=on_conflict,
            resolutions=resolutions,
            report=report,
        )
        merged_deps["externals"] = merge_list_by_id(
            entity_type="external",
            existing=ex_deps.get("externals", []),
            incoming=in_deps.get("externals", []),
            id_field="id",
            conflict_fields=["title"],
            on_conflict=on_conflict,
            resolutions=resolutions,
            report=report,
        )

        # Edge union
        edges = []
        seen_edges = set()
        for source in [ex_deps.get("edges", []), in_deps.get("edges", [])]:
            if not isinstance(source, list):
                continue
            for edge in source:
                if not isinstance(edge, dict):
                    continue
                key = (
                    str(edge.get("from", "")),
                    str(edge.get("to", "")),
                    str(edge.get("reason", "")),
                    str(edge.get("label", "")),
                )
                if key in seen_edges:
                    continue
                seen_edges.add(key)
                edges.append(edge)
        merged_deps["edges"] = edges
        merged["dependencies"] = merged_deps

        merged["milestones"] = merge_list_by_id(
            entity_type="milestone",
            existing=ex.get("milestones", []),
            incoming=inc.get("milestones", []),
            id_field="id",
            conflict_fields=["title", "start", "end", "dod"],
            on_conflict=on_conflict,
            resolutions=resolutions,
            report=report,
        )

        # Architecture: if incoming has details, merge simple by top-level sections
        ex_arch = ex.get("architecture", {}) if isinstance(ex.get("architecture"), dict) else {}
        in_arch = inc.get("architecture", {}) if isinstance(inc.get("architecture"), dict) else {}
        arch = deepcopy(ex_arch)
        for k, v in in_arch.items():
            if v in (None, "", [], {}):
                continue
            if isinstance(v, list) and isinstance(arch.get(k), list):
                if k in {"layers", "boundaries"}:
                    arch[k] = merge_list_by_id(
                        entity_type=f"architecture_{k[:-1]}",
                        existing=arch.get(k, []),
                        incoming=v,
                        id_field="id",
                        conflict_fields=["title"],
                        on_conflict=on_conflict,
                        resolutions=resolutions,
                        report=report,
                    )
                else:
                    # union for edge lists
                    merged_list = []
                    seen = set()
                    for item in arch.get(k, []) + v:
                        key = json.dumps(item, sort_keys=True, ensure_ascii=False)
                        if key in seen:
                            continue
                        seen.add(key)
                        merged_list.append(item)
                    arch[k] = merged_list
            else:
                arch[k] = v
        merged["architecture"] = arch

    # unresolved conflicts gate
    if report["conflicts_unresolved"]:
        report["status"] = "needs_resolution"

    return merged, report


def locate_render_script() -> Path:
    render_path = Path(__file__).resolve().parent / "render_blueprint.py"
    if not render_path.exists():
        raise FileNotFoundError(f"render script not found: {render_path}")
    return render_path


def render_to_temp(model: Dict[str, Any]) -> Path:
    tmp_dir = Path(tempfile.mkdtemp(prefix="blueprint_onboard_render_"))
    input_path = tmp_dir / "merged-model.yaml"
    dump_yaml(input_path, model)

    render_script = locate_render_script()
    cmd = [
        "python3",
        str(render_script),
        "--input",
        str(input_path),
        "--output",
        str(tmp_dir / "out"),
        "--overwrite",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"render failed:\n{result.stdout}\n{result.stderr}")
    return tmp_dir / "out"


def apply_managed_files(
    blueprint_dir: Path,
    generated_root: Path,
    mode: str,
    dry_run: bool,
) -> List[str]:
    expected = [
        "README.md",
        "Roadmap/Blueprint Tree.md",
        "Roadmap/Dependencies.md",
        "Roadmap/Milestones.md",
        "Architecture/Architecture A - Layers.md",
        "Architecture/Architecture B - Containers.md",
        "Stories/README.md",
    ]

    # plus all story files produced by renderer
    story_files = sorted((generated_root / "Stories").glob("US-*.md"))
    for sf in story_files:
        expected.append(f"Stories/{sf.name}")

    written: List[str] = []

    for rel in expected:
        src = generated_root / rel
        if not src.exists():
            continue
        auto_content = src.read_text(encoding="utf-8")

        dst = blueprint_dir / rel
        if dst.exists():
            existing_text = dst.read_text(encoding="utf-8")
            parsed = parse_managed_sections(existing_text)
            if parsed:
                _, manual_existing = parsed
                # In generate mode, keep output strictly aligned with the new design input.
                # Avoid rendering duplicate demo/manual diagrams.
                manual = manual_existing if (mode != "generate" and rel == "README.md") else ""
            else:
                # For unmanaged legacy files, don't migrate whole previous content into MANUAL
                # during generation, otherwise old demo diagrams will render as duplicates.
                manual = existing_text.strip() if mode == "append" else ""
        else:
            manual = ""

        final_text = compose_managed(auto_content, manual)
        if not dry_run:
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(final_text, encoding="utf-8")
        written.append(str(dst))

    return written


def prune_stale_story_files(
    blueprint_dir: Path,
    generated_root: Path,
    dry_run: bool,
) -> List[str]:
    stories_dir = blueprint_dir / "Stories"
    if not stories_dir.exists():
        return []

    keep = {p.name for p in (generated_root / "Stories").glob("US-*.md")}
    removed: List[str] = []
    for p in stories_dir.glob("US-*.md"):
        if p.name in keep:
            continue
        if not dry_run:
            p.unlink(missing_ok=True)
        removed.append(str(p))
    return removed


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply Blueprint merge with managed AUTO/MANUAL blocks")
    parser.add_argument("--input", required=True, help="candidate yaml/json file")
    parser.add_argument("--blueprint-dir", required=True, help="target blueprint directory")
    parser.add_argument("--mode", choices=["generate", "append"], default="append")
    parser.add_argument("--on-conflict", choices=["prompt", "keep_old", "use_new"], default="prompt")
    parser.add_argument("--resolutions", help="json file mapping conflict key to resolution")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    input_path = Path(args.input).expanduser().resolve()
    blueprint_dir = Path(args.blueprint_dir).expanduser().resolve()
    resolutions = parse_resolutions(Path(args.resolutions).expanduser().resolve()) if args.resolutions else {}

    incoming = parse_input_file(input_path)
    existing = build_existing_model(blueprint_dir)

    merged_model, report = merge_model(
        existing=existing,
        incoming=incoming,
        mode=args.mode,
        on_conflict=args.on_conflict,
        resolutions=resolutions,
    )

    if report["status"] == "needs_resolution":
        out = {
            "status": "needs_resolution",
            "conflicts": report["conflicts_unresolved"],
            "report": report,
        }
        print(dumps_json(out))
        raise SystemExit(2)

    generated_root = render_to_temp(merged_model)
    written = apply_managed_files(
        blueprint_dir=blueprint_dir,
        generated_root=generated_root,
        mode=args.mode,
        dry_run=args.dry_run,
    )
    removed_files = prune_stale_story_files(
        blueprint_dir=blueprint_dir,
        generated_root=generated_root,
        dry_run=args.dry_run,
    )

    out = {
        "status": "ok",
        "dry_run": args.dry_run,
        "mode": args.mode,
        "report": report,
        "written_files": written,
        "removed_files": removed_files,
    }
    print(dumps_json(out))


if __name__ == "__main__":
    main()
