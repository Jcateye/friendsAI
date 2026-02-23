# skill-loader Specification

## Purpose
TBD - created by archiving change skill-runtime-loader-openclaw-bridge. Update Purpose after archive.
## Requirements
### Requirement: SRL-010 Loader MUST resolve desired skills from global and tenant bindings
系统 MUST 从全局技能与租户绑定解析目标技能集。

#### Scenario: Resolve desired set
- **GIVEN** global skills 与 tenant bindings 并存
- **WHEN** 执行 resolver
- **THEN** 输出确定性的目标 skills 集合

### Requirement: SRL-020 Loader MUST produce deterministic desired hash
系统 MUST 基于目标技能集产出稳定哈希。

#### Scenario: Deterministic hash
- **GIVEN** 同一技能集
- **WHEN** 多次计算 hash
- **THEN** 得到相同 desiredHash

### Requirement: SRL-030 Reconcile MUST be idempotent
系统 MUST 对相同 desired/applied hash 的重复 reconcile 返回 skipped。

#### Scenario: Idempotent reconcile
- **GIVEN** mount 已应用同 hash
- **WHEN** 再次 reconcile
- **THEN** 不重复装载

### Requirement: SRL-040 Loader MUST support OpenClaw reload bridge
系统 MUST 支持向 OpenClaw 发起技能重载请求。

#### Scenario: OpenClaw reload
- **GIVEN** 开启 `SKILL_OPENCLAW_SYNC_ENABLED`
- **WHEN** reconcile 需要装载
- **THEN** 调用 OpenClaw reload 接口并记录结果

### Requirement: SRL-050 Loader MUST persist mount status
系统 MUST 持久化 reconcile 状态用于审计与排障。

#### Scenario: Persist mount state
- **GIVEN** reconcile 成功或失败
- **WHEN** 流程结束
- **THEN** `skill_runtime_mounts` 有最新状态与时间戳

### Requirement: SRL-060 Disable binding MUST generate unload plan
系统 MUST 在 binding disable 后生成卸载动作。

#### Scenario: Disable binding
- **GIVEN** 某 skill binding 被 disable
- **WHEN** 执行 reconcile
- **THEN** 该技能从 desired set 移除并进入 unload actions

