## Context

迁移执行器目前是顺序读取 `packages/server-nestjs/migrations/*.sql` 并记录 `schema_migrations`。缺少针对不同数据库起点状态的自动化验证。

## Goals / Non-Goals

**Goals**
- 提供可重复的三场景迁移 smoke。
- 以最小改动复用现有迁移执行逻辑。
- 作为 CI 阻断，防止迁移回归进入主干。

**Non-Goals**
- 不改变 migration runner 协议。
- 不新增外部依赖或容器编排层。

## Decisions

### Decision 1: 三数据库策略
- `friendsai_smoke_empty`：空库直接跑全量。
- `friendsai_smoke_half_old`：先跑到 checkpoint，再跑全量并重复验证关键迁移。
- `friendsai_smoke_latest`：先跑全量，再重复执行确认 0 变更可通过。

### Decision 2: Checkpoint 机制
- checkpoint 默认 `20260207223000-MessageCreatedAtMs.sql`。
- 当 `MIGRATION_SMOKE_HALF_OLD_WITH_231000=true` 时将 checkpoint 提升到 `20260207231000-ConvertDatetimeToEpochMs.sql`。

### Decision 3: CI 阻断
- 根脚本 `test:ci` 纳入 `db:migration:smoke`。
- 通过 `MIGRATION_SMOKE_ENFORCED` 控制是否阻断（默认阻断）。

## Contracts

- Command: `bun run db:migration:smoke`
- Env:
  - `DATABASE_URL_V3` 或 `DATABASE_URL` 指向 `localhost:5434`
  - `MIGRATION_SMOKE_ENFORCED=true|false`
  - `MIGRATION_SMOKE_HALF_OLD_WITH_231000=true|false`

## Edge Cases

- 数据库不存在：脚本自动创建/删除 smoke DB。
- 某迁移非幂等：立即输出迁移文件名并退出非 0。
- Postgres 不可达：直接失败并输出连接地址。

## Security

- 不在日志打印完整连接串（脱敏 user/password）。
- smoke 仅操作 `friendsai_smoke_*` 前缀数据库。

## Rollout / Rollback

1. 先在本地执行并修复幂等问题。
2. 再接入 `test:ci` 阻断。
3. 若紧急回滚，仅关闭 `MIGRATION_SMOKE_ENFORCED`。
