# agent-definition-governance

## ADDED Requirements

### Requirement: PSV-010 System MUST persist versioned prompt/schema in DB
系统 MUST 在 DB 中持久化版本化 prompt/schema。

#### Scenario: Create definition version
- **GIVEN** 某 agentId
- **WHEN** 创建新版本
- **THEN** DB 中保存版本记录与模板/schema 数据

### Requirement: PSV-020 System MUST support draft/active/deprecated lifecycle
系统 MUST 支持版本生命周期状态。

#### Scenario: Lifecycle transition
- **GIVEN** 一个 draft 版本
- **WHEN** 发布后再废弃
- **THEN** 状态依次为 `active -> deprecated`

### Requirement: PSV-030 System MUST support percentage-based gray release
系统 MUST 支持基于百分比的灰度发布。

#### Scenario: Stable routing by userId
- **GIVEN** 发布规则 `rolloutPercent=20`
- **WHEN** 对同一 userId 多次路由
- **THEN** 命中结果稳定一致

### Requirement: PSV-040 System MUST provide pre-publish validate endpoint
系统 MUST 提供发布前校验接口。

#### Scenario: Invalid schema blocks publish
- **GIVEN** 版本 schema 非法
- **WHEN** 调用 validate
- **THEN** 返回校验错误并阻止 publish

### Requirement: PSV-050 System MUST support export-to-Git snapshot
系统 MUST 支持导出 active 版本为 Git 快照。

#### Scenario: Export active version
- **GIVEN** 存在 active 版本
- **WHEN** 执行导出
- **THEN** 快照目录可复现该版本定义
