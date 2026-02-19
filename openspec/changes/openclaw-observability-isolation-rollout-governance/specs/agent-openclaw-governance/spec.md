## ADDED Requirements

### Requirement: AOG-010 Metrics MUST be aggregatable by engine
系统 MUST 支持按 `engine` 维度聚合 run/chat 指标。

#### Scenario: Metrics endpoint returns engine-level summary
- **GIVEN** 系统存在 local 与 openclaw 执行记录
- **WHEN** 调用 `GET /v1/metrics/agents`
- **THEN** 返回结果可区分 `local` 与 `openclaw` 的成功率、失败率与耗时

### Requirement: AOG-020 Trace and audit MUST include engine and traceId
系统 MUST 在关键审计链路中记录 `engine` 与 `traceId`。

#### Scenario: Failure can be traced across systems
- **GIVEN** 一次 openclaw 执行失败
- **WHEN** 检查 FriendsAI 与网关日志
- **THEN** 可通过 `traceId` 串联定位并确认最终执行引擎

### Requirement: AOG-030 Rollout MUST be guarded by isolation and reliability gates
系统 MUST 在扩大 openclaw 灰度前通过隔离与可靠性门禁。

#### Scenario: Gate blocks risky rollout
- **GIVEN** fallback 率或失败率超阈值
- **WHEN** 执行灰度扩展流程
- **THEN** 系统 MUST 阻止扩展并要求回滚或修复
