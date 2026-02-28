---
name: blueprint-onboard
description: Guided onboarding and execution workflow for converting design documents into Blueprint V3 files (Roadmap/Architecture/Stories) with phased narration, missing-field questioning, ID-based append/merge, and conflict resolution. Use when users ask to generate or append blueprint content from a design doc (.md/.txt path or pasted text).
---

# Blueprint Onboard

Quick start for teammates: see `USAGE.md`.

Guide users through a full, narrated Blueprint V3 cycle using `Explain -> Do -> Show -> Pause`.

## Preflight

1. Resolve blueprint root:
- If user provided a blueprint dir, use it.
- Else default to `<repo>/blueprint`.

2. Check required folders:
- `Roadmap/`
- `Architecture/`
- `Stories/`

If missing, explain the minimum fix and offer to run initialization via existing project scripts (for example `make blueprint-init`) before continuing.

## Workflow Phases

### Phase 1: Welcome
Explain what this run will do:
- ingest design document
- extract structure
- ask for missing fields (1-3 high-impact questions per round)
- draft candidate updates
- resolve conflicts
- apply merged changes
- validate result

Pause for acknowledgment.

### Phase 2: Ingest Design Doc
Support two input modes:
1. File path (`.md` / `.txt`)
2. Pasted text in conversation

Read and summarize:
- recognized Epics / Capabilities / Stories
- dependencies
- milestones
- architecture layers and containers

Show recognized summary and missing summary.

### Phase 3: Gap Questions
Ask missing fields in priority order:
1. Story minimum fields: `id`, `capability`, `milestone`, `title`
2. Capability dependency data: `depends_on`
3. Milestone window and DoD
4. Architecture A/B minimum nodes and edges

Rules:
- Ask 1-3 questions per round.
- Provide recommended options.
- If user skips, apply recommended defaults and mark as assumptions.

### Phase 4: Draft Candidate
Build a structured candidate payload (YAML/JSON object) and show:
- entities to create
- entities to update
- possible conflicts

Pause for confirmation.

### Phase 5: Conflict Resolution
When ID-level conflicts exist, present each conflict with:
- entity type + ID + field
- old value
- new value
- recommendation

Ask user to choose:
- keep old
- use new
- provide manual value

### Phase 6: Apply Merge
Use `scripts/apply_blueprint_merge.py`.

Example:

```bash
python3 scripts/apply_blueprint_merge.py \
  --input /tmp/candidate.yaml \
  --blueprint-dir /path/to/blueprint \
  --mode append \
  --on-conflict prompt
```

If unresolved conflicts remain (`status=needs_resolution`), collect resolutions and rerun with:

```bash
python3 scripts/apply_blueprint_merge.py \
  --input /tmp/candidate.yaml \
  --blueprint-dir /path/to/blueprint \
  --mode append \
  --on-conflict prompt \
  --resolutions /tmp/resolutions.json
```

### Phase 7: Verify
Run:

```bash
python3 scripts/validate_blueprint.py --blueprint-dir /path/to/blueprint
```

Must validate:
- Tree: `flowchart LR`（目录树风格）
- Dependencies: `flowchart LR`
- Milestones: `gantt`
- Architecture A: `flowchart + subgraph`
- Architecture B: `flowchart LR`
- Stories frontmatter required fields (`id`, `capability`, `milestone`)
- Node labels should follow `ID + 名称摘要`

### Phase 8: Recap
Show:
- updated files
- created/updated/unchanged entity counts
- conflicts resolved
- assumptions used
- suggested next input improvements

## Merge & File Management Rules

Use references and scripts:
- `references/merge-rules.md`
- `scripts/apply_blueprint_merge.py`

Key behavior:
- merge by ID (`E-*`, `C-*`, `US-*`, `M-*`, `EXT-*`)
- preserve manual edits using managed blocks:
  - `AUTO` block rewritten by tool
  - `MANUAL` block preserved
- first migration of unmanaged file:
  - previous full content moved into MANUAL block
  - generated content written into AUTO block

## Design Doc Extraction Hints

Use:
- `references/design-doc-patterns.md`

Extract aggressively from headings, bullets, and acceptance criteria; keep IDs stable and normalize if missing.

## References
- Phase playbook: `references/phases.md`
- Missing-data prompts: `references/question-playbook.md`
- Merge rules: `references/merge-rules.md`
- Design doc extraction: `references/design-doc-patterns.md`

## Graceful Exit

If user pauses mid-run:
- summarize current phase
- persist candidate/resolution artifacts paths (if created)
- provide exact command/step to resume

## Quick Commands (Project Usage)

For day-to-day updates after onboarding, use:

```bash
# 0) 新项目先建立/修复 blueprint 软链接（建议先 --dry-run）
bash skills/blueprint-onboard/scripts/setup_blueprint_symlink.sh --dry-run
bash skills/blueprint-onboard/scripts/setup_blueprint_symlink.sh

# 1) 标记某个 Story 完成（status=done, progress=100）
python3 skills/blueprint-onboard/scripts/blueprint_cli.py story-done --id US-202

# 2) 更新 Story 进度
python3 skills/blueprint-onboard/scripts/blueprint_cli.py story-update --id US-202 --status doing --progress 60

# 3) 校验蓝图
python3 skills/blueprint-onboard/scripts/blueprint_cli.py validate
```

Notes:
- 默认 `--blueprint-dir` 为当前目录下 `./blueprint`。
- `story-update` 默认冲突策略是 `keep_old`（仅更新显式传入字段）。
