## Context

双栈引擎上线后，系统复杂度从单路径变为多路径。若没有 engine 维度指标和隔离回归，故障排查与风险控制成本会显著上升。

## Goals / Non-Goals

**Goals:**
- 指标体系支持按 engine 聚合和错误分类。
- 建立 traceId 全链路串联能力。
- 固化隔离测试与发布门禁。

**Non-Goals:**
- 不在本 change 增加新业务能力。
- 不改变 chat/run API 合同。

## Decisions

### Decision 1: 指标模型扩展 `engine`
- 在 `agent_run_metrics` 增加 `engine` 列并补索引。
- 理由：这是双栈效果评估最小必要维度。

### Decision 2: trace 贯通优先
- 将 `traceId` 作为跨仓排障主键，`runId` 作为业务执行键。
- 理由：runId 不覆盖所有链路层级，trace 更适合作跨系统关联。

### Decision 3: 发布门禁标准化
- 设定最低门槛：失败率、fallback 率、隔离回归通过率。
- 不满足门禁不得扩大灰度。

## Contracts

- Metrics API: `GET /v1/metrics/agents` 增加 engine 维度视图。
- Audit: run/chat 关键日志带 `engine`、`traceId`、`errorCode`。

## Edge Cases

1. 旧数据无 engine 字段：聚合时兼容默认值 `local` 或 `unknown`。
2. fallback 发生多次：仅记录最终执行引擎 + fallbackUsed。
3. traceId 缺失：自动生成并回填日志上下文。

## Security

1. 隔离测试必须覆盖 userId/session/workspace 跨域访问。
2. 写工具路径必须持续经过 `tool-confirmations`。

## Risks / Trade-offs

- [Risk] 指标字段迁移导致短期报表不连续 → Mitigation: 迁移窗口内双口径并行。
- [Risk] 门禁阈值设置不合理 → Mitigation: 先以观察阈值运行一周再收紧。

## Rollout-Rollback

### Rollout
1. 执行 DB migration 增加 `engine` 字段。
2. 更新 metrics 服务聚合逻辑。
3. 上线隔离回归与发布门禁。

### Rollback
1. 回滚聚合逻辑到旧口径。
2. 灰度策略切回 local-only。

## Open Questions

1. 失败率门禁阈值在不同 capability 上是否需要差异化。
