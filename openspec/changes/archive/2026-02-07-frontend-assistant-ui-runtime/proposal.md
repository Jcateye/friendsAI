# Feature: 前端 Assistant-UI 运行时与 Hooks

## Summary

创建前端 AI 聊天基础设施，包括自定义 Assistant-UI 运行时、useAgentChat Hook 和 API 客户端，实现与后端 Vercel AI SDK 格式流的对接。

## Motivation

- 前端需要与后端 SSE 流式接口集成
- Assistant-UI 提供了现成的聊天 UI 组件，但需要自定义运行时适配后端
- Vercel AI SDK 的 `useChat` hook 可以简化流式消息处理
- 需要统一的 API 客户端处理非流式请求

## Proposed Solution

### 1. 创建自定义运行时

使用 Assistant-UI 的 `useLocalRuntime` 创建 `FriendsAIRuntime`，配置后端流式端点。

```typescript
// packages/web/src/lib/assistant-runtime/FriendsAIRuntime.ts
export function useFriendsAIRuntime(options: {
  conversationId?: string;
  onToolConfirmation?: (tool: ToolState) => void;
}) {
  return useLocalRuntime({
    // 配置与后端的连接
  });
}
```

### 2. 创建 useAgentChat Hook

封装 Vercel AI SDK 的 `useChat`，添加 FriendsAI 特定功能：

```typescript
// packages/web/src/hooks/useAgentChat.ts
export function useAgentChat(options: UseAgentChatOptions) {
  const chat = useChat({
    api: `/v1/agent/chat?format=vercel-ai`,
    body: { conversationId: options.conversationId },
  });

  // 工具确认状态管理
  const [pendingConfirmations, setPendingConfirmations] = useState<ToolState[]>([]);

  return {
    ...chat,
    pendingConfirmations,
    confirmTool: (id: string) => {},
    rejectTool: (id: string) => {},
  };
}
```

### 3. 创建 API 客户端

统一的 API 请求封装：

```typescript
// packages/web/src/lib/api/client.ts
export const api = {
  conversations: { list, get, create, getMessages },
  contacts: { list, get },
  toolConfirmations: { confirm, reject },
};
```

## Alternatives Considered

1. **直接使用原始 SSE** - 需要手动解析，代码复杂
2. **使用 Socket.IO** - 过于重量级，H5 兼容性问题

## Dependencies

- 依赖 `backend-vercel-ai-stream-adapter` 变更完成
- 前端已安装 `@assistant-ui/react` 和 `ai` 包

## Impact

- [ ] Breaking changes
- [ ] Database migrations
- [ ] API changes

## Files to Create

| 文件路径 | 说明 |
|----------|------|
| `packages/web/src/lib/assistant-runtime/FriendsAIRuntime.ts` | 自定义运行时 |
| `packages/web/src/lib/assistant-runtime/index.ts` | 导出入口 |
| `packages/web/src/hooks/useAgentChat.ts` | 聊天 Hook |
| `packages/web/src/hooks/useConversationHistory.ts` | 历史消息 Hook |
| `packages/web/src/lib/api/client.ts` | API 客户端 |
| `packages/web/src/lib/api/types.ts` | API 类型定义 |

## Acceptance Criteria

1. `useFriendsAIRuntime` 可以成功连接后端流式接口
2. `useAgentChat` 正确解析流式消息
3. 消息实时渲染到 UI
4. 工具状态可以被追踪和访问
5. API 客户端可以正常发送非流式请求
