## ADDED Requirements

### Requirement: SRH-010 Loader MUST generate unload actions from applied state
系统 MUST 基于上次已应用状态（applied skills）与本次目标状态（desired skills）生成确定性的 `unloadActions`，用于表达需要卸载的 skill 版本。

#### Scenario: Disable binding triggers unload action
- **GIVEN** `tenantId=T1`、`agentScope=A1` 上次已应用 `contact_insight@v1`
- **WHEN** 该 skill 的 binding 被 disable 并执行 reconcile
- **THEN** 新 plan 的 `unloadActions` MUST 包含 `unload:contact_insight@v1`

#### Scenario: Same desired set yields empty unload
- **GIVEN** 上次已应用 skills 与本次 desired skills 完全一致
- **WHEN** 执行 reconcile
- **THEN** `unloadActions` MUST 为空且状态可进入 `skipped`

### Requirement: SRH-020 OpenClaw reload MUST use timeout and bounded retries
系统 MUST 对 OpenClaw reload 调用启用超时与有限重试，并对可重试/不可重试错误进行区分。

#### Scenario: Retry on transient gateway failure
- **GIVEN** 网关首次返回 5xx，后续重试可成功
- **WHEN** 执行 OpenClaw reload
- **THEN** 系统 MUST 在最大重试次数内重试并最终返回 `applied`

#### Scenario: Fail after retry budget exhausted
- **GIVEN** 网关持续超时或持续 5xx
- **WHEN** 重试预算耗尽
- **THEN** 系统 MUST 返回失败并记录最后一次错误摘要

### Requirement: SRH-030 Reconcile MUST obey engine policy
系统 MUST 支持 `SKILL_RUNTIME_ENGINE_POLICY` 并在 OpenClaw reload 失败时按策略处理（默认 `strict_openclaw`）。

#### Scenario: Strict policy preserves failure
- **GIVEN** `SKILL_RUNTIME_ENGINE_POLICY=strict_openclaw`
- **WHEN** OpenClaw reload 失败
- **THEN** reconcile MUST 返回 `failed` 并写入错误详情

#### Scenario: Fallback policy marks degraded apply
- **GIVEN** `SKILL_RUNTIME_ENGINE_POLICY=fallback_local`
- **WHEN** OpenClaw reload 失败
- **THEN** reconcile MUST 返回 `applied`，并在 details 中标记 `degraded=true`

### Requirement: SRH-040 Mount details MUST contain trace and phase metrics
系统 MUST 在 `skill_runtime_mounts.details` 中记录追踪与阶段指标，至少包含 `traceId`、`phaseDurationsMs`、`reloadAttempts`、`gatewaySummary`。

#### Scenario: Successful reconcile writes observability details
- **GIVEN** reconcile 正常执行完成
- **WHEN** 查询 runtime mount
- **THEN** details MUST 包含 trace 与阶段耗时字段

#### Scenario: Failed reconcile still writes observability details
- **GIVEN** reload 失败导致 reconcile 失败
- **WHEN** 查询 runtime mount
- **THEN** details MUST 同时包含错误信息与阶段/尝试次数信息

### Requirement: SRH-050 Reload protocol v2 MUST be auditable
系统 MUST 支持 `protocolVersion=v2` 的 `/skills/reload` 控制面契约，并要求响应包含可审计执行模式。

#### Scenario: v2 request includes explicit action semantics
- **GIVEN** `SKILL_OPENCLAW_RELOAD_PROTOCOL=v2`
- **WHEN** friendsAI 调用 `/skills/reload`
- **THEN** 请求体 MUST 包含 `loadActions`、`unloadActions`、`traceId`、`protocolVersion=v2`

#### Scenario: Gateway responds control-plane mode
- **GIVEN** 网关按控制面确认模式处理请求
- **WHEN** `/skills/reload` 返回 200
- **THEN** 响应 MUST 包含 `executionMode="control-plane-only"` 与 `acceptedAtMs`
