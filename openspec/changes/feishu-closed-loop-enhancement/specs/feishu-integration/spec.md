# feishu-integration

## ADDED Requirements

### Requirement: FCL-010 System MUST provide template CRUD for Feishu messages
系统 MUST 提供飞书消息模板 CRUD。

#### Scenario: Manage templates
- **GIVEN** 用户已连接飞书
- **WHEN** 调用模板 CRUD API
- **THEN** 能创建、查询、更新、删除模板

### Requirement: FCL-020 System MUST support template-based send with trace ids
系统 MUST 支持基于模板发送并返回可追踪标识。

#### Scenario: Send by template
- **GIVEN** 模板存在且变量完整
- **WHEN** 调用 `POST /v1/connectors/feishu/messages/template-send`
- **THEN** 返回 `deliveryId` 与 `messageId`

### Requirement: FCL-030 System MUST ingest callback/reconciliation result
系统 MUST 能接收回调/对账结果并更新投递状态。

#### Scenario: Update delivery status from webhook
- **GIVEN** 已有 delivery 记录
- **WHEN** 调用 `POST /v1/feishu/webhook/message-status`
- **THEN** delivery 状态更新为回调结果

### Requirement: FCL-040 Delivery result MUST associate with conversation/archive context
系统 MUST 将投递结果与会话/归档上下文关联。

#### Scenario: Delivery linked to context
- **GIVEN** template-send 请求包含 `conversationId` 或 `archiveId`
- **WHEN** 创建 delivery
- **THEN** 查询 delivery 时可看到关联上下文字段

### Requirement: FCL-050 System MUST retain retryable failure semantics
系统 MUST 保持失败可重试语义。

#### Scenario: Retryable failure mapping
- **GIVEN** Feishu 返回可重试错误
- **WHEN** 记录 delivery
- **THEN** `retryable=true` 且携带稳定错误码
