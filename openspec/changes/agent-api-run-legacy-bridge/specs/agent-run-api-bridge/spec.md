# agent-run-api-bridge

## Purpose

定义统一入口 `/agent/run` 与 legacy bridge 兼容规范。

## Requirements

### Requirement: BRG-010 System MUST provide POST /v1/agent/run
系统 MUST 提供统一执行入口以运行非流式 Agent 能力。

#### Scenario: Run capability by agentId
- **GIVEN** 有效 `agentId` 与输入
- **WHEN** 调用 `POST /v1/agent/run`
- **THEN** 返回统一包裹响应（含 runId、cached、data）

### Requirement: BRG-020 System MUST keep POST /v1/agent/chat compatible
系统 MUST 保持 chat 端点流式行为兼容。

#### Scenario: Existing chat client compatibility
- **GIVEN** 现有前端继续调用 `/v1/agent/chat`
- **WHEN** 发起聊天请求
- **THEN** SSE/stream 协议行为保持一致

### Requirement: BRG-030 Legacy endpoints SHALL map to runtime capabilities
系统 SHALL 将旧 endpoint 委托到新 runtime，同时保持旧响应契约。

#### Scenario: Legacy brief endpoint
- **GIVEN** 调用 `/v1/contacts/:id/brief`
- **WHEN** 执行桥接映射
- **THEN** 输出结构与历史契约一致
