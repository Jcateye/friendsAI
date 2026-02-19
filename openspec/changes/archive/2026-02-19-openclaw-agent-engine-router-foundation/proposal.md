## Why

FriendsAI 当前 `POST /v1/agent/chat` 与 `POST /v1/agent/run` 直接绑定本地实现，缺少引擎抽象与统一路由决策，无法在不改外部 API 的前提下稳定引入 OpenClaw 执行链路。该缺口会阻塞后续 chat 灰度与 run 分能力迁移。

## What Changes

- 新增 Agent 引擎抽象：`IAgentEngine`、`AgentEngineRequest`、`AgentEngineRunResult`。
- 新增运行时路由组件：`RuntimeRouterDecision`、`EnginePolicyResolver`、`EngineRouter`。
- 封装本地实现为 `LocalEngine`，保持现有行为与对外 API 不变。
- `agent.controller` 改为通过 router 分发 `chat/run`，默认仍命中 local。
- 新增配置项：`AGENT_ENGINE_DEFAULT`、`AGENT_ENGINE_FALLBACK`。

## Capabilities

### New Capabilities
- `agent-engine-router`: 为 `/v1/agent/chat` 与 `/v1/agent/run` 提供可切换引擎路由能力，并保证默认行为不变。

### Modified Capabilities
- `agent-chat-sse`: chat 入口改为 router 驱动后，仍需保证 SSE/Vercel-AI 协议兼容语义不变。

## Impact

- Affected code:
  - `packages/server-nestjs/src/agent/agent.controller.ts`
  - `packages/server-nestjs/src/agent/agent.module.ts`
  - `packages/server-nestjs/src/agent/agent.orchestrator.ts`
  - `packages/server-nestjs/src/agent/runtime/agent-runtime-executor.service.ts`
  - `packages/server-nestjs/src/agent/engines/*` (new)
- Public APIs: 无破坏性变更，仍是 `POST /v1/agent/chat`、`POST /v1/agent/run`。
- Dependencies: 无新增外部依赖。

## Intent

在不破坏当前业务的情况下落地“双栈前置条件”：先完成引擎接口与路由骨架，再进入 OpenClaw chat/run 迁移阶段。

## Scope

- In Scope:
  - 引擎接口与 router 能力
  - LocalEngine 封装
  - controller 接入 router
- Out of Scope:
  - OpenClawEngine 实际执行逻辑
  - run capability 灰度迁移
  - 观测治理与隔离治理收敛

## Non-Goals

- 不在本 change 引入 OpenClaw 流量。
- 不改变前端协议解析。
- 不改变业务落库路径。

## Risks

- 路由改造可能影响现有单测依赖注入路径。
- controller 改造可能导致 chat/run 事件序列回归。

## Rollback

- 通过 feature flag 或回滚提交恢复 controller 直连本地 orchestrator/executor。
- 保留 LocalEngine 与旧链路并行，必要时立即回切。

## Acceptance

- `openspec validate openclaw-agent-engine-router-foundation --type change --strict --json` 通过。
- `POST /v1/agent/chat` 与 `POST /v1/agent/run` 对外响应结构与当前主线一致。
- 关键单测通过：
  - `bun run --cwd packages/server-nestjs test -- agent.controller.spec.ts`
