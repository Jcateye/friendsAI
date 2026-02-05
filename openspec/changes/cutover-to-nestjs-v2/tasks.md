## 并行拆分说明（按模块 Workstreams）

为了便于并行推进、减少代码冲突，本变更将原先较细的 checklist 合并为 **Workstream（WS）**：每个 WS 约等于一个 PR/分支，尽量只修改自己模块的目录。

### 并行原则

- **WS-00 / WS-10 / WS-90 属于“公共部分”**：会改动根脚本、DB/实体/迁移、README 等，冲突可容忍但尽量集中在这些 WS。
- **除 WS-10 外，其他 WS 尽量不要改** `packages/server-nestjs/src/entities/**` 与 `packages/server-nestjs/migrations/**`（避免实体/迁移冲突）。
- 每个 WS 都需要给出可执行的验收路径（curl/脚本/可观察检查点），以“可跑通”为第一优先。

### 依赖建议（不强制）

- 先落地：WS-00（启动链路/安全/新 DB） + WS-10（DATABASE_URL + migrations + v2 schema）
- 可并行：WS-20(Auth) / WS-30(Conversations) / WS-70(Contacts)
- 再并行：WS-40(Agent SSE) / WS-50(Tool confirmations) / WS-60(Archive)
- 最后：WS-80(Client H5) → WS-90(Tests/Smoke/Docs)

---

## WS-00 Shared / Bootstrapping（安全 + 新主线启动链路）

- [ ] WS-00 安全与启动链路切换（NestJS 主线 + /v1 + health + 新 DB 基础） [AUTH-010] [AUTH-020] [CHAT-010] [CHAT-030] [CHAT-040] Done When:
  - `git grep -n "sk-"` 无结果，且 `.env*` 不再被提交（例如 `packages/server-nestjs/.env` 被移除/替换为 `.env.example`）。
  - 新主线 DB 可连通：`psql "$DATABASE_URL" -c "select current_database()"` 返回 `friendsai_v2`。
  - 默认开发链路指向 NestJS：`bun run dev` 启动 client(H5)+server-nestjs（不再默认启动 Express）。
  - `curl -s http://localhost:3000/v1/health` 返回 `{ "status": "ok", ... }`。
  - Touches（主要改动范围）：根 `package.json` / `project.sh` / `.gitignore` / `docker-compose*.yml` / `packages/server-nestjs/src/main.ts`（以及 `.env.example`）。

## WS-10 Server / Database & Schema（DATABASE_URL + migrations + v2 初始表）

- [ ] WS-10 数据库配置与 v2 schema（关闭 `synchronize`，引入 migrations，创建 v2 初始迁移） [CHAT-040] [AUTH-010] [CONT-010] [ARCH-010] [TOOL-040] Done When:
  - NestJS DB 配置改为读取 `DATABASE_URL`，且启动日志可确认 `synchronize=false`。
  - migrations 流程可用：在空库执行 migrations 后，核心表可插入/查询（并包含 `CREATE EXTENSION vector`）。
  - 至少覆盖：users/auth_sessions、conversations/messages、contacts + events/facts/todos/brief、conversation_archives、tool_confirmations、connector_tokens（具体表名以 design 为准）。
  - Touches（主要改动范围）：`packages/server-nestjs/src/app.module.ts`（或抽成 DatabaseModule）/ `packages/server-nestjs/src/entities/**` / `packages/server-nestjs/migrations/**` / `packages/server-nestjs/package.json`（迁移脚本）。

## WS-20 Server / Auth (JWT)

- [ ] WS-20 Auth 模块补齐：register/login/refresh/logout + JWT Guard [AUTH-010] [AUTH-020] [AUTH-030] [AUTH-040] [AUTH-050] Done When:
  - `POST /v1/auth/register` 返回 `{ accessToken, refreshToken, user }`，重复注册返回 `409`。
  - `POST /v1/auth/login` 错误密码返回 `401`，成功返回 tokens。
  - `POST /v1/auth/refresh` 可换新 `accessToken`；logout 后 refresh 返回 `401`。
  - 受保护端点（例如 `GET /v1/contacts`）缺 token 返回 `401`，带 token 返回 `2xx`。
  - Touches：`packages/server-nestjs/src/auth/**`（+ Guard/Decorator 放在 `src/auth` 或 `src/common`，但避免改动无关模块）。

## WS-30 Server / Conversations & Messages API

- [ ] WS-30 Conversations/Messages API：create/list + message history + pagination [CHAT-010] [CHAT-020] Done When:
  - `POST /v1/conversations` 可创建；`GET /v1/conversations` 按 `updatedAt` 倒序返回。
  - `GET /v1/conversations/:conversationId/messages` 按 `createdAt` 升序返回，并支持最小分页参数（`limit`/`before` 等）。
  - Touches：`packages/server-nestjs/src/conversations/**`（尽量不改实体/迁移）。

## WS-40 Server / Agent SSE Chat

- [ ] WS-40 Agent SSE Chat：SSE 契约 + `/v1/agent/chat` 流式 + ping + tool.state 占位 [CHAT-030] [CHAT-040] [CHAT-050] [CHAT-060] Done When:
  - `POST /v1/agent/chat` 以 SSE 输出 `agent.start → agent.delta* → agent.message → agent.end`，`data:` 为 JSON `{ event, data }`。
  - user/assistant messages 被持久化：一次 run 后 `GET /v1/conversations/:id/messages` 可见新增消息。
  - 长连接期间可观测到周期性的 `ping`；工具状态至少可通过 `tool.state` 事件输出 mock 状态流转。
  - Touches：`packages/server-nestjs/src/agent/**` / `packages/server-nestjs/src/ai/**`（与 conversations 的耦合尽量通过 service 注入而非直接改 controller）。

## WS-50 Server / Tool Confirmations

- [ ] WS-50 工具强确认：tool_confirmations CRUD + confirm/reject + 最小可执行工具（mock 飞书发送） [TOOL-010] [TOOL-020] [TOOL-030] [TOOL-040] [TOOL-050] Done When:
  - `GET /v1/tool-confirmations?status=pending` 可用且排序正确；`GET /v1/tool-confirmations/:id` 可回读。
  - `POST /v1/tool-confirmations/:id/confirm|reject` 更新状态与时间戳，并可回读 `result/error`。
  - Agent 触发写/发类工具时：创建 `tool_confirmation(status=pending)` 且 SSE 推送 `tool.state(status=awaiting_input, confirmationId=...)`。
  - Touches：`packages/server-nestjs/src/tool-confirmations/**`（工具实现可放 `src/tools/**`，但避免改动无关模块）。

## WS-60 Server / Conversation Archive

- [ ] WS-60 会话归档：extract → review → apply/discard（含 citations + 幂等） [ARCH-010] [ARCH-020] [ARCH-030] [ARCH-040] [ARCH-050] Done When:
  - `POST /v1/conversations/:conversationId/archive` 返回 `{ id, status, summary, payload }`，payload 至少一条包含 citations（`messageId + span`）。
  - `POST /v1/conversation-archives/:archiveId/apply|discard` 可用；apply 后状态为 `applied`，discard 后为 `discarded`。
  - apply 写入 contacts/events/facts/todos 并保证幂等（重复 apply 不重复写入）。
  - Touches：建议集中在 `packages/server-nestjs/src/conversation-archives/**`（如需新模块），避免在 contacts 模块里散落写入逻辑。

## WS-70 Server / Contacts & Brief

- [ ] WS-70 联系人：CRUD + context 聚合 + brief/refresh [CONT-010] [CONT-020] [CONT-030] [CONT-040] Done When:
  - `GET/POST/PATCH /v1/contacts` 可用；`GET /v1/contacts/:contactId/context` 返回聚合的 events/facts/todos。
  - `GET /v1/contacts/:contactId/brief` 可返回已有 brief 或空；`POST /v1/contacts/:contactId/brief/refresh` 生成新 brief（`generatedAt` 更新）。
  - Touches：`packages/server-nestjs/src/contacts/**` + `packages/server-nestjs/src/briefings/**`（以及必要的 query/service）。

## WS-80 Client / H5 Rewrite（单人负责，避免前端互相冲突）

- [ ] WS-80 前端 H5 重写：services 对齐新 `/v1` 契约 + fetch-stream SSE + 页面闭环 [AUTH-050] [CHAT-030] [ARCH-030] [TOOL-020] [CONT-040] Done When:
  - 登录后所有请求不再依赖 `X-Workspace-Id` 也可成功（token 存储/refresh 正常）。
  - 对话页可创建 conversation、进入会话、查看历史，并看到流式增量输出（`agent.delta/agent.message/agent.end`）。
  - 归档审核与 apply/discard 端到端可用；工具确认 UI 可 confirm/reject 并展示结果；联系人详情可刷新 brief 并看到 context 更新。
  - Touches：`packages/client/src/services/**` / `packages/client/src/hooks/**` / `packages/client/src/pages/**`（尽量避免多人并行改同一文件）。

## WS-90 Verification & Docs（公共部分）

- [ ] WS-90 测试/验收脚本/文档：最小覆盖 + smoke 闭环 + README 更新 [AUTH-020] [CHAT-030] [ARCH-030] Done When:
  - server-nestjs Jest 最小测试通过（auth、tool confirmation 状态机、SSE 事件顺序）。
  - 一套 smoke 命令可验证“登录→聊天→归档→联系人简报”的闭环（对齐 proposal Acceptance）。
  - README 明确：NestJS 为主线、Express 为回滚对照，并说明新 DB `friendsai_v2` 与回滚方式。
  - Touches：`packages/server-nestjs/test/**` / `scripts/**` / `README.md`（以及必要的说明文档）。
