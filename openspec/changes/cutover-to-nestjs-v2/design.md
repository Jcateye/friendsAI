## Context

当前仓库同时存在两套后端：
- `packages/server`（Express）：当前 H5 前端默认对接的主线（JWT + /v1 + journal-entries 等）
- `packages/server-nestjs`（NestJS）：并行试验线，具备部分 Agent SSE / tool confirmation / A2UI schema 雏形，但与前端契约、鉴权、数据模型不一致，且 DB 配置硬编码 + `synchronize: true` 存在高风险

本变更选择 **激进切换**：后端主线切到 NestJS，前端按 Conversation-first 重写；并使用全新 DB（例如 `friendsai_v2`）以避免与旧表冲突，旧库保留用于回滚对照。

关键约束：
- H5-first（本阶段不保证 weapp）
- API 统一 `/v1`
- 默认按 `userId` 隔离数据（不引入 workspace/multi-tenant）
- 端到端可验收优先（聊天 → 归档 → 联系人沉淀/简报 → 工具强确认）

## Goals / Non-Goals

**Goals:**
- 以 Conversation-first 数据模型重建主线：`conversations` + `messages`
- 提供 `POST /v1/agent/chat` 的流式输出（SSE）并在 H5 前端接入
- 会话归档提取与确认应用（archive → applied）
- 联系人侧沉淀与简报（contacts/context/brief）
- 工具强确认统一到 `tool_confirmations`（requires_confirmation → confirm/reject → execute）
- 默认开发/启动链路直接跑 NestJS（Express 仅保留回滚）

**Non-Goals:**
- 旧数据迁移（旧库仅回滚对照）
- weapp 流式适配
- 完整连接器/飞书 OAuth token 交换与模板系统（可先 mock 最小闭环）

## Decisions

### D1: 新主线使用独立数据库 `friendsai_v2`

**选择**：新主线所有写入仅发生在新 DB；旧 DB 不被新主线访问（除非显式做对照工具）。  
**理由**：旧 Express schema 与现有 NestJS entity 命名存在重叠（`contact/event` 等）但字段含义不同，复用同库会导致撞表与不可控破坏。  
**备选**：同库不同 schema/prefix；复杂度更高且不利于快速切主线，暂不选。

### D2: 关闭 TypeORM `synchronize`，改用 migrations

**选择**：生产/开发均不使用 `synchronize: true`，以 migrations 明确管理 schema。  
**理由**：激进重构阶段 schema 变化频繁，自动同步容易误删/误改列；migrations 更可控，且回滚路径清晰。

### D3: SSE 采用 `POST /v1/agent/chat` + fetch stream（H5）

**选择**：H5 使用 `fetch()` 读取流并解析 SSE；请求使用 `Authorization: Bearer <accessToken>` header。  
**理由**：EventSource 仅支持 GET 且无法携带自定义 header，会迫使 token 放 query string（安全与可观测性较差）。  
**备选**：GET + token query（仅 dev 可用）；WebSocket（后续可扩展）。

### D4: 统一 SSE 事件格式为 `{ event, data }`

**选择**：SSE `event:` 使用 `agent.start/agent.delta/agent.message/tool.state/context.patch/agent.end/error/ping`；每条 `data:` 为 JSON，形状为 `{ event, data }`（可含 `id/retry`）。  
**理由**：客户端易解析与测试；与现有前端 `AgentSseEvent` 类型兼容，减少前端基础设施改动。

### D5: Auth 使用 JWT access/refresh + refresh 持久化

**选择**：HTTP API 默认 `Authorization: Bearer <accessToken>`；refresh token 存 DB 并支持撤销。  
**理由**：与现有主线的 JWT 模式一致，便于前端改造；不引入 cookie/session 的跨域复杂度。

### D6: 工具强确认通过 `tool_confirmations` 持久化实现

**选择**：当 Agent 决策执行写/发类工具时：
1) 创建 `tool_confirmation(status=pending)`（关联 `conversationId`、`toolName`、`payload`、可选 `runId/toolCallId`）
2) SSE 推送 `tool.state(status=awaiting_input, confirmationId=...)`
3) 用户 `confirm/reject` 后推进执行并写回 `result/error`，同步推送 `tool.state`

**理由**：相比内存 pending，持久化确认可跨进程/重启恢复，并且便于审计与排障。

## Contracts

本节描述“对外可见的契约”，实现细节不在此展开；需求来源见对应 spec：
- `auth-jwt`（AUTH-*）
- `agent-chat-sse`（CHAT-*）
- `conversation-archive`（ARCH-*）
- `contacts-brief`（CONT-*）
- `tool-confirmation`（TOOL-*）

### HTTP API（初版）

Auth（见 AUTH-*）：
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`

Conversations/Messages（见 CHAT-*）：
- `POST /v1/conversations`
- `GET /v1/conversations`
- `GET /v1/conversations/:conversationId/messages`

Agent SSE（见 CHAT-030）：
- `POST /v1/agent/chat` → `Content-Type: text/event-stream`

Archive（见 ARCH-*）：
- `POST /v1/conversations/:conversationId/archive`
- `POST /v1/conversation-archives/:archiveId/apply`
- `POST /v1/conversation-archives/:archiveId/discard`

Contacts/Brief（见 CONT-*）：
- `GET /v1/contacts`
- `POST /v1/contacts`
- `GET /v1/contacts/:contactId`
- `PATCH /v1/contacts/:contactId`
- `GET /v1/contacts/:contactId/context`
- `GET /v1/contacts/:contactId/brief`
- `POST /v1/contacts/:contactId/brief/refresh`

Tool confirmations（见 TOOL-*）：
- `GET /v1/tool-confirmations?status=pending`
- `GET /v1/tool-confirmations/:id`
- `POST /v1/tool-confirmations/:id/confirm`
- `POST /v1/tool-confirmations/:id/reject`

### SSE 事件（初版）

事件类型与结构（见 CHAT-030）：
- `agent.start`: `{ runId, createdAt, context? }`
- `agent.delta`: `{ id, delta, role?, toolCallId? }`
- `agent.message`: `{ id, role, content, createdAt, references?, metadata? }`
- `tool.state`: `{ toolId, name, status, at, message?, input?, output?, error? }`
- `context.patch`: `{ layer, patch }`
- `agent.end`: `{ runId, status, finishedAt, output?, error? }`
- `error`: `{ code, message, retryable?, details? }`
- `ping`: `{ at }`

### 数据模型（初版，表级）

建议表（字段只列关键契约，具体以 migrations 为准）：
- `users`: `id`, `email?`, `phone?`, `name`, `password_hash`, `created_at`
- `auth_sessions`: `id`, `user_id`, `refresh_token`, `expires_at`, `revoked_at?`
- `conversations`: `id`, `user_id`, `title?`, `status(active|archived)`, `created_at`, `updated_at`
- `messages`: `id`, `conversation_id`, `role`, `content`, `metadata_json?`, `created_at`
- `contacts`: `id`, `user_id`, `display_name`, `alias?`, `tags?`, `note?`, `created_at`, `updated_at`
- `events/facts/todos`: `id`, `contact_id`, `...`, `source_conversation_id`, `source_message_ids`
- `conversation_archives`: `id`, `conversation_id`, `status`, `summary`, `payload_json`, `citations_json`, `created_at`, `applied_at?`
- `tool_confirmations`: `id`, `conversation_id?`, `tool_name`, `payload_json?`, `status`, `result_json?`, `error?`, `created_at`, `confirmed_at?`, `rejected_at?`, `executed_at?`

## Edge Cases

- SSE 中途断线：客户端需要可重连；服务端应在 `agent.end` 前断线时正确终止 run（避免悬挂工具执行）
- 幂等性：
  - `ARCH-050` apply 重复调用不重复写入
  - `TOOL-020` confirm 重复调用需可控（已执行的 confirmation 返回一致结果）
- 并发确认：同一 confirmation 同时 confirm/reject 的竞态需要事务或状态机保护（只允许一次状态迁移）
- token 过期：SSE/HTTP 返回 `401` 后前端需要引导重新登录或 refresh

## Security

- 受保护 API 必须校验 `Authorization: Bearer <accessToken>`（AUTH-050）
- 避免在 URL query string 中传递 access token（除非 dev-only 且明确标注）
- 对工具执行记录 `tool_confirmations`（结果/错误/时间戳/关联 conversation）以便审计
- CORS 配置仅允许本地开发来源（或通过环境变量白名单）

## Rollout / Rollback

**Rollout（开发态）**
1) docker-compose 启动 Postgres，并创建新 DB `friendsai_v2`
2) NestJS 启动时执行 migrations（或提供 `bun run server:migrate` 等脚本）
3) `bun run dev` 默认启动：client(H5) + server-nestjs

**Rollback**
- 停止 NestJS/新 DB 写入
- 恢复默认启动脚本指向 Express（旧主线）并使用旧 DB
- 因为新旧 DB 隔离，不涉及数据回迁

## Risks / Trade-offs

- [Breaking 契约重写] → Mitigation：分阶段落地（先把 Auth + health + 最小 chat 跑通），每步都有 smoke
- [新 schema 迭代频繁] → Mitigation：migrations 管理 + 自动化初始化脚本
- [流式解析兼容性] → Mitigation：H5 先用 fetch stream；必要时降级为非流式或短轮询（仅开发期）

## Open Questions

- A2UI 的最小落地：作为 `agent.message.metadata.a2ui` 还是新增 SSE `ui` 事件？
- citations 的最小形态：先以 `messageId + span`，还是需要更丰富的 reference 结构？
- tool trace 与执行：首批只做飞书 send mock，还是需要真实 tenant token/发送接口？
