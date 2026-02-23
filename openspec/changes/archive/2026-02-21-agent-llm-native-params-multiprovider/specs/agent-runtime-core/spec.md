# agent-runtime-core

## ADDED Requirements

### Requirement: LNP-010 Runtime MUST support openai/claude/gemini/openai-compatible

Runtime MUST 支持通过统一 provider 工厂加载 `openai`、`claude`、`gemini` 与 `openai-compatible`。

#### Scenario: 多 provider 可用

- **GIVEN** 请求 `llm.provider` 指定为任一受支持 provider
- **WHEN** 调用 `/v1/agent/chat` 或 `/v1/agent/run`
- **THEN** Runtime 使用对应 provider 完成 LLM 调用

### Requirement: LNP-020 /agent/chat and /agent/run MUST accept llm object only

`POST /v1/agent/chat` 与 `POST /v1/agent/run` MUST 使用 `llm` 对象传递 LLM 参数，并拒绝历史平铺字段。

#### Scenario: 旧字段被拒绝

- **GIVEN** 请求体包含 `model` 或 `temperature` 等旧字段
- **WHEN** 调用 chat/run
- **THEN** 返回 `400` 且 `code=invalid_llm_request`

### Requirement: LNP-030 Native provider options MUST pass through without schema allowlist

Runtime MUST 支持 `providerOptions` 全透传，不做字段白名单约束。

#### Scenario: 原生参数透传

- **GIVEN** 请求体携带 `llm.providerOptions`
- **WHEN** Runtime 发起 provider 调用
- **THEN** providerOptions 原样传递到 AI SDK provider

### Requirement: LNP-040 Embedding provider MUST be independently configurable

Embedding 配置 MUST 与 chat/run 配置解耦，允许独立 provider/model。

#### Scenario: embedding 使用独立 provider

- **GIVEN** 配置 `LLM_EMBEDDING_PROVIDER` 与 `LLM_EMBEDDING_MODEL`
- **WHEN** 调用 embedding 生成
- **THEN** 使用 embedding provider 配置，而不是 chat/run provider

### Requirement: LNP-050 Request-level provider/model override MUST take precedence over defaults

请求级 `llm.provider` / `llm.model` MUST 覆盖环境默认配置。

#### Scenario: 请求覆盖默认

- **GIVEN** 服务端默认 provider/model 已配置
- **AND** 请求体携带不同 provider/model
- **WHEN** 执行 LLM 调用
- **THEN** 使用请求级配置

### Requirement: LNP-060 Errors MUST map to stable HTTP/code semantics for llm contract violations

Runtime MUST 对 llm 契约错误输出稳定 HTTP/code 映射。

#### Scenario: llm 错误映射

- **GIVEN** 分别触发 `invalid_llm_request`、`unsupported_llm_provider`、`llm_provider_not_configured`、`llm_call_failed`
- **WHEN** 调用 chat/run
- **THEN** 分别返回 400、400、500、502
