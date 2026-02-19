## Why

当 chat/run 进入双栈后，如果没有统一的观测、隔离与发布门禁，线上问题将难以定位，且存在跨租户风险。需要独立 change 收敛治理能力，支撑可持续发布。

## What Changes

- 为 run/chat 指标增加 `engine` 维度与错误分类聚合。
- 统一 traceId/requestId 透传规范。
- 固化多租户隔离校验与回归测试套件。
- 建立双栈 rollout/rollback 运行手册与门禁。

## Capabilities

### New Capabilities
- `agent-openclaw-governance`: 双栈执行下的可观测、隔离安全、发布治理合同。

### Modified Capabilities
- `tool-confirmation`: 双栈期间继续强制写操作确认闸门，不允许旁路。

## Impact

- Affected code:
  - `packages/server-nestjs/src/v3-entities/agent-run-metric.entity.ts`
  - `packages/server-nestjs/src/action-tracking/agent-run-metrics.service.ts`
  - `packages/server-nestjs/src/action-tracking/action-tracking.controller.ts`
- Ops assets:
  - rollout checklist
  - rollback runbook

## Intent

将双栈从“可跑”升级为“可运维、可审计、可安全发布”。

## Scope

- In Scope: metrics、trace、isolation test、rollout gate。
- Out of Scope: capability 功能开发本身。

## Non-Goals

- 不改业务 API 契约。
- 不替换现有工具确认机制。

## Risks

- 新增指标字段需要迁移，存在兼容窗口。
- 门禁过严可能影响发布节奏。

## Rollback

- 指标字段可降级为旧聚合逻辑。
- 关闭 openclaw 灰度恢复 local-only。

## Acceptance

- `openspec validate openclaw-observability-isolation-rollout-governance --type change --strict --json` 通过。
- 指标接口可按 engine 维度查看。
- 隔离回归套件覆盖跨用户读写风险。
