# Question Playbook

Ask at most 3 high-impact questions per round.

## Priority 1: Story minimum fields
Required:
- id
- capability
- milestone
- title

Question template:
- "I found story '<title>' but missing milestone. Choose: [M-2026Q1 (Recommended), M-2026Q2, custom]."

## Priority 2: Capability dependencies
Question template:
- "For C-020 工具执行层, what must complete first? [C-010 (Recommended), EXT-SEC-POLICY, none]."

## Priority 3: Milestone window and DoD
Question template:
- "Please confirm M-2026Q2 window. [2026-04~2026-06 (Recommended), custom range]."
- "DoD for M-2026Q2: [story-to-task mapping complete (Recommended), custom]."

## Priority 4: Architecture minima
Architecture A:
- layers and key module nodes
Architecture B:
- boundaries/containers and protocol edges

Question template:
- "Container edge API -> Worker protocol? [Async (Recommended), HTTPS, custom]."

## Defaults when unanswered
Always state assumption explicitly.
Examples:
- milestone defaults to `M-yyy`
- story status defaults to `todo`
- progress defaults to `0`
