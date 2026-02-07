# Feature: 后端 Vercel AI SDK 流格式适配器

## Summary

为后端 SSE 聊天接口添加 Vercel AI SDK 兼容的流格式输出，通过 `?format=vercel-ai` 查询参数启用，保持现有格式向后兼容。

## Motivation

- 前端计划使用 Assistant-UI + Vercel AI SDK 进行 AI 聊天集成
- 后端已有完整的自定义 SSE 实现（AgentOrchestrator），无需重写
- 需要一个适配层将现有事件格式转换为 Vercel AI SDK 协议格式
- 采用混合方案：保留后端实现，新增兼容层

## Proposed Solution

### 1. 创建流格式适配器

新建 `VercelAiStreamAdapter` 类，负责将现有 `AgentStreamEvent` 转换为 Vercel AI SDK 流协议格式：

| 当前事件 | Vercel AI SDK 格式 | 说明 |
|----------|-------------------|------|
| `agent.delta` | `0:${JSON.stringify(text)}\n` | 文本流增量 |
| `agent.message` | `d:${JSON.stringify({finishReason:'stop'})}\n` | 消息完成 |
| `tool.state` (running) | `9:${JSON.stringify(toolCall)}\n` | 工具调用开始 |
| `tool.state` (succeeded) | `a:${JSON.stringify(result)}\n` | 工具执行结果 |
| `ui` (A2UI) | `2:${JSON.stringify(data)}\n` | 动态 UI 数据 |
| `error` | `3:${JSON.stringify(error)}\n` | 错误信息 |

### 2. 修改 AgentController

在 `POST /v1/agent/chat` 接口添加 `format` 查询参数：
- 默认值：`sse`（现有格式，向后兼容）
- 可选值：`vercel-ai`（Vercel AI SDK 兼容格式）

### 3. 响应头调整

Vercel AI SDK 格式需要的响应头：
```
Content-Type: text/plain; charset=utf-8
X-Vercel-AI-Data-Stream: v1
```

## Alternatives Considered

1. **完全迁移到 Vercel AI SDK** - 工作量大，需重写 AgentOrchestrator
2. **前端自行解析现有格式** - 增加前端复杂度，不符合 Assistant-UI 标准
3. **WebSocket 替代 SSE** - 改动范围过大，H5 兼容性考虑

选择适配器方案是最小改动、最大兼容的选择。

## Impact

- [ ] Breaking changes - 无，现有格式保持不变
- [ ] Database migrations - 无
- [x] API changes - 新增 `format` 查询参数（可选，向后兼容）

## Files to Modify/Create

| 操作 | 文件路径 |
|------|----------|
| 新建 | `packages/server-nestjs/src/agent/adapters/vercel-ai-stream.adapter.ts` |
| 新建 | `packages/server-nestjs/src/agent/adapters/vercel-ai-stream.adapter.spec.ts` |
| 修改 | `packages/server-nestjs/src/agent/agent.controller.ts` |

## Acceptance Criteria

1. `curl -X POST "/v1/agent/chat"` 返回现有 SSE 格式（向后兼容）
2. `curl -X POST "/v1/agent/chat?format=vercel-ai"` 返回 Vercel AI SDK 格式
3. 流格式可被 Vercel AI SDK `useChat` hook 正确解析
4. 工具调用事件正确转换
5. 现有测试全部通过
