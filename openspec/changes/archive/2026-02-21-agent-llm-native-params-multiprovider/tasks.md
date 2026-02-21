## 1. OpenSpec Artifacts

- [x] 1.1 新建 change `agent-llm-native-params-multiprovider`（proposal/design/spec/tasks）
- [x] 1.2 评审并冻结 `LNP-010 ~ LNP-060` 需求语义
  - 冻结时间：2026-02-21（与实现、测试、文档一致）

## 2. Backend Runtime Refactor

- [x] 2.1 新增 `agent-llm.schema.ts`，实现 llm 合同校验、别名规范化、旧字段拒绝
- [x] 2.2 改造 `AgentChatRequest` / `AgentRunRequest` / `AgentEngineRunOptions` / `AgentRuntimeExecutor.execute` 透传 `llm`
- [x] 2.3 引入 AI SDK provider 工厂（openai/claude/gemini/openai-compatible）
- [x] 2.4 重构 `AiService`：stream/generate/embed 全部走 AI SDK v6
- [x] 2.5 embedding 解耦配置（`LLM_EMBEDDING_PROVIDER`, `LLM_EMBEDDING_MODEL`）
- [x] 2.6 删除旧 `openai` SDK 适配实现并清理引用

## 3. Frontend Sync

- [x] 3.1 升级到 `ai@6` + `@ai-sdk/react`，替换 `ai/react`
- [x] 3.2 `useAgentChat` 迁移到新 transport/hook API，确保请求体包含 `llm`
- [x] 3.3 `/agent/run` 客户端请求统一带 `llm`
- [x] 3.4 前端类型更新（api/types + message 类型）

## 4. Tests

- [x] 4.1 后端单测：AiService/provider 工厂 + llm 请求校验
- [x] 4.2 后端链路单测：orchestrator/executor/controller 的 llm 透传
- [x] 4.3 embedding 单测：独立 provider 配置生效
- [x] 4.4 前端 hook 单测：`llm` 请求 + conversationId 注入 + tool 状态不回归

## 5. Docs & Verification

- [x] 5.1 更新 `agent-api.md` 与 `API_BOUNDARIES.md`
- [x] 5.2 更新 `.env.v3.example` 的 LLM 配置说明
- [x] 5.3 执行并通过：
  - `bun run --cwd packages/server-nestjs build`
  - `bun run --cwd packages/server-nestjs test`
  - `bun run --cwd packages/web test`
  - `bun run --cwd packages/web build`

  备注：2026-02-21 本地实测通过。`packages/web test` 使用 `vitest --run` 一次性模式验证。
