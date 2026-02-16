# agent-runtime-core

## ADDED Requirements

### Requirement: RPH-010 Runtime MUST expose provider-agnostic LLM interface
系统 MUST 暴露独立于具体模型 SDK 的 LLM 调用接口，Runtime 调用链不得依赖 OpenAI 专有类型。

#### Scenario: Runtime 编译不依赖 OpenAI 类型
- **GIVEN** `AgentOrchestrator` 与 `AgentRuntimeExecutor` 需要调用 LLM
- **WHEN** 通过 `LlmProvider` 契约完成编译
- **THEN** Runtime 代码路径不再 import `openai` 类型

### Requirement: RPH-020 Runtime MUST support OpenAI-compatible gateway endpoint
系统 MUST 支持通过 OpenAI-compatible endpoint 访问模型网关，并可通过环境变量切换 endpoint 与 key。

#### Scenario: Gateway 端点切换
- **GIVEN** 配置 `LLM_PROVIDER=openai-compatible` 与 `LLM_BASE_URL`
- **WHEN** 调用 `/v1/agent/chat` 或 `/v1/agent/run`
- **THEN** 请求通过网关成功完成且响应语义保持不变

### Requirement: RPH-030 Output validation MUST honor JSON Schema keywords
系统 MUST 对 JSON Schema 输出校验执行 `enum`、`minItems`、`maxItems`、`minimum`、`maximum`、`required`、`additionalProperties` 等关键字语义。

#### Scenario: 校验失败返回结构化错误
- **GIVEN** Agent 输出不满足 `output.schema.json`
- **WHEN** Runtime 执行输出校验
- **THEN** 返回 `output_validation_failed` 且包含可定位的错误详情

### Requirement: RPH-040 /agent/run errors MUST map to stable HTTP/code semantics
系统 MUST 将运行时错误映射为稳定的 HTTP status 与 `code` 语义，避免将业务错误统一包装为 `NotFound`。

#### Scenario: 错误映射
- **GIVEN** 运行时分别抛出 `agent_not_found`、`output_validation_failed`、`ai_provider_error`
- **WHEN** 调用 `POST /v1/agent/run`
- **THEN** 分别返回 404、400、502，并保持错误 body 结构为 `{code,message,details,retryable}`

### Requirement: RPH-050 Definition cache MUST support dev-time hot reload
系统 MUST 在开发模式支持 definition 缓存热更新，在生产模式保持内存缓存策略。

#### Scenario: watch 模式热更新
- **GIVEN** `AGENT_DEFINITION_CACHE_MODE=watch`
- **WHEN** 修改 agent definition/templates/schema 文件
- **THEN** 不重启服务即可在下一次请求加载新定义
