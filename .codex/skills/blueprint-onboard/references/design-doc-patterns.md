# Design Doc Patterns

Extract entities from design docs even when IDs are missing.

## Common patterns

## Pattern A: heading hierarchy
- `# Epic ...`
- `## Capability ...`
- `### User Story ...`

## Pattern B: bullet sections
- "Milestones"
- "Dependencies"
- "Architecture"

## Pattern C: natural language
Examples:
- "Q2 release should include onboarding and auth hardening"
- "contacts depends on login token refresh"

## ID normalization
When ID missing, infer stable placeholders:
- Epic: `E-<seq>`
- Capability: `C-<seq>`
- Story: `US-<seq>`
- Milestone: `M-<year><quarter>` when inferable, else `M-yyy`

## Output expectations
Minimum candidate should include:
- project name
- story list with `id/capability/milestone/title`

Recommended candidate also includes:
- dependencies
- milestones
- architecture layers/containers

## Quality checklist
- no story without milestone
- no dependency without source and target IDs
- all major nodes rendered as `ID + 名称摘要`
