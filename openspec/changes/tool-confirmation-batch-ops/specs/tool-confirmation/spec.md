# tool-confirmation

## MODIFIED Requirements

### Requirement: TOOL-020 User can confirm and execute a tool
系统 SHALL 支持单条与批量确认工具执行。

#### Scenario: Batch confirm with partial success
- **GIVEN** `items` 中包含 pending 和非 pending confirmation
- **WHEN** 调用 `POST /v1/tool-confirmations/batch/confirm`
- **THEN** 返回 200 且 `items[]` 中每条有独立 success/status/code

### Requirement: TOOL-030 User can reject a tool
系统 SHALL 支持批量拒绝并支持模板化理由。

#### Scenario: Batch reject with template reason
- **GIVEN** 提供 `templateReason` 与多条 confirmation
- **WHEN** 调用 `POST /v1/tool-confirmations/batch/reject`
- **THEN** 未显式提供 reason 的条目使用模板理由

## ADDED Requirements

### Requirement: TCB-030 Batch result MUST provide per-item execution outcome
系统 MUST 返回逐条执行结果以支持部分成功。

#### Scenario: Per-item response structure
- **GIVEN** 批量请求处理完成
- **WHEN** API 返回
- **THEN** 包含 `{total,succeeded,failed,items[]}` 且每项含 `id` 与 `success`

### Requirement: TCB-050 Batch endpoints MUST enforce size limit and rate controls
系统 MUST 对批量接口施加批量上限与基础限流控制。

#### Scenario: Batch size exceeds limit
- **GIVEN** 请求 items 数量超出上限
- **WHEN** 调用批量接口
- **THEN** 返回 400 并携带稳定错误码（例如 `batch_size_exceeded`）
