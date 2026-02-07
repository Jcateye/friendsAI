# Feature: 工具确认流程（全栈）

## Summary

实现写操作工具的用户确认流程，确保敏感操作（如发送消息、创建实例）在执行前获得用户明确确认。

## Motivation

- 写/发/改状态类工具可能造成不可逆影响
- 需要让用户在执行前看到将要做什么
- 防止 AI 误操作导致的问题
- 符合设计文档中的"强确认"原则

## Proposed Solution

### 1. 确认流程

```
1. Agent 调用 requiresConfirmation=true 的工具
   ↓
2. 后端创建 tool_confirmations 记录 (state=pending)
   ↓
3. 后端发送 SSE tool.state 事件 (status=awaiting_input)
   ↓
4. 前端显示 ToolConfirmationOverlay
   ↓
5a. 用户确认 → POST /v1/tool-confirmations/:id/confirm → 执行工具
5b. 用户拒绝 → POST /v1/tool-confirmations/:id/reject → 取消
   ↓
6. 后端继续发送后续事件
```

### 2. 前端组件

**useToolConfirmations Hook**：
- 监听 SSE 中的 `tool.state` 事件
- 筛选 `status=awaiting_input` 的工具
- 提供 `confirm()` 和 `reject()` 方法

**ToolConfirmationOverlay 组件**：
- 显示工具名称和描述
- 显示输入参数
- 显示影响范围说明
- 确认/取消按钮

### 3. 后端 API

已有 `POST /v1/tool-confirmations/:id/confirm` 和 `/reject` 接口，需要验证和完善。

## Alternatives Considered

1. **前端自行判断** - 不够安全，后端无法控制
2. **双重确认** - 用户体验差，过于繁琐

## Dependencies

- 依赖 `frontend-assistant-ui-runtime` 变更完成
- 依赖 `frontend-a2ui-components` 中的 ConfirmBar 组件

## Impact

- [ ] Breaking changes
- [ ] Database migrations
- [ ] API changes

## Files to Create/Modify

| 操作 | 文件路径 |
|------|----------|
| 新建 | `packages/web/src/hooks/useToolConfirmations.ts` |
| 新建 | `packages/web/src/components/chat/ToolConfirmationOverlay.tsx` |
| 修改 | `packages/server-nestjs/src/tool-confirmations/` (验证现有实现) |

## Acceptance Criteria

1. 写操作工具触发确认 UI
2. 用户可以看到工具将要做什么
3. 确认后工具正确执行
4. 拒绝后工具不执行
5. 超时（5分钟）自动取消
6. 多个待确认工具正确处理
