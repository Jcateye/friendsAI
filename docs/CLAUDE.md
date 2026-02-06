<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Local Agent Constraints
- 涉及删除逻辑时，必须优先检查并遵循外键依赖顺序，按“子表 -> 父表”执行。
- 删除编排应放在 service 层并使用事务；不要用“删除外键约束”来规避顺序问题。
- 数据库外键是防线，不允许为了测试或业务临时移除 FK。
- e2e 需要清理数据时，必须使用有序删除策略；共享数据库的 e2e 任务默认串行执行。
