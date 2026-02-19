## Context

Archived change directories under `openspec/changes/archive/2026-02-19-*` contain capability intent that was implemented and task-complete, but not fully synced into `openspec/specs/**`.

Observed failure patterns:
- Delta parser rejected full-spec layout files (`# ...`, `## Purpose`, `## Requirements`) because no delta operations were present.
- One `MODIFIED` delta attempted to target a requirement header not present in the current main spec.

## Approach

1. Create a dedicated backfill change with spec-only scope.
2. Extract requirement intent from archived capability specs.
3. Re-author each capability delta in valid OpenSpec delta operation format.
4. Use additive requirements for `agent-chat-sse` to avoid risky header-target mismatch.
5. Validate strictly, then archive without `--skip-specs` so canonical specs are created/updated.

## Decisions

### Decision 1: Use one consolidated backfill change

- Keeps review and traceability in one place.
- Avoids repeated micro-archives for closely related cleanup.

### Decision 2: Prefer `ADDED` over fragile `MODIFIED` for the SSE fix

- `MODIFIED` depends on exact header identity and failed previously.
- Additive requirement preserves intent while avoiding another sync block.

### Decision 3: Keep content semantically aligned with archived requirements

- Requirement IDs and scenarios remain close to archived originals.
- Wording is adjusted only as needed for valid delta format and consistency.

## Risks and Mitigations

- Risk: duplicate semantics in future specs.
  - Mitigation: this backfill is canonical; later changes should modify these newly synced main specs.
- Risk: hidden mismatch with implementation details.
  - Mitigation: this is a documentation backfill only; no runtime behavior change is introduced.
