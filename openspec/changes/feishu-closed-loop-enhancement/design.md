## Context

`FeishuMessageService` 已具备发送能力并有基础日志，`FeishuWebhookService` 已有按钮回调处理，但缺少消息投递状态回流与模板能力。

## Goals / Non-Goals

**Goals**
- 模板化管理发送内容。
- 发送结果可追踪、可回流、可关联业务上下文。
- 保留失败可重试语义。

**Non-Goals**
- 不改造 OAuth 主流程。
- 不实现全量飞书事件订阅。

## Decisions

### Decision 1: 模板实体
- 每个模板绑定 `userId`。
- 支持 `title`, `content`, `variables`, `status`。

### Decision 2: Delivery 实体
- 记录 `deliveryId`, `messageId`, `status`, `errorCode`, `retryable`。
- 记录 `conversationId`、`archiveId`、`toolConfirmationId` 关联字段。

### Decision 3: 回流接口幂等
- webhook 依据 `messageId + status` 去重更新。
- 同步入库失败不影响 webhook 200 ack（内部告警）。

## Contracts

- `POST /v1/connectors/feishu/messages/template-send`
  - request: `{ templateId, recipientOpenId, variables, conversationId?, archiveId? }`
  - response: `{ success, deliveryId, messageId, status }`

- `POST /v1/feishu/webhook/message-status`
  - request: `{ messageId, status, errorCode?, timestamp, traceId? }`

## Edge Cases

- 模板变量缺失：400 `template_variable_missing`。
- Feishu 发送失败：delivery `failed` 且 `retryable` 根据错误码判定。
- webhook 乱序：按 `updatedAt` 与状态优先级处理。

## Security

- webhook 验签复用现有安全机制。
- 模板内容与 delivery 查询严格 user scope。

## Rollout / Rollback

1. 先上线模板 CRUD。
2. 再上线 template-send 与 delivery 落库。
3. 最后开启 webhook 状态回流。
