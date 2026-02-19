# db-migration-governance

## ADDED Requirements

### Requirement: MGS-010 System MUST run migration smoke on empty DB
系统 MUST 在空库状态执行全量迁移并通过。

#### Scenario: Empty database full migration
- **GIVEN** 一个空数据库实例
- **WHEN** 执行 `bun run db:migration:smoke`
- **THEN** empty 场景全量迁移成功并返回退出码 0

### Requirement: MGS-020 System MUST run migration smoke on half-old DB
系统 MUST 支持构造半旧库状态并验证后续迁移成功。

#### Scenario: Half-old database migration
- **GIVEN** 数据库已应用到 checkpoint（至少含 `20260207223000` 之前）
- **WHEN** 执行 half-old 场景 smoke
- **THEN** checkpoint 之后的迁移可全部成功应用

### Requirement: MGS-030 System MUST verify latest DB idempotency
系统 MUST 验证最新库重复迁移时无破坏性失败。

#### Scenario: Re-run migrations on latest database
- **GIVEN** 数据库已完成全量迁移
- **WHEN** 再次执行迁移
- **THEN** 执行成功且不报重复对象/类型转换错误

### Requirement: MGS-040 Migration smoke MUST block CI on failure
系统 MUST 在迁移 smoke 失败时阻断 CI。

#### Scenario: Smoke failure blocks test pipeline
- **GIVEN** 任一 smoke 场景失败
- **WHEN** 执行 `bun run test:ci`
- **THEN** 流水线失败并输出失败场景与迁移文件

### Requirement: MGS-050 Smoke MUST cover 20260207223000 idempotency path
系统 MUST 显式覆盖 `20260207223000` 幂等路径，必要时可扩展覆盖 `20260207231000`。

#### Scenario: Checkpoint idempotency
- **GIVEN** 半旧库已执行到 `20260207223000`（可选到 `20260207231000`）
- **WHEN** 重跑后续迁移与重复执行
- **THEN** 不出现非幂等失败
