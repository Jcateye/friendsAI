## MODIFIED Requirements

### Requirement: Agent chat SSE contract remains stable
系统 MUST 维持现有 chat SSE/Vercel-AI 协议关键语义稳定，即使内部改为 router 分发。

#### Scenario: conversation and tool events are preserved
- **GIVEN** 客户端使用 `POST /v1/agent/chat?format=vercel-ai`
- **WHEN** chat 路径由 router 调用 local engine
- **THEN** `conversation.created` 与 `tool.awaiting_input` 事件语义与字段保持兼容
