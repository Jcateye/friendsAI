## Why

Skills 仅有定义还不够，必须有运行态装载/卸载能力，才能与 OpenClaw 引擎桥接并保证多租户隔离与幂等。

## Intent

实现 `SkillLoader` 与 runtime reconcile 机制，按 desired hash 驱动本地/远端引擎装载，并支持失败回退。

## Scope

- 计算 desired skills 集合与 hash。
- 幂等 reconcile 与 mount 状态落库。
- 导出快照并桥接 OpenClaw reload。
- disable binding 触发卸载计划。

## Non-Goals

- 不实现 OpenClaw 网关内部细节。
- 不实现跨区域分布式锁。

## Acceptance

- reconcile 幂等可验证。
- OpenClaw 同步失败可返回错误并保留回退路径。
