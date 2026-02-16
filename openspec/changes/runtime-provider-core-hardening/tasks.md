## 1. Provider 抽象与网关接入

- [ ] 1.1 [RPH-010] 定义 `LlmProvider` / `LlmMessage` / `LlmToolDefinition` 并改造 `AiService` facade（Done When: `AgentOrchestrator`、`AgentRuntimeExecutor` 构建不依赖 `openai` 类型）。
- [ ] 1.2 [RPH-020] 实现 `openai-compatible.provider.ts` + `LLM_BASE_URL/LLM_API_KEY` 配置落地（Done When: 切换 gateway 后 `/v1/agent/chat` 与 `/v1/agent/run` 行为一致）。

## 2. Runtime 核心硬化

- [ ] 2.1 [RPH-030] 输出校验器切换 Ajv 并补 `enum/minItems/maxItems/required/additionalProperties` 测试（Done When: `output-validator.service.spec.ts` 覆盖并通过）。
- [ ] 2.2 [RPH-040] 增加 `AgentRuntimeError` 与 controller 统一错误映射（Done When: `agent_not_found=404`、`output_validation_failed=400`、`ai_provider_error=502`）。
- [ ] 2.3 [RPH-050] Definition cache 增加 `watch|memory` 模式（Done When: dev 修改 definition 文件无需重启生效，prod 维持内存缓存）。

## 3. 回归与验收

- [ ] 3.1 [RPH-010,RPH-020] 执行 `bun run --cwd packages/server-nestjs build` 与核心单测回归（Done When: 编译通过且关键 spec 通过）。
- [ ] 3.2 [RPH-030,RPH-040,RPH-050] 增加日志与错误样例文档，确认前端可消费稳定错误结构（Done When: 错误响应包含 `code/message/details/retryable`）。
