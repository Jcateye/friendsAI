## Why

On February 19, 2026, several completed changes were archived with partial or skipped spec sync.  
Main causes were invalid delta spec operation syntax and one `MODIFIED` requirement header mismatch.

Without this backfill, main OpenSpec capability specs are incomplete and drift from already archived implementation work.

## What Changes

- Add a spec-only backfill change to restore main spec sync for 5 capabilities:
  - `agent-chat-sse`
  - `network-action-agent`
  - `title-summary-agent`
  - `contact-insight-agent`
  - `archive-brief-agent`
- Re-express capability deltas using valid operation blocks:
  - `## ADDED Requirements`
  - (no invalid full-spec layout in delta files)
- Replace the previous problematic `MODIFIED` flow in `agent-chat-sse` with a valid additive requirement.

## Non-Goals

- No production code changes.
- No behavior changes in APIs/runtime.
- No retroactive rewriting of archived change history; this change only backfills canonical main specs.
