## Context

FriendsAI 已有流式聊天与 Agent runtime，但协议层与观测层还停留在“可用”而非“可验证”。本设计统一定义三条合同：
1. `vercel-ai` line protocol 事件合同。
2. runId 级指标合同。
3. ActionPanel 数据来源合同。

## Goals / Non-Goals

**Goals:**
- 明确后端 adapter 到前端 parser 的协议边界，形成可回归契约测试。
- 按 runId 沉淀关键运行指标并提供聚合 API。
- ActionPanel 仅消费 Runtime 结果，消除双实现分叉。

**Non-Goals:**
- 不改变 agent 定义模板机制。
- 不增加外部观测系统（APM/Tracing SaaS）。
- 不重构前端 UI 组件结构。

## Decisions

### Decision 1: 协议合同 fixture 化（APO-010/APO-020）
- 方案：将 `0:/2:/9:/a:/d:/3:` line protocol 定义为 canonical fixture。
- 后端验证：adapter 单测验证事件序列与协议头。
- 前端验证：parser 单测验证 `2:` custom event 中 `conversation.created` 与 `tool.awaiting_input`。
- 备选方案：仅做集成测试。
  - 未选原因：定位粒度不足，协议小改动难快速回归。

### Decision 2: runId 指标落库 + 聚合 API（APO-030）
- 方案：新增 `agent_run_metrics` 实体，记录 runId、agentId、operation、status、cached、durationMs、errorCode。
- API：`GET /v1/metrics/agents` 返回成功率、缓存命中率、校验失败率、平均耗时、总运行数。
- 备选方案：仅日志打印。
  - 未选原因：无法做稳定聚合与趋势比较。

### Decision 3: ActionPanel 强制 runtime 单来源（APO-040）
- 方案：dashboard 只调用 `NetworkActionService`（内部使用 AgentRuntimeExecutor），移除 legacy fallback。
- 备选方案：保留 fallback 双路径。
  - 未选原因：输出不一致、调试复杂、行为不可预测。

### Contracts

- `POST /v1/agent/chat?format=vercel-ai` MUST 返回协议头 `X-Vercel-AI-Data-Stream: v1`。
- `GET /v1/metrics/agents` MUST 返回聚合字段：
  - `successRate`
  - `cacheHitRate`
  - `validationFailRate`
  - `avgDurationMs`
  - `totalRuns`
- ActionPanel dashboard MUST 不再直连 AI 路径。

### Edge Cases

- chat 流中断：仍需落 `runId` 失败指标。
- metrics 写入失败：记录 warning，不影响主业务返回。
- parser 遇到未知 `2:` 自定义事件：忽略但不中断流处理。

### Security

- metrics 不暴露 prompt 原文与敏感输入。
- dashboard 继续按 userId 隔离查询范围。
- 协议事件只暴露必要元信息（不泄露密钥与内部 stack）。

## Risks / Trade-offs

- [Risk] 指标落库增加写放大 -> Mitigation: 仅写关键字段，失败降级为日志。
- [Risk] 协议收紧影响旧客户端 -> Mitigation: parser 保持向后兼容，新增契约测试覆盖。
- [Risk] ActionPanel 映射不完整影响展示 -> Mitigation: controller 映射层加单测与字段兜底。

## Migration Plan

1. 先加 metrics 实体与服务，确保写入失败不阻塞。
2. 同步补齐 adapter/parser/e2e 契约测试。
3. 切换 ActionPanel 到 runtime 单路径并移除 fallback。
4. 发布后观察 `/v1/metrics/agents` 指标波动，必要时按 runId 回放。

Rollback:
- 回滚 parser/adapter 变更可恢复协议兼容。
- 暂停 metrics 采集可通过 `AGENT_METRICS_ENABLED=false`。
- ActionPanel 可回滚 controller 映射逻辑，不影响 agent runtime。

## Open Questions

- 指标聚合窗口默认值（7d/30d）是否需要通过 query 参数暴露给前端。
