# Tasks for 工具确认流程（全栈）

## 1. 后端验证

- [ ] **1.1** 验证现有 tool_confirmations 表结构
  - 确认字段：id, session_id, tool_call_id, tool_name, params, state, expires_at

- [ ] **1.2** 验证现有确认 API
  - `POST /v1/tool-confirmations/:id/confirm`
  - `POST /v1/tool-confirmations/:id/reject`

- [ ] **1.3** 验证 AgentOrchestrator 中的确认逻辑
  - 文件：`packages/server-nestjs/src/agent/agent.orchestrator.ts`
  - 确认 `awaiting_input` 状态的发送

## 2. 前端 Hook 实现

- [ ] **2.1** 创建 useToolConfirmations Hook
  - 文件：`packages/web/src/hooks/useToolConfirmations.ts`
  - 监听 SSE 中的 tool.state 事件
  - 维护 pending confirmations Map

- [ ] **2.2** 实现 confirm 方法
  ```typescript
  const confirm = async (confirmationId: string) => {
    await api.toolConfirmations.confirm(confirmationId);
    removePending(confirmationId);
  };
  ```

- [ ] **2.3** 实现 reject 方法
  ```typescript
  const reject = async (confirmationId: string, reason?: string) => {
    await api.toolConfirmations.reject(confirmationId, reason);
    removePending(confirmationId);
  };
  ```

## 3. 前端 UI 实现

- [ ] **3.1** 创建 ToolConfirmationOverlay 组件
  - 文件：`packages/web/src/components/chat/ToolConfirmationOverlay.tsx`
  - 使用 Portal 渲染到页面底部
  - 显示待确认工具信息

- [ ] **3.2** 实现工具信息展示
  - 工具名称和图标
  - 输入参数（可折叠）
  - 影响描述

- [ ] **3.3** 实现确认/取消按钮
  - 确认按钮：主色调，显眼
  - 取消按钮：次要样式

- [ ] **3.4** 实现加载状态
  - 确认中显示 loading
  - 防止重复点击

## 4. 集成到聊天页面

- [ ] **4.1** 在 ChatPage 中使用 useToolConfirmations
  ```tsx
  const { pending, confirm, reject } = useToolConfirmations(conversationId);
  ```

- [ ] **4.2** 渲染 ToolConfirmationOverlay
  ```tsx
  {pending.length > 0 && (
    <ToolConfirmationOverlay
      confirmation={pending[0]}
      onConfirm={() => confirm(pending[0].id)}
      onReject={() => reject(pending[0].id)}
    />
  )}
  ```

## 5. 测试

- [ ] **5.1** 编写 useToolConfirmations 单元测试
  - 文件：`packages/web/src/hooks/__tests__/useToolConfirmations.test.ts`
  - 测试状态管理
  - 测试 confirm/reject 调用

- [ ] **5.2** 编写 ToolConfirmationOverlay 测试
  - 文件：`packages/web/src/components/chat/__tests__/ToolConfirmationOverlay.test.tsx`
  - 测试渲染
  - 测试按钮点击

## 6. 验收

- [ ] **6.1** 触发写操作工具（如 feishu_send_message）
  - 验证确认弹层出现

- [ ] **6.2** 点击确认
  - 验证工具执行
  - 验证弹层消失
  - 验证 ToolTraceCard 状态更新

- [ ] **6.3** 点击取消
  - 验证工具不执行
  - 验证弹层消失
  - 验证错误/取消消息显示
