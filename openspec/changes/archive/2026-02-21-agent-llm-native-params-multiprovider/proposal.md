## Why

当前 FriendsAI 的后端 Agent Runtime 仅在服务端默认配置层支持单一 provider 语义，且 `chat/run` 请求中的模型参数是历史平铺字段，无法稳定承载多 provider 的原生参数传递。随着 OpenClaw gateway 与多模型路由需求推进，现状会导致：

- provider 扩展成本高（调用链存在旧参数约定与 SDK 耦合）
- 原生参数能力缺失（Anthropic/Gemini/OpenAI 特有参数无法稳定透传）
- embedding 与 chat/run 耦合（模型配置难以独立演进）
- 前后端契约不一致（前端 Vercel AI SDK 版本与后端语义分叉）

## What Changes

- 新增独立变更：`agent-llm-native-params-multiprovider`
- Runtime LLM 能力升级到 AI SDK v6 语义，支持：`openai | claude | gemini | openai-compatible`
- `/v1/agent/chat` 与 `/v1/agent/run` 引入 `llm` 对象，立即拒绝历史平铺字段
- 支持 `providerOptions` 全透传（仅做 JSON 可序列化与 payload 上限校验）
- embedding provider 与 chat/run provider 解耦，独立配置
- 前端升级到 AI SDK v6 + `@ai-sdk/react`，同步请求契约

## Capabilities

- agent-runtime-core

## Impact

### Affected Specs

- `agent-runtime-core`

### Affected Code

- `packages/server-nestjs/src/ai/*`
- `packages/server-nestjs/src/agent/*`
- `packages/web/src/hooks/useAgentChat.ts`
- `packages/web/src/lib/api/client.ts`
- `packages/web/src/lib/api/types.ts`
- `packages/server-nestjs/src/agent/agent-api.md`
- `packages/server-nestjs/src/agent/API_BOUNDARIES.md`

### Breaking Changes

- `POST /v1/agent/chat` 与 `POST /v1/agent/run` 不再接受顶层 `model/temperature/maxTokens/max_tokens`
- 调用方必须使用 `llm` 对象传递 LLM 参数

### Non-goals

- 本轮不改 OpenClaw 远端执行层语义（仅控制面/调用面改造）
- 不引入新的 Agent capability
- 不变更数据库 schema
