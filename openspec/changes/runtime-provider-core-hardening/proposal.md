## Why

当前 Agent Runtime 在模型调用层对 OpenAI SDK 类型存在耦合，同时输出校验、错误语义、定义缓存刷新在生产和调试场景都存在稳定性风险。该问题已影响 `contact_insight`、`archive_brief`、`network_action` 等能力的一致性与可维护性，需要在本轮集中硬化。

## Intent

在不改变 `/v1/agent/chat` 与 `/v1/agent/run` 外部职责边界的前提下，建立 provider-agnostic runtime 核心，并完成 P0 三项基础能力硬化。

## Scope

- 引入 `LLMProvider` 抽象与 OpenAI-compatible provider。
- Runtime 输出校验升级到 Ajv 完整 JSON Schema 语义。
- `/agent/run` 错误码映射稳定化（按错误类型映射 HTTP status + body）。
- Agent 定义缓存支持 dev watch 热更新与 prod memory 模式。

## Non-Goals

- 不合并 `chat` 与 `run` 入口。
- 不引入新的 Agent capability。
- 不重写前端协议层。

## What Changes

- 新增 `llm-provider.interface.ts`、`llm-types.ts`、`openai-compatible.provider.ts`。
- `AgentOrchestrator` / `AgentRuntimeExecutor` / `ContextBuilder` 从 OpenAI 类型解耦。
- `OutputValidator` 改用 Ajv 并补齐契约测试。
- 新增 `AgentRuntimeError` 并在 `AgentController` 统一错误映射。
- `AgentDefinitionRegistry` 支持 `AGENT_DEFINITION_CACHE_MODE=watch|memory`。

## Capabilities

### New Capabilities
- `agent-runtime-core`: Runtime 提供 provider-agnostic LLM 调用契约，并对输出校验、错误语义、定义缓存刷新进行硬化。

### Modified Capabilities
- 无。

## Impact

- Affected code:
  - `packages/server-nestjs/src/ai/**`
  - `packages/server-nestjs/src/agent/**`
- API behavior:
  - `/v1/agent/run` 错误返回语义变为稳定结构。
- Configuration:
  - `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_API_KEY`, `AGENT_DEFINITION_CACHE_MODE`

## Risks

- Provider 抽象切换期间可能引入流式响应兼容问题。
- Ajv 校验严格度提升可能暴露既有“宽松通过”的输出。

## Rollback

- 保留 `AiService` facade，不回滚上层调用。
- 出现 provider 侧异常时回切 `LLM_BASE_URL`/`LLM_API_KEY` 到原 OpenAI 配置。
- 若 Ajv 严格校验导致故障，可临时关闭特定 Agent schema 限制并补 schema。

## Acceptance

- `bun run --cwd packages/server-nestjs build` 通过。
- `AgentOrchestrator` 与 `AgentRuntimeExecutor` 在代码中不再 import OpenAI 类型。
- `/v1/agent/run` 对 `agent_not_found`、`output_validation_failed` 返回稳定 code/status。
- 修改定义文件后（watch 模式）无需重启即可生效。
