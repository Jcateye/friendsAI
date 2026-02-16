## Context

FriendsAI 当前后端为 NestJS + PostgreSQL + Agent Runtime 结构。运行时已经抽象出 Definition/Template/Validation/Executor，但 LLM 访问层仍存在 OpenAI 类型耦合，且错误语义与校验策略未形成统一合同。本设计用于把 runtime 核心升级为 provider-agnostic，满足 gateway 化与后续多 provider 扩展。

## Goals / Non-Goals

**Goals:**
- 建立 `LlmProvider` 统一契约，解除 runtime 对 SDK 类型的直接依赖。
- 支持 OpenAI-compatible endpoint（Vercel AI Gateway）。
- 完成 Ajv 输出校验、错误语义分层、定义热更新三项 P0。
- 保持现有 API 路径与业务入口不变。

**Non-Goals:**
- 不在本 change 增加新 Agent。
- 不调整前端运行时架构。
- 不改动数据库业务模型（仅涉及 runtime 配置与错误语义）。

## Decisions

### Decision 1: 引入 `LlmProvider` 契约（RPH-010/RPH-020）
- 方案：`AiService` 只作为 facade，真正模型调用落在 provider adapter。
- 合同：`generateText`、`streamChat`、`generateEmbedding` 使用统一 `LlmMessage` / `LlmStreamChunk` / `LlmToolDefinition`。
- 兼容：默认 provider 为 `openai-compatible`，通过 `LLM_BASE_URL` 指向 gateway。
- 备选方案：直接在业务层按厂商分支调用 SDK。
  - 未选原因：会把 Provider 差异渗透进 Orchestrator/Executor，维护成本高。

### Decision 2: 输出校验统一 Ajv（RPH-030）
- 方案：对 JSON Schema 输出路径全部走 Ajv，保留 zod 分支兼容旧定义。
- 合同：严格执行 `enum/minItems/maxItems/minimum/maximum/required/additionalProperties`。
- 备选方案：继续维护 JSONSchema->Zod 自定义转换。
  - 未选原因：覆盖面与长期维护成本不可控。

### Decision 3: `/agent/run` 错误语义稳定化（RPH-040）
- 方案：新增 `AgentRuntimeError`（`code/statusCode/details/retryable`），Controller 统一映射为 HTTP 响应。
- 合同：
  - `agent_not_found` -> 404
  - `output_validation_failed` -> 400
  - `ai_provider_error` -> 502
  - 默认未知错误 -> 500
- 备选方案：继续抛 `NotFoundException` 或 generic error。
  - 未选原因：前端无法做准确重试/兜底策略。

### Decision 4: 定义缓存模式双态（RPH-050）
- 方案：`AGENT_DEFINITION_CACHE_MODE=watch|memory`。
  - watch: 基于目录 mtime 指纹自动失效（dev 默认）。
  - memory: 仅内存缓存（prod 默认）。
- 备选方案：完全禁用缓存或每次读取文件。
  - 未选原因：会显著增加 I/O 与延迟。

### Contracts

- API 结构不变：`POST /v1/agent/chat`、`POST /v1/agent/run`。
- `/v1/agent/run` 错误返回统一结构：`{ code, message, details?, retryable? }`。
- 配置合同：`LLM_PROVIDER`/`LLM_BASE_URL`/`LLM_API_KEY`/`AGENT_DEFINITION_CACHE_MODE`。

### Edge Cases

- schema 本身非法：标记 `output_validation_failed` 并记录日志，不吞错。
- provider 返回非 JSON：由调用层决定是否 JSON parse；parse 失败映射稳定错误码。
- watch 模式下文件短时间多次修改：通过 mtime 指纹去重避免重复加载。

### Security

- Provider key 只读环境变量，不写日志。
- 错误 `details` 仅返回必要结构，不回传敏感 prompt/tool payload。
- 保持 userId/conversationId 隔离，不跨用户缓存命中。

## Risks / Trade-offs

- [Risk] provider 抽象初期可能出现流式 chunk 兼容差异 -> Mitigation: 增加 adapter 与 e2e 契约测试。
- [Risk] Ajv 严格校验导致历史宽松输出失败率上升 -> Mitigation: 先修 schema 阈值并输出可观测指标。
- [Risk] watch 模式带来额外 fs stat 开销 -> Mitigation: 仅在 dev 启用 watch。

## Migration Plan

1. 引入 provider 契约与 openai-compatible provider，保持 `AiService` facade 不变。
2. 改造 orchestrator/executor/context-builder/types 到新契约。
3. 切换 output validator 为 Ajv 并补充覆盖测试。
4. 落地 `AgentRuntimeError` + controller 映射，前端按新结构消费。
5. 上线 `AGENT_DEFINITION_CACHE_MODE` 双态并在 dev 默认 watch。

Rollback:
- 若 gateway 调用异常，直接回切 `LLM_BASE_URL` 与 `LLM_API_KEY`。
- 若错误语义变更影响调用方，保留旧 code 映射兼容一版后清理。

## Open Questions

- 是否在下一阶段加入 provider fallback order（网关策略）到 runtime 配置层。
