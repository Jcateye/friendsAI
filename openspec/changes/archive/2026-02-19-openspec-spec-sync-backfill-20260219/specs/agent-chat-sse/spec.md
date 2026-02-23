## ADDED Requirements

### Requirement: CHAT-070 Agent chat SSE contract remains stable across engine routing
系统 MUST 保持 `POST /v1/agent/chat` 的 SSE 关键事件语义稳定，即使内部执行路径切换到 router/多引擎分发。

#### Scenario: conversation and tool-awaiting-input semantics are preserved
- **GIVEN** 客户端使用 `POST /v1/agent/chat?format=vercel-ai`
- **WHEN** chat 请求经过 engine router 并由 local/openclaw 引擎执行
- **THEN** `conversation.created` 与工具确认相关事件（例如 `tool.awaiting_input`）的语义与关键字段保持兼容
