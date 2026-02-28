# Phases

## Phase 0: Preflight
Goal:
- Ensure target blueprint directory is usable.

Output:
- Confirmed path
- Directory health report

Pause:
- If blueprint structure missing, pause and ask whether to initialize first.

## Phase 1: Welcome
Goal:
- Set expectations for workflow and duration.

Output:
- 8-phase checklist shown

Pause:
- Wait for user agreement.

## Phase 2: Ingest
Goal:
- Read design doc and extract candidate entities.

Output:
- Recognized entities summary
- Missing information summary

Pause:
- No pause unless extraction quality is very low.

## Phase 3: Gap Questions
Goal:
- Fill missing required fields using minimal question rounds.

Output:
- Answered fields
- Explicit assumptions

Pause:
- Pause each question round if unresolved critical fields remain.

## Phase 4: Draft Show
Goal:
- Present what will be created/updated and potential conflicts.

Output:
- Candidate diff summary

Pause:
- Mandatory pause before apply.

## Phase 5: Conflict Resolution
Goal:
- Resolve ID-level field conflicts.

Output:
- Resolution choices per conflict

Pause:
- Pause until all critical conflicts resolved.

## Phase 6: Apply
Goal:
- Write merged blueprint with AUTO/MANUAL preservation.

Output:
- Merge result JSON
- Updated file list

Pause:
- No pause.

## Phase 7: Verify
Goal:
- Ensure generated files comply with 5-view rules.

Output:
- Validation pass/fail report with file-level issues

Pause:
- Pause on failure and propose fix plan.

## Phase 8: Recap
Goal:
- Summarize outcome and next action.

Output:
- final report: created/updated/unchanged/conflicts/assumptions

Pause:
- End of workflow.
