# agent-metrics

## ADDED Requirements

### Requirement: APO-030 System MUST persist run-level metrics with runId
系统 MUST 对每次 agent 运行持久化 runId 级指标，至少包含状态、耗时、缓存命中、错误码。

#### Scenario: 运行指标持久化
- **GIVEN** 任意 `/v1/agent/run` 或 `/v1/agent/chat` 调用
- **WHEN** 运行结束（成功或失败）
- **THEN** 系统写入一条 runId 指标记录，并可通过聚合 API 汇总成功率/缓存命中率/校验失败率/平均耗时

### Requirement: APO-040 ActionPanel dashboard MUST source from runtime output only
`GET /v1/action-panel/dashboard` MUST 仅基于 Runtime 输出构建响应，不得使用 legacy 直连 AI fallback。

#### Scenario: dashboard 单来源输出
- **GIVEN** ActionPanel 请求当前用户 dashboard
- **WHEN** controller 组装 followUps 与 recommendedContacts
- **THEN** 返回结果完全来自 runtime output 映射，且失败时返回结构化错误
