# Tasks for 前端 Assistant-UI 运行时与 Hooks

## 1. 设计与准备

- [ ] **1.1** 研究 Assistant-UI 运行时 API
  - 阅读 [Assistant-UI Runtime](https://www.assistant-ui.com/docs/runtimes)
  - 确认 `useLocalRuntime` 的配置选项

- [ ] **1.2** 研究 Vercel AI SDK useChat Hook
  - 阅读 [useChat API Reference](https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat)
  - 确认流解析和状态管理机制

## 2. 创建 API 客户端

- [ ] **2.1** 创建 API 类型定义
  - 文件：`packages/web/src/lib/api/types.ts`
  - 定义 Conversation, Message, Contact, ToolState 等类型

- [ ] **2.2** 创建 API 客户端
  - 文件：`packages/web/src/lib/api/client.ts`
  - 实现 conversations, contacts, toolConfirmations 模块
  - 添加 Authorization header 处理
  - 添加错误处理

## 3. 创建 Hooks

- [ ] **3.1** 创建 useAgentChat Hook
  - 文件：`packages/web/src/hooks/useAgentChat.ts`
  - 封装 Vercel AI SDK 的 useChat
  - 添加 conversationId 参数支持
  - 添加工具确认状态管理

- [ ] **3.2** 创建 useConversationHistory Hook
  - 文件：`packages/web/src/hooks/useConversationHistory.ts`
  - 加载指定会话的历史消息
  - 支持分页加载

- [ ] **3.3** 创建 useConversations Hook
  - 文件：`packages/web/src/hooks/useConversations.ts`
  - 管理会话列表
  - 支持创建新会话

## 4. 创建 Assistant-UI 运行时

- [ ] **4.1** 创建 FriendsAIRuntime
  - 文件：`packages/web/src/lib/assistant-runtime/FriendsAIRuntime.ts`
  - 实现 useLocalRuntime 配置
  - 处理后端流式连接

- [ ] **4.2** 创建运行时提供者组件
  - 文件：`packages/web/src/lib/assistant-runtime/FriendsAIProvider.tsx`
  - 封装 AssistantRuntimeProvider
  - 集成认证和会话上下文

- [ ] **4.3** 导出入口
  - 文件：`packages/web/src/lib/assistant-runtime/index.ts`

## 5. 测试

- [ ] **5.1** 编写 useAgentChat 单元测试
  - 文件：`packages/web/src/hooks/__tests__/useAgentChat.test.ts`
  - Mock SSE 响应
  - 测试消息状态更新

- [ ] **5.2** 编写 API 客户端测试
  - 文件：`packages/web/src/lib/api/__tests__/client.test.ts`
  - Mock fetch 请求
  - 测试错误处理

## 6. 验收

- [ ] **6.1** 创建简单测试页面验证连接
  ```tsx
  // 临时测试代码
  const { messages, sendMessage } = useAgentChat({ conversationId: 'test' });
  console.log('Messages:', messages);
  ```

- [ ] **6.2** 验证流式消息接收
  - 发送消息后，控制台应显示流式更新

- [ ] **6.3** 验证工具状态追踪
  - 触发工具调用，验证 pendingConfirmations 更新
