## Why

当前 tool confirmation 仅支持单条 confirm/reject，批量场景（例如一次处理多个待确认发送）操作成本高，且缺乏模板化拒绝理由。

## Intent

在保持单条接口不变的情况下，新增批量确认/拒绝能力，采用“按条执行 + 部分成功”语义并沉淀完整审计信息。

## Scope

- 新增 `POST /v1/tool-confirmations/batch/confirm`。
- 新增 `POST /v1/tool-confirmations/batch/reject`。
- 支持模板化拒绝理由与 per-item 覆盖。
- 返回统一 `ToolConfirmationBatchResult`。

## Non-Goals

- 不移除现有单条 confirm/reject 接口。
- 不引入异步任务队列（初版同步批量）。

## What Changes

- 扩展 `ToolConfirmationsService`：批量执行、限流/批量上限、逐条结果。
- 扩展 web API 客户端类型与调用方法。

## Risks

- 批量请求过大可能放大外部工具失败概率。
- 部分成功语义若前端处理不当可能引发误解。

## Rollback

- 关闭 `TOOL_BATCH_OPS_ENABLED`，保留单条接口。

## Acceptance

- 10 条混合状态请求可返回部分成功结构。
- 每条结果含 `id/status/code/message`，并可追溯到原 confirmation。
- 超过上限返回 400 并给出稳定错误码。
