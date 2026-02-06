# tool-confirmation

## Purpose

TBD

## Requirements

### Requirement: TOOL-010 System creates confirmations for write/send tools
系统 MUST 对“写/发/改状态”类工具创建确认请求（tool confirmation），并在未确认前不执行该工具。

#### Scenario: Write tool enters awaiting confirmation
- **GIVEN** 用户触发需要写入/发送的工具调用
- **WHEN** Agent 生成 tool call
- **THEN** 系统创建 `tool_confirmation(status=pending)`，并通过 SSE/HTTP 返回 `confirmationId`

### Requirement: TOOL-020 User can confirm and execute a tool
系统 SHALL 支持用户确认工具执行；确认后系统 MUST 执行工具，并将 confirmation 状态更新为 `confirmed` 或 `failed`。

#### Scenario: Confirm executes tool successfully
- **GIVEN** 存在 `tool_confirmation(status=pending)`
- **WHEN** 调用 `POST /v1/tool-confirmations/:id/confirm`
- **THEN** 工具被执行，响应包含 `status=confirmed` 且可包含 `result`

#### Scenario: Confirmed tool execution fails
- **GIVEN** 工具执行返回错误
- **WHEN** 用户 confirm
- **THEN** 响应包含 `status=failed` 且包含 `error`

### Requirement: TOOL-030 User can reject a tool
系统 SHALL 支持用户拒绝工具执行；拒绝后系统 MUST 不执行该工具，并将状态更新为 `rejected`。

#### Scenario: Reject cancels tool execution
- **GIVEN** 存在 `tool_confirmation(status=pending)`
- **WHEN** 调用 `POST /v1/tool-confirmations/:id/reject`
- **THEN** 响应包含 `status=rejected` 且工具未执行

### Requirement: TOOL-040 User can list pending confirmations
系统 SHALL 支持按 `status` 列表查询 confirmations，至少支持查询 `pending`。

#### Scenario: List pending confirmations
- **GIVEN** 用户存在多条 confirmations
- **WHEN** 调用 `GET /v1/tool-confirmations?status=pending`
- **THEN** 响应 `200` 且仅返回 `status=pending` 的列表（按 `createdAt` 倒序）

### Requirement: TOOL-050 Confirmations are auditable
系统 MUST 记录 confirmation 的生命周期与结果（至少包括：创建时间、确认/拒绝时间、执行时间、result/error、关联 `conversationId` 与 tool 名称）。

#### Scenario: Confirmation stores timestamps and linkage
- **GIVEN** confirmation 被 confirm 或 reject
- **WHEN** 再次查询该 confirmation（`GET /v1/tool-confirmations/:id`）
- **THEN** 返回中包含 `confirmedAt`/`rejectedAt`/`executedAt`（按实际发生填充）以及 `conversationId` 与 `toolName`
