## Context

`tool_confirmations` 已具备完整生命周期字段，但 controller/service 仅实现单条操作。

## Goals / Non-Goals

**Goals**
- 增加 batch confirm/reject API。
- 保持与单条接口一致的状态机规则。
- 输出部分成功聚合结果。

**Non-Goals**
- 不改变 tool 执行器核心协议。
- 不切换为后台异步任务。

## Decisions

### Decision 1: 部分成功语义（HTTP 200）
- 批量接口始终返回 200（请求体合法时）。
- 结果中按条返回成功/失败，避免 207 兼容性问题。

### Decision 2: 请求体结构
- confirm:
  - `items: [{id, payload?}]`
- reject:
  - `templateReason?: string`
  - `items: [{id, reason?}]`

### Decision 3: 安全与限制
- 默认 `maxBatchSize=20`。
- 非当前用户 confirmation 直接按条失败（不泄露详情）。

## Contracts

`ToolConfirmationBatchResult`:
```ts
{
  total: number;
  succeeded: number;
  failed: number;
  items: Array<{
    id: string;
    success: boolean;
    status?: string;
    code?: string;
    message?: string;
  }>;
}
```

## Edge Cases

- 项重复：按出现顺序处理，后续重复项会基于状态机失败。
- confirmation 非 pending：按条返回 `invalid_status`。
- 工具执行失败：按条返回 `tool_execution_failed`。

## Security

- 每条记录都校验 `userId` ownership。
- 拒绝理由长度限制，防止日志污染。

## Rollout / Rollback

1. 后端先上批量 API。
2. 前端渐进切换（保留单条 fallback）。
3. flag 关闭后退回单条流程。
