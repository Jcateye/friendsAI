# Feature: 聊天页面 AI 集成

## Summary

将 AI 聊天功能集成到现有的 ChatPage 和 ConversationDetailPage，实现真实的流式 AI 对话体验。

## Motivation

- 当前 ChatPage 使用 Mock 数据，需要接入真实 AI
- 需要展示流式消息、工具执行状态、A2UI 组件
- 需要支持会话历史加载和持久化
- 这是整个 AI 集成的最终交付页面

## Proposed Solution

### 1. 重构 ChatPage

使用 Assistant-UI 的 Thread 组件替换当前实现：

```tsx
// packages/web/src/pages/ChatPage/index.tsx
import { Thread } from '@assistant-ui/react';
import { useFriendsAIRuntime } from '@/lib/assistant-runtime';

export function ChatPage() {
  const runtime = useFriendsAIRuntime({ conversationId });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread components={{ Message: CustomMessageRenderer }} />
      <ToolConfirmationOverlay />
    </AssistantRuntimeProvider>
  );
}
```

### 2. 自定义消息渲染

创建 CustomMessageRenderer 处理：
- 普通文本消息
- A2UI 组件（通过 A2UIRenderer）
- 工具执行状态（ToolTraceCard）
- 引用高亮（Citations）

### 3. 会话管理

- 新建会话时创建 conversation
- 打开现有会话时加载历史消息
- 消息发送后更新会话列表

## Dependencies

- 依赖所有前置变更完成：
  - `backend-vercel-ai-stream-adapter`
  - `frontend-assistant-ui-runtime`
  - `frontend-a2ui-components`
  - `fullstack-tool-confirmation-flow`

## Impact

- [ ] Breaking changes - 现有 ChatPage 将被重构
- [ ] Database migrations
- [ ] API changes

## Files to Modify/Create

| 操作 | 文件路径 |
|------|----------|
| 修改 | `packages/web/src/pages/ChatPage/index.tsx` |
| 修改 | `packages/web/src/pages/ConversationDetailPage/index.tsx` |
| 新建 | `packages/web/src/components/chat/CustomMessageRenderer.tsx` |
| 新建 | `packages/web/src/components/chat/ChatComposer.tsx` |

## Acceptance Criteria

1. ChatPage 展示真实 AI 聊天界面
2. 消息流式显示，无明显延迟
3. 工具执行通过 ToolTraceCard 可视化
4. A2UI 组件在消息中内联渲染
5. 会话历史正确加载
6. 工具确认流程正常工作
7. 错误状态有 Toast 提示
