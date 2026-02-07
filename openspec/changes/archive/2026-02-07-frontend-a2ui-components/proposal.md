# Feature: A2UI 动态组件库

## Summary

创建 A2UI（AI-to-UI）组件库，用于渲染 AI 返回的动态 UI 内容。包括基础组件（容器、卡片、按钮等）和业务组件（归档审核卡片、工具状态卡片等）。

## Motivation

- AI 可以返回结构化的 UI 指令（A2UI payload）
- 需要动态渲染这些 UI 组件到聊天界面中
- 业务场景需要特定组件：归档审核、工具执行状态、模板选择等
- 组件需要支持用户交互（确认、编辑、提交）

## Proposed Solution

### 1. A2UI 渲染器

创建动态渲染器，根据 payload 类型分发到对应组件：

```typescript
// packages/web/src/components/a2ui/A2UIRenderer.tsx
export function A2UIRenderer({ document, onAction }: A2UIRendererProps) {
  const componentMap = {
    container: A2UIContainer,
    card: A2UICard,
    text: A2UIText,
    button: A2UIButton,
    // ...
  };

  return <ComponentForType node={document.root} />;
}
```

### 2. 基础组件

| 组件 | 用途 |
|------|------|
| Container | 布局容器（row/column/stack） |
| Card | 带标题/副标题的卡片 |
| Text | 文本，支持 Markdown |
| Button | 操作按钮 |
| Form | 表单容器 |
| Input | 输入框（text/number/date） |
| Select | 下拉选择 |
| Badge | 状态徽章 |
| Divider | 分隔线 |

### 3. 业务组件

| 组件 | 用途 |
|------|------|
| ArchiveReviewCard | 归档审核 - 展示提取的联系人/事件/事实/待办 |
| ToolTraceCard | 工具执行状态 - 显示执行进度和结果 |
| ConfirmBar | 确认条 - 写操作的强确认 UI |
| TemplatePicker | 模板选择器 - 飞书模板选择 |
| DraftPreview | 草稿预览 - 发送前内容预览 |
| ErrorCard | 错误卡片 - 显示错误和重试选项 |

## Alternatives Considered

1. **使用现成组件库** - 无法满足 A2UI 动态渲染需求
2. **纯 JSON 展示** - 用户体验差，无法交互

## Dependencies

- 可与 `backend-vercel-ai-stream-adapter` 并行开发
- 使用现有 Tailwind CSS 样式系统

## Impact

- [ ] Breaking changes
- [ ] Database migrations
- [ ] API changes

## Files to Create

| 文件路径 | 说明 |
|----------|------|
| `packages/web/src/components/a2ui/index.ts` | 导出入口 |
| `packages/web/src/components/a2ui/A2UIRenderer.tsx` | 动态渲染器 |
| `packages/web/src/components/a2ui/types.ts` | 类型定义 |
| `packages/web/src/components/a2ui/Container.tsx` | 容器组件 |
| `packages/web/src/components/a2ui/Card.tsx` | 卡片组件 |
| `packages/web/src/components/a2ui/Text.tsx` | 文本组件 |
| `packages/web/src/components/a2ui/Button.tsx` | 按钮组件 |
| `packages/web/src/components/a2ui/Form.tsx` | 表单组件 |
| `packages/web/src/components/a2ui/Input.tsx` | 输入框组件 |
| `packages/web/src/components/a2ui/Select.tsx` | 下拉框组件 |
| `packages/web/src/components/a2ui/Badge.tsx` | 徽章组件 |
| `packages/web/src/components/a2ui/Divider.tsx` | 分隔线组件 |
| `packages/web/src/components/a2ui/domain/ArchiveReviewCard.tsx` | 归档审核卡片 |
| `packages/web/src/components/a2ui/domain/ToolTraceCard.tsx` | 工具状态卡片 |
| `packages/web/src/components/a2ui/domain/ConfirmBar.tsx` | 确认条 |
| `packages/web/src/components/a2ui/domain/TemplatePicker.tsx` | 模板选择器 |
| `packages/web/src/components/a2ui/domain/DraftPreview.tsx` | 草稿预览 |
| `packages/web/src/components/a2ui/domain/ErrorCard.tsx` | 错误卡片 |

## Acceptance Criteria

1. A2UIRenderer 可以正确渲染所有组件类型
2. 组件支持嵌套渲染
3. 操作（navigate, submit, dismiss）正确触发回调
4. 组件样式与 Tailwind 主题一致
5. 响应式适配移动端
