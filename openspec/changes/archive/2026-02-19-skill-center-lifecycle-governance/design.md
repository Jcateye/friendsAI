## Context

当前系统在 `agent/list` 仅提供 agent 名片，不包含 skill 生命周期实体。为支撑 OpenClaw 可装载技能，需要独立 skill 治理层。

## Goals / Non-Goals

**Goals**
- 建立 skill 定义、版本、发布、绑定、运行态挂载的统一模型。
- 支持全局技能 + 租户覆盖。
- 发布后导出可回放快照。

**Non-Goals**
- 不做技能商店审核流。
- 不做跨集群复制。

## Decisions

### Decision 1: DB 为 SoT，Git 为导出副本
- 读取、发布、绑定一律走 DB。
- 发布成功后导出到 `packages/server-nestjs/exports/skills/{skillKey}/{version}.json`。

### Decision 2: 作用域模型
- `global` 与 `tenant` 两种 skill definition 作用域。
- catalog 解析优先级：tenant 覆盖 > global 默认。

### Decision 3: 绑定规则
- `skill_bindings` 提供 tenant/agent/capability 维度覆盖。
- 支持 `priority`、`enabled`、`rolloutPercent`、`pinnedVersion`。

## Contracts

- `GET /v1/skills/catalog`
- `POST /v1/skills`
- `POST /v1/skills/:skillKey/versions`
- `POST /v1/skills/:skillKey/versions/:version/publish`
- `POST /v1/skills/bindings/upsert`
- `POST /v1/skills/bindings/:id/disable`
- `POST /v1/skills/runtime/reconcile`

## Edge Cases

- 同一 scope 下重复创建 skillKey 返回 409。
- 发布时 checksum/manifest 缺失返回 400。
- pinnedVersion 不存在时 binding 无效并返回 warning。

## Security

- 绑定和发布操作默认需要登录用户。
- parse debug 与 runtime reconcile 在生产环境需 admin 角色。

## Rollout / Rollback

1. 先上线只读 catalog。
2. 再上线写接口（create/version/publish/binding）。
3. 最后启用 loader reconcile 自动化。
