## Why

当前 SQL 迁移文件数量持续增长，且历史迁移兼容分支复杂。缺乏系统性 smoke 校验会导致如下风险：
- 新环境首次初始化失败（空库路径回归）
- 线上/测试库处于中间版本时升级失败（半旧库路径回归）
- 最新库重复执行迁移不幂等（二次执行回归）

## Intent

建立标准化迁移治理基线：在 CI 中对 `empty / half-old / latest` 三类数据库状态执行阻断式 smoke，确保 `bun migrate` 在演进过程中可预测、可重复、可回归。

## Scope

- 新增 `db:migration:smoke` 执行脚本。
- 覆盖三类场景：空库、半旧库（重点覆盖 `20260207223000` 与必要时 `20260207231000`）、最新库重复执行。
- 将 smoke 接入根 `test:ci`，失败阻断合并。
- 输出结构化日志，便于定位失败迁移文件。

## Non-Goals

- 不替换现有 `scripts/migrate.js` 执行器。
- 不引入 Flyway/Liquibase 等外部迁移框架。
- 不做历史迁移脚本大规模重写（仅修复必要幂等问题）。

## What Changes

- 新增 `packages/server-nestjs/scripts/migration-smoke.js`。
- 根 `package.json` 新增 `db:migration:smoke` 并接入 `test:ci`。
- 对关键历史迁移脚本做必要幂等兜底（若 smoke 暴露问题）。

## Risks

- 本地开发环境未启动 `localhost:5434` Postgres 时 smoke 失败。
- 历史迁移与新迁移顺序耦合可能导致半旧库构造成本较高。

## Rollback

- 可临时在 CI 关闭 `MIGRATION_SMOKE_ENFORCED` 以解除阻断。
- 保留原有 `server:migrate` 流程，smoke 不影响生产执行器。

## Acceptance

- `bun run db:migration:smoke` 返回 0，且三场景均通过。
- `test:ci` 在 smoke 失败时明确失败并输出失败迁移文件。
- 半旧库路径能稳定覆盖 `20260207223000`（必要时加 `20260207231000`）幂等验证。
