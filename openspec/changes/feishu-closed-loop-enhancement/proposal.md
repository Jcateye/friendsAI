## Why

当前飞书能力已有 OAuth 与发送，但缺少模板管理、发送结果回流和会话归档关联，导致“建议 -> 发送 -> 结果 -> 归档”闭环不完整。

## Intent

实现飞书闭环增强：模板化发送、delivery 状态回流、与 conversation/archive 关联，形成可追踪执行链路。

## Scope

- 模板 CRUD：`GET/POST/PATCH/DELETE /v1/connectors/feishu/templates`。
- 模板发送：`POST /v1/connectors/feishu/messages/template-send`。
- 状态回流：`POST /v1/feishu/webhook/message-status`。
- 持久化 delivery 与上下文关联。

## Non-Goals

- 不实现复杂富文本模板编辑器。
- 不在本期做跨渠道（微信/邮件）统一模板中心。

## What Changes

- 新增实体：`feishu_message_templates`, `feishu_message_deliveries`。
- 新增 `FeishuTemplateService` 与 controller 扩展。
- webhook 增加 message-status 处理逻辑。

## Risks

- 第三方回调字段变化会影响解析。
- 重试策略不当可能导致重复状态写入。

## Rollback

- 关闭 `FEISHU_CLOSED_LOOP_ENABLED`。
- 保留原 `sendTextMessage` 直发路径。

## Acceptance

- 模板 CRUD 全链路可用。
- template-send 返回 `deliveryId/messageId`。
- webhook 回流后可查询到 delivery 最新状态。
- delivery 可关联 `conversationId/archiveId`。
