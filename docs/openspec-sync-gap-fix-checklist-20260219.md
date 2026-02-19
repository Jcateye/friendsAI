# OpenSpec Sync Gap Fix Checklist (2026-02-19)

## Scope

This checklist covers archived changes that were completed on tasks but archived with `--skip-specs` (or partially failed spec sync) on February 19, 2026.

## Current State Snapshot (2026-02-19)

Archived with spec-sync gaps:

1. `openclaw-agent-engine-router-foundation`
2. `agent-capability-network-action`
3. `agent-capability-title-summary`
4. `agent-capability-contact-insight`
5. `agent-capability-archive-brief`

## Gap Matrix

| Change | Archive Result | Root Cause | Required Fix |
|---|---|---|---|
| `openclaw-agent-engine-router-foundation` | Archived with `--skip-specs` after sync error | `MODIFIED` requirement header in delta spec does not match existing requirement header in main spec | Convert to valid `MODIFIED` target (exact header match) or use `ADDED` requirement |
| `agent-capability-network-action` | Archived with `--skip-specs` | Delta spec uses full main-spec layout (`#`, `## Purpose`, `## Requirements`) instead of OpenSpec delta operations | Rewrite as `## ADDED Requirements` format |
| `agent-capability-title-summary` | Archived with `--skip-specs` | Same as above | Rewrite as `## ADDED Requirements` format |
| `agent-capability-contact-insight` | Archived with `--skip-specs` | Same as above | Rewrite as `## ADDED Requirements` format |
| `agent-capability-archive-brief` | Archived with `--skip-specs` | Same as above | Rewrite as `## ADDED Requirements` format |

## Detailed Findings

### 1) `openclaw-agent-engine-router-foundation`

- Archived change path:
  - `/Users/haoqi/OnePersonCompany/friendsAI/openspec/changes/archive/2026-02-19-openclaw-agent-engine-router-foundation`
- Failing delta file:
  - `/Users/haoqi/OnePersonCompany/friendsAI/openspec/changes/archive/2026-02-19-openclaw-agent-engine-router-foundation/specs/agent-chat-sse/spec.md`
- Main spec target:
  - `/Users/haoqi/OnePersonCompany/friendsAI/openspec/specs/agent-chat-sse/spec.md`
- Sync error seen during archive:
  - `MODIFIED failed for header ... not found`

Reason:
- Delta file uses `## MODIFIED Requirements` with a requirement title that does not exactly match an existing title in main spec.

Fix:
1. Create a follow-up active change (recommended) for spec backfill.
2. In follow-up delta spec for `agent-chat-sse`, either:
   - `MODIFY` an existing exact requirement header (for example `CHAT-030 Agent chat streams SSE events`), or
   - use `## ADDED Requirements` and add a new requirement instead of modifying.

### 2) `agent-capability-*` four changes

Archived change paths:
- `/Users/haoqi/OnePersonCompany/friendsAI/openspec/changes/archive/2026-02-19-agent-capability-network-action`
- `/Users/haoqi/OnePersonCompany/friendsAI/openspec/changes/archive/2026-02-19-agent-capability-title-summary`
- `/Users/haoqi/OnePersonCompany/friendsAI/openspec/changes/archive/2026-02-19-agent-capability-contact-insight`
- `/Users/haoqi/OnePersonCompany/friendsAI/openspec/changes/archive/2026-02-19-agent-capability-archive-brief`

Sync error seen during archive:
- `Delta parsing found no operations`

Reason:
- These files are written as full capability specs (main spec format), not delta specs. OpenSpec sync expects operation blocks:
  - `## ADDED Requirements`
  - `## MODIFIED Requirements`
  - `## REMOVED Requirements`
  - `## RENAMED Requirements`

Fix:
1. Create a follow-up active change for spec backfill.
2. Recreate each capability delta using valid operation sections.
3. Archive the follow-up change without `--skip-specs` so main specs are generated.

## Delta Template (copyable)

```md
## ADDED Requirements

### Requirement: <ID and title>
<Normative statement with MUST/SHALL/SHOULD>

#### Scenario: <scenario name>
- **GIVEN** ...
- **WHEN** ...
- **THEN** ...
```

For modifications:

```md
## MODIFIED Requirements

### Requirement: <exact existing requirement header in main spec>
<Updated normative statement>

#### Scenario: <scenario name>
- **GIVEN** ...
- **WHEN** ...
- **THEN** ...
```

## Recommended Execution Plan

1. Create one backfill change, e.g. `openspec-spec-sync-backfill-20260219`.
2. Add 5 delta specs under that change:
   - `agent-chat-sse` (fix `MODIFIED` header match or convert to `ADDED`)
   - `network-action-agent` (`ADDED`)
   - `title-summary-agent` (`ADDED`)
   - `contact-insight-agent` (`ADDED`)
   - `archive-brief-agent` (`ADDED`)
3. Run strict validation:
   - `openspec validate openspec-spec-sync-backfill-20260219 --strict`
4. Archive normally (no `--skip-specs`):
   - `openspec archive openspec-spec-sync-backfill-20260219 -y`
5. Verify main specs now exist / updated:
   - `/Users/haoqi/OnePersonCompany/friendsAI/openspec/specs/agent-chat-sse/spec.md`
   - `/Users/haoqi/OnePersonCompany/friendsAI/openspec/specs/network-action-agent/spec.md`
   - `/Users/haoqi/OnePersonCompany/friendsAI/openspec/specs/title-summary-agent/spec.md`
   - `/Users/haoqi/OnePersonCompany/friendsAI/openspec/specs/contact-insight-agent/spec.md`
   - `/Users/haoqi/OnePersonCompany/friendsAI/openspec/specs/archive-brief-agent/spec.md`

## Acceptance Checklist

- [ ] Backfill change created and scoped to spec-sync only
- [ ] 5 delta specs rewritten in valid operation format
- [ ] `openspec validate ... --strict` passes
- [ ] Archive runs without `--skip-specs`
- [ ] All 5 target main specs are present and reviewable
- [ ] No active change remains in `complete` state without corresponding main-spec sync
