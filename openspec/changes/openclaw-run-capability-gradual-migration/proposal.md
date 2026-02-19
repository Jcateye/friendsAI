## Why

chat 完成引擎接入后，`/v1/agent/run` 需要按 capability 逐步迁移至 OpenClaw。一次性切换风险高，必须采用灰度和 fallback 策略确保结构化输出稳定。

## What Changes

- 定义 run capability 灰度路由策略（global/user/agent/capability）。
- 先迁移 `title_summary`，再迁移 `contact_insight`。
- 保留 local fallback，并记录降级原因。
- 建立 run 一致性测试（schema、缓存语义、写入语义）。

## Capabilities

### New Capabilities
- `agent-run-openclaw-migration`: 结构化 run 的能力级迁移、回退与一致性合同。

### Modified Capabilities
- `contacts-brief`: run 迁移期间继续要求结构化输出与业务写入语义一致。

## Impact

- Affected code:
  - `packages/server-nestjs/src/agent/engines/openclaw.engine.ts`
  - `packages/server-nestjs/src/agent/engines/engine.router.ts`
  - `packages/server-nestjs/src/agent/runtime/agent-runtime-executor.service.ts`
- Public APIs: 无变更，仍 `POST /v1/agent/run`。

## Intent

以最小风险将 run 引擎从单一 local 演进为可灰度的双栈执行模型。

## Scope

- In Scope: capability 灰度、fallback、一致性测试。
- Out of Scope: 全 capability 一次性迁移。

## Non-Goals

- 不改变 run 请求/响应 DTO。
- 不改变 FriendsAI 业务落库 ownership。

## Risks

- OpenClaw 输出结构可能偏离既有 schema。
- fallback 可能导致缓存和快照语义不一致。

## Rollback

- capability 策略回切 local。
- 全局 engine policy 切回 local-only。

## Acceptance

- `openspec validate openclaw-run-capability-gradual-migration --type change --strict --json` 通过。
- `title_summary/contact_insight` 在 openclaw 与 local 下结构化输出均满足 schema。
- fallback 场景下业务写入无副作用回归。
