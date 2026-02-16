# agent-chat-contract

## ADDED Requirements

### Requirement: APO-010 Stream adapter output MUST satisfy canonical vercel-ai line protocol contract
系统 MUST 以可回归的 canonical line protocol 输出 `vercel-ai` 流，确保后续协议演进不破坏客户端兼容性。

#### Scenario: Adapter 输出 canonical 协议行
- **GIVEN** Agent 运行事件序列（包含 start/delta/tool/end）
- **WHEN** 后端以 `format=vercel-ai` 输出数据流
- **THEN** 输出满足 `0:/2:/9:/a:/d:/3:` 协议行格式并携带 `X-Vercel-AI-Data-Stream: v1`

### Requirement: APO-020 Frontend parser MUST parse 2: custom events for conversation.created and tool.awaiting_input
前端 parser MUST 正确解析 `2:` custom event 中的 `conversation.created` 与 `tool.awaiting_input` 事件。

#### Scenario: 前端解析 custom events
- **GIVEN** 包含 `2:` custom events 的协议 fixture
- **WHEN** 前端 parser 顺序消费该 fixture
- **THEN** 能产出 `conversation.created` 与 `tool.awaiting_input` 结构化事件并驱动 UI 状态更新
