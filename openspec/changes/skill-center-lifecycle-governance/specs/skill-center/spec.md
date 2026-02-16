# skill-center

## ADDED Requirements

### Requirement: SLC-010 Skills MUST persist in versioned DB model
系统 MUST 以可版本化数据模型持久化 skill 定义、版本、发布规则与绑定规则。

#### Scenario: Persist skill lifecycle entities
- **GIVEN** 新 skill 被创建并发布
- **WHEN** 查询 skills 相关表
- **THEN** 能看到 definition/version/release-rule/binding 与运行态挂载记录

### Requirement: SLC-020 Skills catalog MUST support global plus tenant override
系统 MUST 在 catalog 视图中支持全局技能与租户覆盖合并。

#### Scenario: Tenant override wins
- **GIVEN** 同 key 的 global skill 与 tenant skill 同时存在
- **WHEN** 租户请求 catalog
- **THEN** 返回 tenant 版本作为有效条目

### Requirement: SLC-030 Skills APIs MUST expose lifecycle operations
系统 MUST 对外提供 skills 的创建、版本创建、发布、绑定与停用 API。

#### Scenario: End-to-end lifecycle
- **GIVEN** 调用方创建 skill 并创建版本
- **WHEN** 执行 publish 与 binding
- **THEN** catalog 可见并可用于前端 actions

### Requirement: SLC-040 Runtime reconcile MUST be idempotent
系统 MUST 在 runtime reconcile 过程中按 desired hash 实现幂等。

#### Scenario: Same desired hash
- **GIVEN** 当前 applied hash 与 desired hash 相同
- **WHEN** 再次调用 reconcile
- **THEN** 返回 skipped 且不重复装载

### Requirement: SLC-050 Publish MUST export git snapshot
系统 MUST 在发布成功后导出技能快照文件，支持回放与审计。

#### Scenario: Export after publish
- **GIVEN** version publish succeeded
- **WHEN** 查看 exports 目录
- **THEN** 存在对应 `skillKey/version.json` 快照文件
