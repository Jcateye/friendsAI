## ADDED Requirements

### Requirement: ARM-010 Run router MUST support capability-level engine policy
系统 MUST 支持按 capability 维度选择 run 引擎。

#### Scenario: title_summary can route to OpenClaw independently
- **GIVEN** capability policy 设置 `title_summary -> openclaw`
- **WHEN** 调用 `POST /v1/agent/run` 且 `agentId=title_summary`
- **THEN** router MUST 命中 openclaw 引擎且不影响其他 capability 默认路由

### Requirement: ARM-020 Run MUST fallback to local when OpenClaw fails
系统 MUST 在 openclaw run 异常时按策略回退到 local。

#### Scenario: OpenClaw failure uses local fallback
- **GIVEN** run 命中 openclaw 且执行失败
- **WHEN** fallback policy 允许 local
- **THEN** 系统 MUST 使用 local 完成本次 run 并返回有效终态

### Requirement: ARM-030 Run output contract MUST remain schema-compatible
系统 MUST 保证迁移 capability 在 openclaw/local 下都满足既有输出 schema。

#### Scenario: Output validation passes for both engines
- **GIVEN** 相同输入分别执行 local 与 openclaw
- **WHEN** 输出进入现有 validator
- **THEN** 两条路径都通过 schema validation 或触发统一错误语义
