# FriendsAI 架构优化实施文档（2026-02-16）

## 1. Summary

本轮实施保持“前端 Vercel AI SDK + 后端模型 SDK”分层不变，重点落地四件事：
1. 后端引入 `LLMProvider` 抽象并支持 OpenAI-compatible gateway（Vercel AI Gateway）。
2. 前端收敛为单一 runtime（`useAgentChat`），移除旧 `FriendsAIRuntime/FriendsAIProvider`。
3. 完成 `docs/project-status-20260216.md` 中 P0/P1 优化项。
4. 建立流协议与前端解析的端到端契约测试，降低后续协议演进风险。

## 2. Locked Decisions

1. OpenSpec 拆分为 3 个 changes。
2. Provider 采用网关化方案，不做逐厂商直连。
3. 网关优先接入 `Vercel AI Gateway`（OpenAI-compatible endpoint）。
4. 前端 runtime 立即删除旧路径，不保留 deprecated 导出。
5. P1 三项全部纳入本轮：ActionPanel 收敛、观测增强、前端体积优化。

## 3. Target Architecture

### 3.1 前端
- 唯一聊天 runtime：`packages/web/src/hooks/useAgentChat.ts`
- 协议解析层下沉到：`packages/web/src/lib/agent-stream/parseVercelAgentStream.ts`
- 路由层按页面懒加载，减少首屏主包压力。

### 3.2 后端
- `POST /v1/agent/chat`：流式编排入口（SSE / vercel-ai 数据流适配）。
- `POST /v1/agent/run`：结构化 one-shot 执行入口（通过 `agentId` + `operation` 区分能力）。
- LLM 访问路径：`AgentOrchestrator/AgentRuntimeExecutor -> AiService facade -> LLMProvider`。

### 3.3 关键边界不变
- 不合并 `/v1/agent/chat` 与 `/v1/agent/run`。
- `agentId` / `operation` 继续作为结构化能力路由键。

## 4. Backend Implementation

### 4.1 Provider 抽象
- 新增：
  - `packages/server-nestjs/src/ai/providers/llm-types.ts`
  - `packages/server-nestjs/src/ai/providers/llm-provider.interface.ts`
  - `packages/server-nestjs/src/ai/providers/openai-compatible.provider.ts`
- 改造：
  - `packages/server-nestjs/src/ai/ai.service.ts`
  - `packages/server-nestjs/src/agent/agent.orchestrator.ts`
  - `packages/server-nestjs/src/agent/context-builder.ts`
  - `packages/server-nestjs/src/agent/agent.types.ts`
  - `packages/server-nestjs/src/ai/agent-tools/feishu.tools.ts`

### 4.2 P0 核心硬化
- 输出校验器升级到 Ajv：
  - `packages/server-nestjs/src/agent/runtime/output-validator.service.ts`
- 错误码与 HTTP 语义分层：
  - `packages/server-nestjs/src/agent/errors/agent-runtime.error.ts`
  - `packages/server-nestjs/src/agent/agent.controller.ts`
- Agent 定义热更新：
  - `packages/server-nestjs/src/agent/runtime/agent-definition-registry.service.ts`
  - `AGENT_DEFINITION_CACHE_MODE=watch|memory`

### 4.3 P1 业务与观测
- ActionPanel 主链路只走 Runtime 输出：
  - `packages/server-nestjs/src/action-panel/action-panel/action-panel.controller.ts`
- runId 级观测：
  - `packages/server-nestjs/src/v3-entities/agent-run-metric.entity.ts`
  - `packages/server-nestjs/src/action-tracking/agent-run-metrics.service.ts`
  - `GET /v1/metrics/agents`

## 5. Frontend Implementation

### 5.1 单 runtime 收敛
- 删除：
  - `packages/web/src/lib/assistant-runtime/FriendsAIRuntime.ts`
  - `packages/web/src/lib/assistant-runtime/FriendsAIProvider.tsx`
- 更新：
  - `packages/web/src/lib/assistant-runtime/index.ts`

### 5.2 流协议解析独立化
- 新增解析器：`packages/web/src/lib/agent-stream/parseVercelAgentStream.ts`
- `useAgentChat` 只负责状态机与请求调度，不承担低层行协议拼接。

### 5.3 体积优化
- 路由懒加载：`packages/web/src/app/routes.tsx`
- chunk 切分：`packages/web/vite.config.ts`
- CI 包体积守卫：
  - `scripts/check-web-bundle-size.js`
  - `package.json` 增加 `web:bundle:check`，并接入 `test:ci`

## 6. Public API / Types / Config Changes

### 6.1 API
- 保持不变：`POST /v1/agent/chat`、`POST /v1/agent/run`
- 新增：`GET /v1/metrics/agents`

### 6.2 新增核心类型
- `LlmProvider` / `LlmMessage` / `LlmToolDefinition` / `LlmStreamChunk`
- `AgentRunMetric`

### 6.3 错误结构
统一为：`code`, `message`, `details`, `retryable`

### 6.4 新增配置
- `LLM_PROVIDER=openai-compatible`
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `AGENT_DEFINITION_CACHE_MODE=watch|memory`
- `AGENT_METRICS_ENABLED=true|false`

## 7. Test Plan

1. Provider 抽象回归：编译与单测确认 runtime 不再依赖 OpenAI 类型。
2. 输出校验：覆盖 `enum/minItems/maxItems/minimum/maximum/required/additionalProperties`。
3. 错误语义：`agent_not_found -> 404`，`output_validation_failed -> 400`，provider 失败 -> `502`。
4. 流协议契约：
   - 后端适配器单测（`0:/2:/9:/a:/d:/3:`）
   - 前端 parser 单测（`conversation.created`、`tool.awaiting_input`）
   - `/v1/agent/chat?format=vercel-ai` e2e 协议头校验
5. P1 场景：ActionPanel 与 Runtime 输出一致、`/v1/metrics/agents` 聚合可用、Web 构建 chunk 生效。

## 8. Rollout / Rollback

### 8.1 Rollout
- Phase A：`runtime-provider-core-hardening`
- Phase B：`agent-protocol-observability-actionpanel`
- Phase C：`frontend-single-runtime-performance`

### 8.2 Rollback
- Gateway 异常时，仅回切 `LLM_BASE_URL` / `LLM_API_KEY` 到原配置。
- 前端 runtime 不兼容时，回滚前端发布包；后端接口层无需回滚。

## 9. OpenSpec 拆分与目录

1. `openspec/changes/runtime-provider-core-hardening`
2. `openspec/changes/agent-protocol-observability-actionpanel`
3. `openspec/changes/frontend-single-runtime-performance`

每个 change 均包含：`proposal.md`、`design.md`、`tasks.md`、`specs/*/spec.md`。
