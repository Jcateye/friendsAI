## Context

FriendsAI 现有 Runtime 已完成基础 provider-agnostic 抽象，但 chat/run 入口仍保留历史平铺模型字段，且后端 provider 实现未统一到 AI SDK v6 语义。为了支持 OpenAI/Anthropic/Gemini/OpenAI-compatible 的统一接入和原生参数透传，需要从 API 契约、调用链类型、Provider 工厂、前端 transport 四层同时升级。

## Goals / Non-Goals

### Goals

- API 层统一 `llm` 契约并拒绝历史平铺字段
- Runtime 支持 openai/claude/gemini/openai-compatible
- provider 原生参数通过 `providerOptions` 全透传
- embedding 与 chat/run provider 独立配置
- request 级 `provider/model` 覆盖默认配置

### Non-Goals

- 不在本轮实现 provider fallback order 编排策略
- 不修改 OpenClaw gateway 执行语义
- 不改动业务实体与数据库表结构

## Decisions

### Decision 1: llm-only API 合同

`/v1/agent/chat` 与 `/v1/agent/run` 必须携带 `llm`，并且请求中出现旧字段 `model/temperature/maxTokens/max_tokens` 直接返回 `400 invalid_llm_request`。

### Decision 2: Provider 规范化与别名

- 对外 provider: `openai | claude | gemini | openai-compatible`
- 输入别名：`anthropic -> claude`、`google -> gemini`
- providerOptions key 支持并规范化：`openai`, `anthropic`, `google`, `openaiCompatible`，并兼容 `claude`, `gemini`

### Decision 3: Native 参数透传策略

`providerOptions` 不做白名单，仅做：
- JSON 可序列化校验
- payload 大小限制（默认 64KB）

通过 AI SDK 的 `providerOptions` 原样下发给 provider。

### Decision 4: Embedding 解耦

Embedding 使用独立配置源：
- `LLM_EMBEDDING_PROVIDER`
- `LLM_EMBEDDING_MODEL`
- provider-specific key/baseURL

不复用 chat/run provider 默认值，除非 embedding 配置缺失才回退。

### Decision 5: 错误语义

新增错误语义并稳定映射：
- `invalid_llm_request` -> 400
- `unsupported_llm_provider` -> 400
- `llm_provider_not_configured` -> 500
- `llm_call_failed` -> 502

## Contracts

### Request Contract (`llm`)

```json
{
  "provider": "openai | claude | gemini | openai-compatible",
  "model": "string",
  "temperature": "number?",
  "maxOutputTokens": "number?",
  "topP": "number?",
  "topK": "number?",
  "stopSequences": "string[]?",
  "seed": "number?",
  "presencePenalty": "number?",
  "frequencyPenalty": "number?",
  "providerOptions": "Record<string, Record<string, unknown>>?"
}
```

### Runtime Call Chain

- Chat: `AgentController.chat -> EngineRouter.streamChat -> LocalEngine.streamChat -> AgentOrchestrator.streamChat -> AiService.streamChat`
- Run: `AgentController.run -> EngineRouter.run -> LocalEngine.run -> AgentRuntimeExecutor.execute -> AiService.streamChat`
- Direct skill run: chat 内 `executeSkillIntentDirectly` 同步透传 `llm`

## Edge Cases

- providerOptions 包含不可序列化值（如 function, bigint, 循环引用） -> `invalid_llm_request`
- provider unsupported -> `unsupported_llm_provider`
- provider key 缺失 -> `llm_provider_not_configured`
- stream 中工具调用参数分片 -> 聚合 `tool-input-start/tool-input-delta/tool-input-end`

## Security

- API key 只读环境变量，不回传响应
- 日志中不打印完整 providerOptions 与敏感 key
- error.details 不包含原始密钥字段

## Migration Plan

1. 发布后端新合同 + 前端请求改造（同窗口）
2. 观察 `invalid_llm_request` 与 `llm_call_failed` 指标
3. 若异常，回滚前后端到上一稳定版本（无 DB 回滚需求）

Rollback:
- 回滚 tag 即可恢复旧行为
- 本次无 schema migration，不影响存量数据

## Requirement Freeze Record

- Freeze Date: 2026-02-21
- Frozen Scope: `LNP-010` ~ `LNP-060`
- Validation Basis:
  - backend: `bun run --cwd packages/server-nestjs build` / `bun run --cwd packages/server-nestjs test`
  - web: `bun run --cwd packages/web test -- --run` / `bun run --cwd packages/web build`
