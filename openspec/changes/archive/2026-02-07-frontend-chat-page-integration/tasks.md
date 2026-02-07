# Tasks for 聊天页面 AI 集成

## 1. 准备工作

- [ ] **1.1** 确认前置变更已完成
  - `backend-vercel-ai-stream-adapter`
  - `frontend-assistant-ui-runtime`
  - `frontend-a2ui-components`
  - `fullstack-tool-confirmation-flow`

- [ ] **1.2** 分析现有 ChatPage 实现
  - 文件：`packages/web/src/pages/ChatPage/index.tsx`
  - 确认需要保留的 UI 元素

## 2. 创建消息渲染组件

- [ ] **2.1** 创建 CustomMessageRenderer 组件
  - 文件：`packages/web/src/components/chat/CustomMessageRenderer.tsx`
  - 检查消息 metadata 中的 A2UI 内容
  - 分发到对应渲染器

- [ ] **2.2** 处理普通文本消息
  - 支持 Markdown 渲染
  - 支持代码高亮

- [ ] **2.3** 处理 A2UI 消息
  - 使用 A2UIRenderer 渲染
  - 处理 action 回调

- [ ] **2.4** 处理工具状态消息
  - 使用 ToolTraceCard 渲染
  - 显示执行进度

## 3. 创建输入组件

- [ ] **3.1** 创建 ChatComposer 组件
  - 文件：`packages/web/src/components/chat/ChatComposer.tsx`
  - 文本输入框
  - 发送按钮
  - 可选：语音/图片按钮（占位）

- [ ] **3.2** 集成 Vercel AI SDK
  - 使用 useAgentChat 的 input/handleSubmit
  - 显示发送中状态

## 4. 重构 ChatPage

- [ ] **4.1** 引入 Assistant-UI
  ```tsx
  import { Thread, AssistantRuntimeProvider } from '@assistant-ui/react';
  ```

- [ ] **4.2** 设置运行时
  ```tsx
  const runtime = useFriendsAIRuntime({
    conversationId,
    onToolConfirmation: handleToolConfirmation,
  });
  ```

- [ ] **4.3** 渲染 Thread
  ```tsx
  <Thread
    components={{
      Message: CustomMessageRenderer,
      Composer: ChatComposer,
    }}
  />
  ```

- [ ] **4.4** 添加 ToolConfirmationOverlay
  - 使用 useToolConfirmations hook
  - 渲染确认弹层

## 5. 重构 ConversationDetailPage

- [ ] **5.1** 加载会话历史
  ```tsx
  const { messages } = useConversationHistory(conversationId);
  ```

- [ ] **5.2** 初始化运行时时传入历史消息

- [ ] **5.3** 复用 ChatPage 的聊天组件

## 6. 会话管理

- [ ] **6.1** 实现新建会话
  - 调用 `api.conversations.create()`
  - 跳转到新会话页面

- [ ] **6.2** 实现会话列表更新
  - 发送消息后刷新列表
  - 更新 lastMessage 预览

## 7. 错误处理

- [ ] **7.1** 处理连接错误
  - 显示重连提示
  - 自动重试机制

- [ ] **7.2** 处理发送失败
  - 显示错误 Toast
  - 提供重发选项

## 8. 测试

- [ ] **8.1** 编写组件测试
  - CustomMessageRenderer
  - ChatComposer

- [ ] **8.2** E2E 测试
  - 文件：`packages/web/e2e/chat-flow.spec.ts`
  - 发送消息流程
  - 工具确认流程

## 9. 验收

- [ ] **9.1** 基础聊天
  - 发送消息
  - 接收流式响应
  - 消息正确显示

- [ ] **9.2** 工具执行
  - 触发工具调用
  - 查看 ToolTraceCard
  - 完成工具确认

- [ ] **9.3** A2UI 渲染
  - 触发 AI 返回 A2UI
  - 查看 ArchiveReviewCard
  - 完成交互操作

- [ ] **9.4** 会话历史
  - 打开现有会话
  - 查看历史消息
  - 继续对话
