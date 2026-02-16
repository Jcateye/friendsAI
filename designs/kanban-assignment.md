# FriendsAI 任务看板 - Agent 分配

## 概览

| Agent | 任务数 | 总预估 | 擅长领域 |
|-------|--------|--------|---------|
| **Codex** | 11 | 4.5天 | 类型定义、样板代码、前端组件 |
| **OpenCode** | 13 | 7.8天 | 后端逻辑、数据库、API开发 |
| **Claude Code** | 8 | 9天 | 复杂架构、全栈集成、调试测试 |

---

## Codex 任务清单 (11个)

适合批量代码生成、类型定义、样板代码

| ID | 任务 | 预估 | 依赖 | 文件 |
|----|------|------|------|------|
| TASK-002 | Agent核心类型定义 | 0.5天 | - | `agent/types.ts` |
| TASK-003 | A2UI Schema定义 | 0.5天 | - | `types/a2ui.ts`, `types/tooltrace.ts` |
| TASK-013 | A2UI Renderer组件 | 0.5天 | TASK-003 | `components/A2UI/Renderer.tsx` |
| TASK-014 | ArchiveReviewCard | 0.5天 | TASK-013 | `components/A2UI/ArchiveReviewCard.tsx` |
| TASK-015 | TemplatePicker | 0.3天 | TASK-013 | `components/A2UI/TemplatePicker.tsx` |
| TASK-016 | ToolTraceCard | 0.4天 | TASK-013 | `components/A2UI/ToolTraceCard.tsx` |
| TASK-017 | ConfirmBar | 0.3天 | TASK-013 | `components/A2UI/ConfirmBar.tsx` |
| TASK-018 | VariableForm/DraftPreview | 0.5天 | TASK-013 | `components/A2UI/*.tsx` |
| TASK-024 | 飞书工具定义 | 0.5天 | TASK-008 | `agent/tools/feishuTools.ts` |
| TASK-027 | CitationHighlight | 0.5天 | TASK-003 | `components/A2UI/CitationHighlight.tsx` |

### Codex 执行命令示例

```bash
# 类型定义任务
codex "根据 designs/implementation-plan.md Task 2 规范，在 packages/server/src/agent/types.ts 中定义 ToolState, SSEEventType, ContextLayers, Citation 类型"

# A2UI Schema
codex "使用 Zod 在 packages/server/src/types/a2ui.ts 中定义 6 个 A2UI 组件 schema: ArchiveReviewCard, TemplatePicker, VariableForm, DraftPreview, ConfirmBar, ToolTraceCard"

# 前端组件
codex "在 packages/client/src/components/A2UI/ 中创建 Renderer.tsx，根据 payload.type 分发到对应组件"
```

---

## OpenCode 任务清单 (13个)

适合后端逻辑、数据库、API开发

| ID | 任务 | 预估 | 依赖 | 文件 |
|----|------|------|------|------|
| TASK-001 | Router冲突修复 | 0.5天 | - | `router.ts` |
| TASK-004 | 迁移-Citations | 0.2天 | - | `migrations/006_citations.sql` |
| TASK-005 | 迁移-ToolConfirmations | 0.2天 | - | `migrations/007_tool_confirmations.sql` |
| TASK-006 | 迁移-ConnectorTokens | 0.1天 | - | `migrations/008_connector_tokens.sql` |
| TASK-008 | ToolRegistry实现 | 0.5天 | TASK-002 | `agent/toolRegistry.ts` |
| TASK-010 | 工具执行策略 | 0.5天 | TASK-008 | `agent/policies.ts` |
| TASK-011 | SSE流式API端点 | 1天 | TASK-009 | `routes/agent.ts` |
| TASK-012 | 注册Agent路由 | 0.2天 | TASK-011 | `router.ts` |
| TASK-021 | 飞书OAuth流程 | 1.5天 | TASK-006 | `connectors/feishu/oauth.ts` |
| TASK-022 | 飞书API客户端 | 0.5天 | TASK-021 | `connectors/feishu/client.ts` |
| TASK-023 | 飞书路由更新 | 0.3天 | TASK-021 | `routes/feishu.ts` |
| TASK-025 | 飞书工具注册 | 0.3天 | TASK-024 | `agent/tools/index.ts` |
| TASK-028 | 工具确认后端 | 1天 | TASK-005 | `agent/toolConfirmation.ts` |
| TASK-031 | 集成测试-API | 1天 | TASK-011 | `__tests__/integration/*.ts` |

### OpenCode 执行命令示例

```bash
# Router修复
opencode "修复 packages/server/src/presentation/http/router.ts 中的路由冲突，将第19行的 contextRouter 从 /contacts 改为 /context"

# 数据库迁移
opencode "创建 packages/server/src/infrastructure/db/migrations/006_citations.sql，添加 chat_message.citations_json JSONB 字段"

# SSE端点
opencode "在 packages/server/src/presentation/http/routes/agent.ts 实现 POST /v1/agent/chat SSE 端点，参考 designs/implementation-plan.md Task 5 规范"
```

---

## Claude Code 任务清单 (8个)

适合复杂架构、全栈集成、调试测试

| ID | 任务 | 预估 | 依赖 | 文件 |
|----|------|------|------|------|
| TASK-007 | ContextBuilder实现 | 1天 | TASK-002 | `agent/contextBuilder.ts` |
| TASK-009 | AgentOrchestrator实现 | 1.5天 | TASK-007,008 | `agent/orchestrator.ts` |
| TASK-019 | useAgentChat Hook | 1天 | TASK-011 | `hooks/useAgentChat.ts` |
| TASK-020 | 聊天页SSE集成 | 1天 | TASK-019,013 | `pages/conversation-chat/index.tsx` |
| TASK-026 | Citations后端实现 | 1天 | TASK-004,009 | `agent/orchestrator.ts` |
| TASK-029 | 工具确认前端 | 0.5天 | TASK-017,020 | `pages/conversation-chat/index.tsx` |
| TASK-030 | 单元测试-Agent | 1.5天 | TASK-009 | `__tests__/unit/agent/*.ts` |
| TASK-032 | E2E测试 | 1.5天 | TASK-020,029 | `e2e/chat.spec.ts` |

### Claude Code 执行命令示例

```bash
# ContextBuilder
claude "实现 packages/server/src/agent/contextBuilder.ts 三层上下文构建器，参考 designs/implementation-plan.md Task 4 ContextBuilder 接口定义"

# AgentOrchestrator
claude "实现 packages/server/src/agent/orchestrator.ts Agent主循环，使用 Vercel AI SDK streamText，生成 SSE 事件"

# 前端集成
claude "将 useAgentChat hook 集成到 packages/client/src/pages/conversation-chat/index.tsx，实现流式消息和 A2UI 渲染"
```

---

## 执行顺序

### 阶段 1: 并行启动 (Day 1-2)

可同时执行，无依赖:

```
[Codex]     TASK-002 类型定义
[Codex]     TASK-003 A2UI Schema
[OpenCode]  TASK-001 Router修复
[OpenCode]  TASK-004 迁移-Citations
[OpenCode]  TASK-005 迁移-ToolConfirmations
[OpenCode]  TASK-006 迁移-ConnectorTokens
```

### 阶段 2: Agent核心 (Day 3-5)

依赖阶段1:

```
[Claude]    TASK-007 ContextBuilder (依赖 TASK-002)
[OpenCode]  TASK-008 ToolRegistry (依赖 TASK-002)
[OpenCode]  TASK-010 工具策略 (依赖 TASK-008)
[Claude]    TASK-009 AgentOrchestrator (依赖 TASK-007,008)
[OpenCode]  TASK-011 SSE端点 (依赖 TASK-009)
[OpenCode]  TASK-012 注册路由 (依赖 TASK-011,001)
```

### 阶段 3: 前端组件 (Day 3-6, 与阶段2并行)

```
[Codex]     TASK-013 A2UI Renderer (依赖 TASK-003)
[Codex]     TASK-014~018 A2UI组件 (依赖 TASK-013)
```

### 阶段 4: 前端集成 (Day 6-8)

```
[Claude]    TASK-019 useAgentChat (依赖 TASK-011)
[Claude]    TASK-020 聊天页集成 (依赖 TASK-019,013)
```

### 阶段 5: 飞书连接器 (Day 8-10)

```
[OpenCode]  TASK-021~023 飞书OAuth
[Codex]     TASK-024 飞书工具定义
[OpenCode]  TASK-025 飞书工具注册
```

### 阶段 6: 高级功能 (Day 10-14)

```
[Claude]    TASK-026 Citations后端
[Codex]     TASK-027 CitationHighlight
[OpenCode]  TASK-028 工具确认后端
[Claude]    TASK-029 工具确认前端
```

### 阶段 7: 测试 (Day 14-18)

```
[Claude]    TASK-030 单元测试
[OpenCode]  TASK-031 集成测试
[Claude]    TASK-032 E2E测试
```

---

## 里程碑检查点

| 里程碑 | Day | 完成任务 | 验收标准 |
|--------|-----|---------|---------|
| **M1 基础可用** | 6 | TASK-001~012 | SSE聊天API可用 |
| **M2 V0 MVP** | 8 | TASK-013~020 | 前端流式聊天完整 |
| **M3 V1 飞书只读** | 10 | TASK-021~025 | 飞书连接+模板查询 |
| **M4 V2 飞书写操作** | 14 | TASK-026~029 | 强确认+发送消息 |
| **M5 生产就绪** | 18 | TASK-030~032 | 测试覆盖率80%+ |

---

## 看板文件位置

```
/Users/haoqi/OnePersonCompany/friendsAI/.kanban/board.json
```

可使用 `vibe-kanban` 工具加载此文件进行可视化管理。
