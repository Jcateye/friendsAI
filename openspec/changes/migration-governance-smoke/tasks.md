## 1. Smoke 脚本

- [x] 1.1 [MGS-010,MGS-020,MGS-030] 新增 `packages/server-nestjs/scripts/migration-smoke.js`，支持 empty/half-old/latest 三场景。
- [x] 1.2 [MGS-050] half-old 场景显式覆盖 `20260207223000`（可选含 `20260207231000`）重复执行幂等验证。

## 2. CI 接入

- [x] 2.1 [MGS-040] 在根 `package.json` 增加 `db:migration:smoke` 并接入 `test:ci`。
- [x] 2.2 [MGS-040] 加入 `MIGRATION_SMOKE_ENFORCED` 开关逻辑和失败提示。

## 3. 回归验证

- [x] 3.1 [MGS-010,MGS-020,MGS-030] 执行 `bun run db:migration:smoke` 并记录三场景结果。
