## MODIFIED Requirements

### Requirement: ACS-010 Chat stream contract MUST remain backward compatible
系统 MUST 在引入 OpenClaw chat 后继续保持既有 SSE/Vercel-AI 关键事件兼容。

#### Scenario: Existing custom events still parse successfully
- **GIVEN** 前端使用现有 `parseVercelAgentStream` 解析 `2:` 事件
- **WHEN** chat 引擎命中 openclaw
- **THEN** `conversation.created` 与 `tool.awaiting_input` 可被无改造识别

### Requirement: ACS-020 Chat MUST emit terminal event under fallback/error
系统 MUST 在 openclaw 异常和 fallback 场景下始终发出可消费的终态事件。

#### Scenario: OpenClaw timeout emits stable terminal state
- **GIVEN** openclaw chat 调用 timeout
- **WHEN** fallback policy 触发 local 或直接失败
- **THEN** 流内必须出现完整 `agent.end` 并携带可诊断状态

## ADDED Requirements

### Requirement: ACS-030 Chat adapter MUST map OpenClaw events to AgentStreamEvent
系统 MUST 定义 OpenClaw 到 FriendsAI 事件模型的稳定映射表。

#### Scenario: OpenClaw message chunks are transformed to agent.delta
- **GIVEN** OpenClaw 返回分片文本事件
- **WHEN** 适配器处理事件
- **THEN** 产出 `agent.delta` 并保持消息顺序语义
