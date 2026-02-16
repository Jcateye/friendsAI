# Design: API Run + Legacy Bridge

## 1. Goals

- 对外提供统一执行入口（run）
- 保持 chat 流式体验与兼容性
- 在不改前端大范围代码的前提下完成桥接

## 2. Boundaries

### 2.1 独占（共享）路径
- `packages/server-nestjs/src/agent/agent.controller.ts`
- `packages/server-nestjs/src/agent/agent.module.ts`
- `packages/server-nestjs/src/agent/agent.types.ts`
- `packages/server-nestjs/src/agent/agent.orchestrator.ts`
- `packages/server-nestjs/src/briefings/**`
- `packages/server-nestjs/src/conversation-archives/**`
- `packages/server-nestjs/src/action-panel/**`

## 3. API Contract

### 3.1 POST /v1/agent/run
Request:
```json
{
  "agentId": "contact_insight",
  "operation": null,
  "input": { "contactId": "uuid-1" },
  "options": { "useCache": true, "forceRefresh": false }
}
```

Response:
```json
{
  "runId": "01...",
  "agentId": "contact_insight",
  "operation": null,
  "cached": false,
  "snapshotId": "uuid",
  "generatedAt": "2026-02-09T08:00:00.000Z",
  "data": {}
}
```

### 3.2 POST /v1/agent/chat
- 默认 `agentId=chat_conversation`
- 保持 SSE / vercel-ai stream
- 非聊天 capability 推荐走 `/agent/run`

## 4. Legacy Mapping

- `/contacts/:id/brief` -> `archive_brief + brief_generate`
- `/contacts/:id/brief/refresh` -> `archive_brief + brief_generate + forceRefresh`
- `/conversations/:id/archive` -> `archive_brief + archive_extract`
- `/action-panel/dashboard` -> `network_action` 映射旧字段

## 5. Failure Modes

1. 未知 `agentId` -> `agent_not_found`
2. operation 与 agent 不匹配 -> `agent_operation_invalid`
3. bridge 映射失败 -> `legacy_bridge_failed`

## 6. Test Plan

- run 各 agentId 路由正确
- chat 行为不回归
- 旧 endpoint 契约一致
- 异步 title_summary 触发链路可观测
