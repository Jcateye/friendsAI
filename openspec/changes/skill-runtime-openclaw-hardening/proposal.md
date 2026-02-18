## Why

当前 `skill-runtime-loader-openclaw-bridge` 已完成主链路，但与复盘结论相比仍有关键差距：`unloadActions` 实际未生成、OpenClaw 调用缺少超时重试、失败策略和可观测信息不足，且跨仓网关缺少 `/skills/reload` HTTP 契约。该缺口会导致 disable binding 后运行态残留、偶发网络抖动放大失败、线上故障定位成本高。

## What Changes

- 新增 `friendsAI -> ClawFriends` 的 `POST /skills/reload` v2 契约，统一控制面同步载荷与响应结构。
- 在 `friendsAI` 的 `SkillLoaderService` 中实现真实 `unloadActions` 差异计算，不再固定空数组。
- 为 OpenClaw reload 增加超时、有限重试、错误分类与协议版本切换（v1/v2）。
- 为 runtime reconcile 增加 engine policy（`strict_openclaw` 默认，`fallback_local` 可选）并记录降级状态。
- 增强 `skill_runtime_mounts.details`：补充 `traceId`、`phaseDurationsMs`、`reloadAttempts`、`gatewaySummary`。
- 为 `POST /v1/skills/runtime/reconcile` 引入 DTO，收敛 `any` 输入并补齐服务层校验。

## Capabilities

### New Capabilities
- `skill-loader`: 定义 skills runtime 与 OpenClaw reload 控制面硬化合同（卸载计划、重试、策略、可观测、v2 协议）。

### Modified Capabilities
- 无。

## Impact

- `friendsAI` 后端：`packages/server-nestjs/src/skills/*`、相关单测/集成测试。
- `ClawFriends` 网关：`src/gateway/server-http.ts` 新增 `/skills/reload` 路由接入与对应测试。
- 配置项新增：`SKILL_RUNTIME_ENGINE_POLICY`、`SKILL_OPENCLAW_RELOAD_PROTOCOL`。
- OpenAPI/Swagger：`/v1/skills/runtime/reconcile` 入参契约提升为 DTO。
