## 1. 指标与审计模型

- [ ] 1.1 [AOG-010] 为 `agent_run_metrics` 增加 `engine` 维度（Done When: migration 与实体定义同步完成）。
- [ ] 1.2 [AOG-010][AOG-020] 更新 metrics 聚合与查询接口（Done When: `/v1/metrics/agents` 可按 engine 展示）。

## 2. 隔离与安全门禁

- [ ] 2.1 [AOG-030] 新增跨用户 session/workspace 隔离回归测试（Done When: 关键隔离用例通过）。
- [ ] 2.2 [AOG-030] 固化发布门禁（失败率/fallback 率/隔离回归）规则（Done When: runbook 中有可执行门禁清单）。

## 3. 双栈确认流

- [ ] 3.1 [AOG-030] 校验 openclaw 路径写工具仍走 `tool-confirmations`（Done When: 未确认时写操作被拒绝）。
- [ ] 3.2 [AOG-020] 增加 traceId 串联检查（Done When: 同一次失败可跨仓定位）。

## 4. 验收

- [ ] 4.1 [AOG-010][AOG-020][AOG-030] 执行 OpenSpec 严格校验（Done When: `openspec validate openclaw-observability-isolation-rollout-governance --type change --strict --json` 通过）。
