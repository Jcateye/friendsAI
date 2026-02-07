# Tasks for A2UI 动态组件库

## 1. 设计与准备

- [ ] **1.1** 研究后端 A2UI Schema
  - 文件：`packages/server-nestjs/src/ai/a2ui.schema.ts`
  - 确认所有组件类型和属性

- [ ] **1.2** 创建前端类型定义
  - 文件：`packages/web/src/components/a2ui/types.ts`
  - 与后端 schema 保持一致
  - 使用 Zod 定义运行时校验

## 2. 创建基础组件

- [ ] **2.1** 创建 Container 组件
  - 文件：`packages/web/src/components/a2ui/Container.tsx`
  - 支持 direction: row | column | stack
  - 支持 gap, padding 属性

- [ ] **2.2** 创建 Card 组件
  - 文件：`packages/web/src/components/a2ui/Card.tsx`
  - 支持 title, subtitle, children
  - 支持可折叠

- [ ] **2.3** 创建 Text 组件
  - 文件：`packages/web/src/components/a2ui/Text.tsx`
  - 支持 Markdown 渲染
  - 支持 variant: body | heading | caption

- [ ] **2.4** 创建 Button 组件
  - 文件：`packages/web/src/components/a2ui/Button.tsx`
  - 支持 variant: primary | secondary | danger
  - 支持 onClick action

- [ ] **2.5** 创建 Form 组件
  - 文件：`packages/web/src/components/a2ui/Form.tsx`
  - 管理表单状态
  - 支持 onSubmit action

- [ ] **2.6** 创建 Input 组件
  - 文件：`packages/web/src/components/a2ui/Input.tsx`
  - 支持 type: text | number | date
  - 支持 label, placeholder, validation

- [ ] **2.7** 创建 Select 组件
  - 文件：`packages/web/src/components/a2ui/Select.tsx`
  - 支持 options 配置
  - 支持单选/多选

- [ ] **2.8** 创建 Badge 组件
  - 文件：`packages/web/src/components/a2ui/Badge.tsx`
  - 支持 variant: success | warning | error | info

- [ ] **2.9** 创建 Divider 组件
  - 文件：`packages/web/src/components/a2ui/Divider.tsx`

## 3. 创建业务组件

- [ ] **3.1** 创建 ArchiveReviewCard 组件
  - 文件：`packages/web/src/components/a2ui/domain/ArchiveReviewCard.tsx`
  - 展示提取的联系人、事件、事实、待办
  - 支持编辑和确认操作

- [ ] **3.2** 创建 ToolTraceCard 组件
  - 文件：`packages/web/src/components/a2ui/domain/ToolTraceCard.tsx`
  - 显示工具名称、状态图标
  - 可折叠显示输入/输出
  - 状态：queued | running | succeeded | failed | awaiting_input

- [ ] **3.3** 创建 ConfirmBar 组件
  - 文件：`packages/web/src/components/a2ui/domain/ConfirmBar.tsx`
  - 固定在底部
  - 显示操作描述
  - 确认/取消按钮

- [ ] **3.4** 创建 TemplatePicker 组件
  - 文件：`packages/web/src/components/a2ui/domain/TemplatePicker.tsx`
  - 模板列表展示
  - 选中状态

- [ ] **3.5** 创建 DraftPreview 组件
  - 文件：`packages/web/src/components/a2ui/domain/DraftPreview.tsx`
  - 预览生成的内容
  - 支持多版本切换

- [ ] **3.6** 创建 ErrorCard 组件
  - 文件：`packages/web/src/components/a2ui/domain/ErrorCard.tsx`
  - 显示错误信息
  - 重试按钮

## 4. 创建渲染器

- [ ] **4.1** 创建 A2UIRenderer 组件
  - 文件：`packages/web/src/components/a2ui/A2UIRenderer.tsx`
  - 根据节点类型分发到对应组件
  - 递归渲染子节点
  - 处理 action 回调

- [ ] **4.2** 创建导出入口
  - 文件：`packages/web/src/components/a2ui/index.ts`

## 5. 测试

- [ ] **5.1** 编写组件单元测试
  - 文件：`packages/web/src/components/a2ui/__tests__/`
  - 测试各组件渲染
  - 测试 action 触发

## 6. 验收

- [ ] **6.1** 测试 A2UIRenderer 渲染复杂嵌套结构
- [ ] **6.2** 验证 ToolTraceCard 状态展示
- [ ] **6.3** 验证 ArchiveReviewCard 编辑功能
