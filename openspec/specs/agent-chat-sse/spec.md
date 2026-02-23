# agent-chat-sse

## Purpose

TBD
## Requirements
### Requirement: CHAT-010 User can create and list conversations
系统 SHALL 提供 conversation 的创建与列表能力，用于承载多轮对话。

#### Scenario: Create conversation
- **GIVEN** 用户已登录
- **WHEN** 调用 `POST /v1/conversations`（body 可为空或包含 `{ title }`）
- **THEN** 响应 `200` 且返回 `{ id, title?, createdAt, updatedAt }`

#### Scenario: List conversations
- **GIVEN** 用户已登录且存在多条 conversation
- **WHEN** 调用 `GET /v1/conversations`
- **THEN** 响应 `200` 且返回按 `updatedAt` 倒序的 conversations 列表

### Requirement: CHAT-020 User can fetch message history
系统 SHALL 支持按 conversation 获取历史 messages。

#### Scenario: Fetch message history
- **GIVEN** 用户已登录且拥有 `conversationId`
- **WHEN** 调用 `GET /v1/conversations/:conversationId/messages`
- **THEN** 响应 `200` 且返回 messages（按 `createdAt` 升序）

### Requirement: CHAT-030 Agent chat streams SSE events
系统 SHALL 提供 `POST /v1/agent/chat` 端点并以 SSE 形式流式返回 Agent 运行过程。

SSE 事件类型 MUST 至少包含：
- `agent.start`
- `agent.delta`
- `agent.message`
- `tool.state`（可选但建议）
- `context.patch`（可选）
- `agent.end`
- `error`
- `ping`

每条 SSE 的 `data` MUST 是 JSON，且形状为 `{ event, data }`（可含 `id`/`retry` 字段）。

#### Scenario: Successful agent run streams start → delta → message → end
- **GIVEN** 用户已登录且提供合法请求（例如 `{ conversationId?, input }`）
- **WHEN** 调用 `POST /v1/agent/chat`
- **THEN** 服务端依次发送 `agent.start`、若干 `agent.delta`、至少一条 `agent.message`、最后发送 `agent.end(status=succeeded)`

#### Scenario: Agent run failure ends with failed status
- **GIVEN** LLM provider 不可用或请求失败
- **WHEN** 调用 `POST /v1/agent/chat`
- **THEN** 服务端发送 `agent.end(status=failed)`，并在 `agent.end.data.error` 或 `error` 事件中包含可读错误信息

### Requirement: CHAT-040 Agent chat persists messages
系统 MUST 持久化 conversation 与 message：用户输入写入 `role=user` message；Agent 输出写入 `role=assistant`（工具相关可用 `role=tool` 或通过 metadata 表达）。

#### Scenario: User input is persisted
- **GIVEN** 用户已登录且向某 conversation 发送 input
- **WHEN** `POST /v1/agent/chat` 成功开始运行
- **THEN** `GET /v1/conversations/:conversationId/messages` 能看到新增的 `role=user` message

#### Scenario: Assistant output is persisted
- **GIVEN** 一次 agent run 完成
- **WHEN** 再次获取 message history
- **THEN** 能看到对应的 `role=assistant` message（内容为最终输出）

### Requirement: CHAT-050 Streaming includes tool trace and confirmation signals
当 Agent 触发工具调用时，系统 SHOULD 通过 `tool.state` 事件展示状态变化；对于需要用户确认的写/发类工具，系统 MUST 将 tool 状态推进到 `awaiting_input` 并提供可用于确认的标识（例如 `confirmationId`）。

#### Scenario: Tool requires confirmation
- **GIVEN** 用户请求触发写/发类工具（例如发送飞书消息）
- **WHEN** Agent 决策调用该工具
- **THEN** SSE `tool.state` 更新包含 `status=awaiting_input` 且附带 `confirmationId`

#### Scenario: Tool state progresses after confirmation
- **GIVEN** 用户已确认执行工具
- **WHEN** 工具执行完成
- **THEN** SSE `tool.state` 更新为 `status=succeeded` 或 `status=failed`，并包含 output/error

### Requirement: CHAT-060 Keep-alive pings
系统 SHALL 在长连接期间周期性发送 `ping` 事件，避免中间网络设备/浏览器断开连接。

#### Scenario: Ping is periodically emitted
- **GIVEN** 一次 agent run 持续时间较长
- **WHEN** SSE 连接保持打开
- **THEN** 客户端可观测到周期性的 `ping` 事件

### Requirement: CHAT-070 Agent chat SSE contract remains stable across engine routing
系统 MUST 保持 `POST /v1/agent/chat` 的 SSE 关键事件语义稳定，即使内部执行路径切换到 router/多引擎分发。

#### Scenario: conversation and tool-awaiting-input semantics are preserved
- **GIVEN** 客户端使用 `POST /v1/agent/chat?format=vercel-ai`
- **WHEN** chat 请求经过 engine router 并由 local/openclaw 引擎执行
- **THEN** `conversation.created` 与工具确认相关事件（例如 `tool.awaiting_input`）的语义与关键字段保持兼容


### Requirement: CHAT-080 Full timeline trace API for trust and troubleshooting
系统 MUST 提供可查询的 run 全量时序轨迹接口，支持前端可视化展示“思维链（摘要化推理步骤）+ 工具链（工具状态流转）”，并用于复盘与排障。

轨迹数据 SHOULD 覆盖以下事件序列（按时间排序）：
- `agent.start`
- `agent.delta`
- `agent.message`
- `tool.state`
- `context.patch`
- `agent.end`

系统 SHOULD 支持通过 `GET /v1/agent/runs/:runId/timeline` 查询，响应至少包含：`runId`、`status`、`startedAt`、`endedAt?`、`events[]`（含 `seq/event/at/payload`）。

#### Scenario: Frontend can replay timeline by runId
- **GIVEN** 一次 Agent 对话运行成功并产生 `runId`
- **WHEN** 前端调用 `GET /v1/agent/runs/:runId/timeline`
- **THEN** 响应 `200` 且返回完整时序 events，可直接用于时间轴可视化

#### Scenario: Unknown runId returns not found
- **GIVEN** `runId` 不存在或已过期
- **WHEN** 调用 `GET /v1/agent/runs/:runId/timeline`
- **THEN** 响应 `404` 且包含可读错误码（例如 `run_timeline_not_found`）

