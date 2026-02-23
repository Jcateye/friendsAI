## Why

在具备引擎路由骨架后，chat 链路需要首先灰度接入 OpenClaw。若没有明确的流协议兼容约束，前端 `useAgentChat` 与 `parseVercelAgentStream` 会发生行为回归。

## What Changes

- 为 chat 新增 OpenClawEngine 适配路径（WS `agent` 方法优先）。
- 定义 OpenClaw 事件到 `AgentStreamEvent` 的映射规则。
- 明确保留 `conversation.created` / `tool.awaiting_input` / `agent.end` 兼容语义。
- 增加 chat fallback 策略与故障注入测试。

## Capabilities

### New Capabilities
- `agent-chat-openclaw-adapter`: 将 OpenClaw chat 流事件转换为 FriendsAI 既有流协议。

### Modified Capabilities
- `agent-chat-sse`: 内部执行引擎变化后，协议合同保持不变并扩展可选 metadata 字段。

## Impact

- Affected code:
  - `packages/server-nestjs/src/agent/engines/openclaw.engine.ts` (new)
  - `packages/server-nestjs/src/agent/adapters/vercel-ai-stream.adapter.ts`
  - `packages/web/src/lib/agent-stream/parseVercelAgentStream.ts` (非破坏性扩展)
- Public APIs: 无破坏性变更。

## Intent

优先迁移 chat 到 OpenClaw，并保证前端协议兼容与可回退。

## Scope

- In Scope: chat 适配、流协议映射、fallback、契约测试。
- Out of Scope: run 能力迁移、指标治理全量收敛。

## Non-Goals

- 不改 chat API 路径或 query 参数。
- 不在本 change 改造 run 执行路径。

## Risks

- OpenClaw 事件字段差异导致 parser 误判。
- 异常场景下 `agent.end` 缺失会导致前端卡死。

## Rollback

- 关闭 chat openclaw policy，恢复 local chat。
- 保留适配器代码但不启用。

## Acceptance

- `openspec validate openclaw-chat-adapter-stream-compat --type change --strict --json` 通过。
- `chat?format=vercel-ai` 保持关键事件兼容。
- 回退测试通过，`agent.end` 在失败场景可观测。
