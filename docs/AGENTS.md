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

## Agent API 文档与 Swagger 约定
- 所有 Agent 相关后端接口（例如 `/v1/agent/**`）必须：
  - 接入 NestJS Swagger，并在 Swagger 中打上清晰的 tag（如 `agent` / `agent-runtime` 等）。
  - 为每个接口编写 summary 与 description，说明用途、前置条件、典型使用场景。
  - 使用 DTO + `@nestjs/swagger` 装饰器暴露请求/响应 schema，保证 OpenAPI JSON 可用。
- 文档归属：
  - 结构与字段：以 Swagger/OpenAPI 为主，便于前端和工具自动化集成。
  - 语义与行为：在 `openspec/specs/**/spec.md` 或 Agent 模板文档中补充详细说明（含边界条件、错误码、示例）。
- 开发或修改 Agent 接口时，验收要求至少包括：
  - Swagger UI 中能看到该接口、字段描述完整且与实现一致。
  - OpenAPI JSON 中能正确生成对应路径/方法/模型。
  - 对应 openspec 文档已补充或更新。
