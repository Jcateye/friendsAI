# FriendsAI 前后端功能对齐审计（2026-02-09）

## 1) 标题与元信息

| 字段 | 内容 |
|---|---|
| 文档类型 | 前后端功能对齐审计 |
| 审计日期 | 2026-02-09 |
| 审计范围 | `packages/web` + `packages/server-nestjs`（基础链路） |
| 审计方法 | 代码走读 + 构建验证 + 日志复核 |
| 结论摘要 | 当前存在若干 P0/P1 级断点，主要集中在“点击无反馈、链路未闭环、页面行为与语义不一致”。建议先完成最小修复集合后再做视觉与交互细化。 |

---

## 2) 审计范围

### 前端
- 路由与壳层：`packages/web/src/app/routes.tsx`、`packages/web/src/components/layout/*`
- 页面：`ChatPage`、`ContactsPage`、`ContactDetailPage`、`ActionsPage`、`SettingsPage`、`LoginPage`
- 关键 Hook：`useAgentChat`、`useToolConfirmations`、`useConversationHistory`、`useConversations`
- API 客户端：`packages/web/src/lib/api/client.ts`

### 后端
- 控制器/服务：`action-panel`、`agent`、`conversations`、`contacts`、`tool-confirmations`
- Agent Runtime / Stream Adapter：
  - `packages/server-nestjs/src/agent/runtime/agent-runtime-executor.service.ts`
  - `packages/server-nestjs/src/agent/adapters/vercel-ai-stream.adapter.ts`
- 聚合能力：`packages/server-nestjs/src/action-panel/action-panel/action-panel.controller.ts`

### 验证动作
- 前端构建：`bun run --cwd packages/web build`
- 后端构建：`bun run --cwd packages/server-nestjs build`
- 后端测试概览：`bun run test`
- 运行日志复核：`logs/web.log`、`logs/server.log`

---

## 3) 问题清单（按优先级）

## P0

### P0-1 菜单按钮无行为（Contacts/Actions）
- 现象：`ContactsPage` 与 `ActionsPage` 顶部展示菜单按钮，但点击无效果。
- 影响：用户感知为“按钮坏了”，无法进入统一抽屉导航（会话库/设置）。
- 代码位置：
  - `packages/web/src/components/layout/Header.tsx`
  - `packages/web/src/pages/ContactsPage/index.tsx`
  - `packages/web/src/pages/ActionsPage/index.tsx`
- 建议方向：为两页补齐 `onMenuClick`，并接入 `GlobalDrawer`，行为与 `ChatPage` 对齐。

### P0-2 工具确认链路断裂（awaiting_input 丢失）
- 现象：后端工具执行进入 `awaiting_input` 时，Vercel stream adapter 未向前端透传可解析事件，前端确认弹层很可能不出现。
- 影响：需要人工确认的工具流程无法闭环。
- 代码位置：
  - `packages/server-nestjs/src/agent/adapters/vercel-ai-stream.adapter.ts`
  - `packages/web/src/hooks/useAgentChat.ts`
  - `packages/web/src/hooks/useToolConfirmations.ts`
- 建议方向：保留并透传 `awaiting_input` 的确认元信息（含 `confirmationId`），前端按该信息进入 Overlay。

### P0-3 行动页数据源与后端聚合能力不一致
- 现象：行动页前端直接调 `/v1/agent/run`（`network_action`），未走 `/v1/action-panel/dashboard` 聚合入口。
- 影响：前端语义与后端产品层聚合不一致；数据上下文和兼容字段策略难统一。
- 代码位置：
  - `packages/web/src/pages/ActionsPage/index.tsx`
  - `packages/web/src/lib/api/client.ts`
  - `packages/server-nestjs/src/action-panel/action-panel/action-panel.controller.ts`
- 建议方向：行动页主走 `dashboard`，并在后端该接口上提供全量字段 + 兼容字段。

### P0-4 会话去重过度（同内容误去重）
- 现象：消息去重当前依赖“角色 + 内容相同”，用户连续发送同一句会被误判为重复。
- 影响：真实对话记录被吞，数据可信度下降。
- 代码位置：
  - `packages/web/src/pages/ConversationDetailPage/index.tsx`
- 建议方向：引入时间窗（例如 2~3 秒）与来源上下文判断，仅去重“历史回放 + 流式重放”重叠消息。

### P0-5 输入框文件/工具“可选但无效”
- 现象：`ChatInputBox` 支持附件和工具选择 UI，但 `ConversationDetailPage` 发送逻辑忽略 `_files/_tools`。
- 影响：用户误以为功能可用，实际不生效。
- 代码位置：
  - `packages/web/src/components/chat/ChatInputBox.tsx`
  - `packages/web/src/pages/ConversationDetailPage/index.tsx`
- 建议方向：短期收口（禁用/说明），中期补齐服务端协议与上传链路。

## P1

### P1-1 Chat “查看全部”跳错页
- 现象：最近记录区“查看全部”跳转到 `/contacts`。
- 影响：路径语义不一致，增加认知成本。
- 代码位置：
  - `packages/web/src/pages/ChatPage/index.tsx`
- 建议方向：改为打开 `GlobalDrawer` 或跳转专门会话列表页。

### P1-2 “新对话”行为无效
- 现象：顶部“新对话”按钮在 Chat 页面中仅 `navigate('/chat')`，基本无效果。
- 影响：功能预期落空。
- 代码位置：
  - `packages/web/src/pages/ChatPage/index.tsx`
- 建议方向：跳转 `/conversation/new` 或重置当前输入与会话状态。

### P1-3 TabBar 与 `/` 路由激活不一致
- 现象：路由 index 指向 `ChatPage`，但 TabBar 没有 `/` tab，进入 `/` 时激活态不稳定。
- 影响：导航反馈不一致。
- 代码位置：
  - `packages/web/src/app/routes.tsx`
  - `packages/web/src/components/layout/TabBar.tsx`
- 建议方向：统一默认入口到 `/chat` 或为 `/` 设置显式重定向。

### P1-4 Demo 默认开启导致真实链路感知偏差
- 现象：联系人页首次进入默认 Demo 模式（mock 数据）。
- 影响：用户容易误判“后端未生效/数据不一致”。
- 代码位置：
  - `packages/web/src/contexts/DemoModeContext.tsx`
- 建议方向：默认关闭 Demo（仍保留切换开关）。

### P1-5 设置页关键项无行为
- 现象：设置页条目基本为静态按钮，尤其“退出登录/清除缓存”未实现。
- 影响：功能信任感下降。
- 代码位置：
  - `packages/web/src/pages/SettingsPage/index.tsx`
- 建议方向：至少补齐“退出登录”和“清除缓存”闭环，其他项标注“即将上线”。

---

## 4) 构建与运行证据

### 前端 build 结果（失败）
- 命令：`bun run --cwd packages/web build`
- 结果：失败。
- 报错要点（TS6133 未使用变量）：
  - `packages/web/src/pages/ActionsPage/index.tsx`
    - `ChevronRight` 未使用
    - `navigate` 未使用
    - `getContactName` 未使用
  - `packages/web/src/pages/ConversationDetailPage/index.tsx`
    - `archiveData` 未使用

### 后端 build 结果（通过）
- 命令：`bun run --cwd packages/server-nestjs build`
- 结果：通过。

### 后端测试概况（历史问题，非本轮新增）
- 命令：`bun run test`
- 结果摘要：`37` 个 suite 中 `6 failed / 31 passed`；`341` 个测试中 `18 failed / 323 passed`。
- 备注：失败集中在既有模块（包含 AI 与部分控制器依赖注入场景），本轮审计未新增测试失败。

### 日志复核要点
- `logs/web.log` 可见过往代理拒绝连接（后端未就绪时）。
- `logs/server.log` 可见 `network_action` 模板渲染 warning（默认值回退），提示上下文输入质量有优化空间。

---

## 5) 风险评估

### 用户感知风险
- 点击无反馈（菜单/设置项）会被理解为系统不稳定。
- 会话消息误去重导致“我明明发了，怎么没了”的高敏感问题。
- 工具确认不弹层会让用户无法完成关键流程。

### 业务风险
- 行动页数据来源不统一可能导致建议解释口径不一致。
- Demo 默认开启在演示外场景下会干扰真实业务验证。

### 技术风险
- 占位功能长期暴露会积累临时判断分支，提升回归复杂度。
- 前端构建阻塞项不清理将持续影响交付节奏。

---

## 6) 审计结论

### 可上线前最低修复集合（Must Fix）
1. 修复 `Contacts/Actions` 菜单可用性（接入 Drawer）。
2. 打通工具确认链路（`awaiting_input` + `confirmationId` 到前端 Overlay）。
3. 行动页切换到 `/v1/action-panel/dashboard` 主链路。
4. 修复会话误去重逻辑。
5. 清理前端构建失败项并确保 `web build` 通过。

### 后续优化集合（Should Fix）
1. 新对话/查看全部语义对齐。
2. Demo 默认策略与环境策略清晰化。
3. 设置页关键动作补齐并为未实现项提供明确状态。
4. 附件/工具输入能力的完整协议与后端支持。

