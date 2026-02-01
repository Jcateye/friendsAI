# 后端 MVP 实现进度与计划（FriendsAI）

最后更新：2026-02-01

本文对照最初的目标/约束与模块划分，说明：
- 我已经在 `packages/server` 实现了哪些后端能力（现状）
- 哪些是“骨架/占位”还需要补齐（差距）
- 下一步把 MVP 主体功能跑完整的计划（路线图）

## 0. 需求基线（来自你最初的确认）

约束与偏好：
- 多租户隔离：需要（一个用户可属于多个 Workspace/团队）
- 离线/本地优先：需要（影响同步/冲突处理）
- 导出“结构化档案 + 原文 + 嵌入向量”：不需要
- 后端技术栈：Node + TypeScript
- AI：需要工具调用（自动提醒/发消息等），但必须有人确认闭环

架构分层（Clean Architecture 变体）：
- Presentation（HTTP API）：鉴权、输入校验、DTO
- Application（Use Cases）：用例编排、事务、调用 AI 与仓储
- Domain：纯业务规则（MVP 目前偏薄）
- Infrastructure：DB/LLM/工具适配

核心闭环：会后自然语言记录 -> AI 解析 -> 用户确认 -> 结构化归档（可追溯 source_entry_id）

## 1. 当前实现概览（后端）

结论：
- “会后闭环”与“会前简报”已能跑通（MVP 可用）
- 多租户与离线同步已实现“可跑版本”，但隔离校验与冲突/幂等仍需加强
- AI Provider 已支持 `mock` + OpenAI 兼容协议（可接你本地 LLM server）
- 工具调用链路已打通到 worker（目前是 mock tool provider），但缺少更完整的“确认后执行”策略与真实 provider

### 1.1 已实现的核心 API（/v1）

Auth
- POST `/auth/register`（注册 + 自动登录：返回 access/refresh token）
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`
- GET `/auth/me`

Workspace
- POST `/workspaces`
- GET `/workspaces`
- POST `/workspaces/:id/invite`（简化：通过 emailOrPhone 找用户并加入）
- PATCH `/workspaces/:id/members/:memberId`

Contacts
- GET `/contacts`
- POST `/contacts`
- GET `/contacts/:id`
- PATCH `/contacts/:id`
- POST `/contacts/:id/identities`
- DELETE `/contacts/:id/identities/:identityId`
- POST `/contacts/:id/tags`
- DELETE `/contacts/:id/tags/:tagId`

Journal（原始输入与抽取候选）
- POST `/journal-entries`
- GET `/journal-entries`
- GET `/journal-entries/:id`
- POST `/journal-entries/:id/extract`（AI 抽取 -> extracted_item proposed）
- GET `/journal-entries/:id/extract`（查看候选）
- POST `/journal-entries/:id/confirm`（人确认/拒绝 -> 写入 event/fact/action_item）

Context / Brief
- GET `/contacts/:id/context`
- GET `/contacts/:id/brief`
- POST `/contacts/:id/brief`

Action / Tooling
- POST `/action-items`
- PATCH `/action-items/:id`
- POST `/action-items/:id/execute`（确认后创建 tool_task=confirmed）
- GET `/action-items?contactId=`
- GET `/tool-tasks?status=pending|confirmed|running|done|failed|all`（列出 tool tasks；包含最近一次执行结果字段）
- POST `/tool-tasks/:id/confirm`（用户确认后置为 confirmed，等待 worker 执行）
- GET `/tool-tasks/:id/executions`（查看某个 tool task 的执行记录）

Sync（离线同步）
- POST `/sync/push`
- GET `/sync/pull?cursor=`
- GET `/sync/state?clientId=`

离线写入（MVP 落地做法）：
- 客户端可以在离线时先本地落一条记录，然后放入 outbox 队列，联网后自动重试创建。
- 为了支持“离线先生成 id”，后端的创建接口支持 body 里传 `id`（UUID）并做 upsert（同 workspace 下幂等）。
  - Contacts：POST `/contacts` 支持 `id`
  - Journal：POST `/journal-entries` 支持 `id`

### 1.2 数据库与迁移

- 迁移：`packages/server/migrations/001_init.sql`
- 迁移：`packages/server/migrations/002_embeddings.sql`
- 迁移：`packages/server/migrations/003_journal_entry_contact_unique.sql`
- 迁移执行器：`packages/server/src/infrastructure/db/migrate.ts`

覆盖的核心表（简化版）：
- 多租户：`workspace`、`workspace_member`
- 用户与会话：`app_user`（含 password_hash）、`auth_session`
- 联系人：`contact`、`contact_identity`、`tag`、`contact_tag`
- 原始记录：`journal_entry`、`journal_entry_contact`
- AI 候选：`extracted_item`
- 结构化衍生：`event`、`fact`、`action_item`
- 会前简报缓存：`brief_snapshot`
- 工具调用：`tool_task`、`tool_execution`
- 离线同步：`sync_change_log`、`sync_state`

### 1.3 AI Provider（多家头部/本地 LLM server）

- Provider 选择：`AI_PROVIDER=mock | openai_compat`
- 实现方式：使用 **Vercel AI SDK**（开源）作为统一 LLM 接入层：
  - `ai`（AI SDK Core）
  - `@ai-sdk/openai-compatible`（OpenAI 兼容协议 Provider）
- OpenAI 兼容协议适配：`packages/server/src/infrastructure/ai/openaiCompat.ts`
- env：
  - `AI_BASE_URL`（你的本地：`http://127.0.0.1:9739/v1`）
  - `AI_API_KEY`
  - `AI_MODEL`（例如 `gemini-3-flash`）
  - `AI_ROUTING_MODE=primary|fallback|auto`（可选：本地失败时自动 fallback）
  - `AI_FALLBACK_BASE_URL/AI_FALLBACK_API_KEY/AI_FALLBACK_MODEL`（可选：云端 fallback）

我已经在后端加了脚本验证该 provider 可用：
- `npm run -w @friends-ai/server test:ai`

Embeddings（向量）说明（按你的需求调整）：
- Chat/Extract/Brief：可以走你的本地 LLM proxy（例如 gemini）
- Embedding：单独走 OpenAI（或任何兼容 `/v1/embeddings` 的服务），通过 env 单独配置：
  - `EMBEDDING_BASE_URL`
  - `EMBEDDING_API_KEY`
  - `EMBEDDING_MODEL`（默认 `text-embedding-3-small`，与当前 schema 的 `vector(1536)` 对齐）
- 验证脚本：`npm run -w @friends-ai/server test:embedding`

### 1.4 工具调用（worker）

- worker：`packages/server/src/worker.ts`
- 当前行为：轮询 `tool_task status=confirmed` -> 执行（mock/webhook provider）-> 写 `tool_execution` -> 标记 done/failed
- 现状满足“链路跑通”，但还没接真实短信/邮件/日历/IM provider

## 2. 对照最初模块划分：完成度清单

说明：
- DONE：已实现并可用于 MVP
- PARTIAL：能跑但缺关键约束/完整性
- TODO：未实现

### 2.1 Auth & Tenant
- DONE：注册/登录/刷新/退出、workspace 创建/加入、JWT
- PARTIAL：成员角色权限校验（目前未做严格 RBAC）、设备会话/多设备 sync 细化
- TODO：邮箱/手机验证码、邀请链接、审计日志

### 2.2 Contacts
- DONE：联系人 CRUD、identity、tag
- PARTIAL：联系人画像字段（公司/职位等目前更多靠 notes/事实 fact）、联系人关系（relationship）
- TODO：联系人合并/去重策略

### 2.3 Journal / Conversation
- DONE：JournalEntry 原文保存、抽取候选 ExtractedItem、人确认落库 Event/Fact/Action
- PARTIAL：Conversation 线程模型（目前用 JournalEntry 直接承载“会话记录库”）
- TODO：更完整的归档状态机/编辑历史

### 2.4 Action
- DONE：ActionItem 创建/更新/查询 open
- PARTIAL：due_at 驱动提醒策略、通知投递
- TODO：ActionContext 的更完整聚合视图

### 2.5 Brief
- DONE：brief 生成与缓存（brief_snapshot + hash）
- PARTIAL：缓存 TTL 策略（目前按 source hash 缓存，不按 TTL 失效）

### 2.6 Context（核心）
- DONE：Stable(事实)/Dynamic(事件)/Action(待办) 的基础拼装
- PARTIAL：语义检索（embedding 相似历史）已接入 pgvector 查询，但仍需进一步做混合检索（FTS+向量）与排序策略
- TODO：混合检索（FTS + 向量）、排序与去重策略

### 2.7 AI Orchestrator
- PARTIAL：Provider 选择 + extract/brief 接口已落地
- TODO：统一 Agent 入口、工具调用的 policy gate（必须 user confirm 才允许执行）更系统化

### 2.8 Sync（离线/本地优先）
- PARTIAL：已实现 push/pull/state + change_log，并补了“可用级”幂等与游标，但实体覆盖仍偏少
- DONE：
  - push 幂等：使用 `sync_change_log(workspace_id, client_id, client_change_id)` 唯一键去重（migration `004_sync_idempotency.sql`）
  - pull 游标：使用 `(created_at, id)` 稳定序列（cursor 形如 `<created_at>|<id>`）
  - 软删除：contact / journal_entry 在 sync 的 delete op 走软删除（deleted_at）
- TODO：
  - 冲突处理：version/updated_at 策略 + 可审计
  - 全实体覆盖（目前只覆盖 contact / journal_entry / action_item 的 upsert；delete 仅覆盖 contact / journal_entry）

## 3. 多租户隔离：现状与差距

现状：
- API 层要求 workspaceId（来自 token 或 `X-Workspace-Id`）
- 大多数查询都带 `workspace_id` 条件（例如 contacts、journal entry）

差距（需要补齐，避免越权）：
- “跨表确认”场景要更严格：例如确认 extracted_item 时，不能信任 payload 中的 contactId（需要按 workspace 校验）
- ActionItem/ToolTask 等接口需要 workspace join 校验（避免越权）

建议（MVP 可靠版）：
- 先做 application 层的“workspace ownership guard”（通过 join 校验）
- 之后可选：Postgres RLS（更强，但运维与调试成本更高）

## 4. MVP 主体功能“跑完”的下一步计划（后端优先级）

### 里程碑 A：安全可用（租户隔离补齐）
- [x] confirm extracted_item 时对 contact 做 workspace ownership 校验（避免 payload 越权）
- [x] action/tool_task 关键写接口增加 workspace join 校验（通过 contact/workspace join）
- [ ] 增加最小 RBAC：owner/member 的写权限边界

### 里程碑 B：AI 解析可控（合同测试 + 稳定输出）
- [ ] 为 extract/brief 定义 JSON schema（已在 openai_compat 提示词里约束，但还需更严格）
- [ ] 加一组 golden fixtures（固定输入/输出）做回归测试
- [ ] 增加失败兜底：模型输出非 JSON 时降级（比如返回空 + 记录日志）

### 里程碑 C：工具调用可落地（人确认闭环）
- [x] 统一 ToolTask 状态机：pending(等待确认) -> confirmed -> running -> done/failed
- [ ] 在 API 层把“创建建议”与“确认执行”分开（目前已有 execute endpoint，但策略需要更明确）
- [ ] 接一个最简单的真实 provider（建议从 webhook 或 email 开始）

### 里程碑 D：离线同步可用（幂等/冲突/软删除）
- [x] push 幂等（client_change_id）
- [x] pull 游标与变更序列稳定化
- [ ] conflict 策略 + 审计
- [x] 软删除进入 change_log（contact/journal_entry）

### 里程碑 E：Context 变强（embedding + 混合检索）
- [ ] embedding 写入与更新策略
- [ ] pgvector 相似检索 + 结合 FTS
- [ ] brief/context 的排序与去重

## 5. 如何运行（后端）

更完整的一步步运行说明见：`docs/dev-setup.md`（包含 pgvector DB 的 docker compose）。

1) 配置环境变量（示例：`packages/server/.env.example`）
- 必填：`DATABASE_URL`, `JWT_SECRET`
- 如果使用你的本地 LLM：
  - `AI_PROVIDER=openai_compat`
  - `AI_BASE_URL=http://127.0.0.1:9739/v1`
  - `AI_API_KEY=...`
  - `AI_MODEL=gemini-3-flash`

2) 迁移
- `npm run server:migrate`

3) 启动
- API：`npm run server:dev`
- Worker：`npm run -w @friends-ai/server worker`

## 6. 自测/验证（我已经跑过的路径）

我在本机通过 `docker compose` 起了 pgvector Postgres，跑了 migrations，并用 `AI_PROVIDER=mock` 跑通了一条端到端 smoke：
- 注册（自动登录）-> 创建联系人 -> 写 Journal -> 抽取 -> 确认 -> 生成 Brief -> 创建 ToolTask(pending) -> 确认 -> Worker 执行 -> ToolTask done

对应脚本：
- `npm run -w @friends-ai/server test:smoke`

更完整的运行步骤见：`docs/dev-setup.md`。

## 6. 你可以直接给我一个指令的下一步

如果你希望“先把 MVP 主体功能跑完”，我建议我下一步先做：
1) 多租户 ownership guard 全面补齐（避免越权）
2) 工具调用状态机与 API 策略明确化（pending/confirmed）

你回复：
- 选 1（先补租户隔离）
- 或选 2（先补工具调用闭环）
我就按你选的方向继续往下写。
