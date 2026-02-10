# FriendsAI 前后端对齐修复执行方案（2026-02-09）

## 1) 标题与目标

- 标题：`FriendsAI 前后端对齐修复执行方案（2026-02-09）`
- 目标：修复 `P0+P1` 级问题，保证核心流程可用、页面行为一致、前后端语义一致，并消除当前前端构建阻塞。

---

## 2) In / Out Scope

### In Scope（本轮实施）
1. 菜单、跳转与抽屉导航对齐（Chat/Contacts/Actions）。
2. 工具确认链路打通（后端流式事件 -> 前端确认弹层）。
3. 行动页切换到聚合接口（`/v1/action-panel/dashboard`）。
4. 会话去重策略修正（避免同内容误去重）。
5. 快修项：设置页关键动作、联系人搜索筛选。
6. Demo 默认值调整为关闭。
7. 前端构建错误清理。

### Out Scope（本轮不做）
1. 完整附件上传端到端链路（存储/解析/消息协议全套）。
2. 设置页全量功能重构（通知、AI 设置、反馈工作流）。
3. 全量历史测试治理（仅保证不新增失败，并确保本轮改动可验证）。

---

## 3) 重要 API / 接口 / 类型变更（Public Interfaces）

## 3.1 Frontend 新增与调整

### API Client 新增
- 在 `packages/web/src/lib/api/client.ts` 新增：
  - `api.actionPanel.getDashboard()`

#### 目标请求
- `GET /v1/action-panel/dashboard`

#### 目标响应（前端消费）
- `followUps`
- `recommendations`
- `synthesis`
- `nextActions`
- `metadata`
- （兼容）`recommendedContacts`

### 类型新增/调整
- 在 `packages/web/src/lib/api/types.ts` 新增：
  - `ActionPanelFollowUp`
  - `ActionPanelRecommendation`
  - `ActionPanelNextAction`
  - `ActionPanelDashboardResponse`
- 若已有近似类型，改为统一引用，避免 `ActionsPage` 同时依赖 `agent-types` 与临时结构。

## 3.2 Backend 增强

### 接口增强
- `GET /v1/action-panel/dashboard` 统一返回“可直接驱动行动页”的结构：
  - `followUps`
  - `recommendations`
  - `synthesis`
  - `nextActions`
  - `metadata`
  - `recommendedContacts`（兼容字段，保留一个迭代周期）

### 兼容策略
- 前端采用“新字段优先、旧字段兜底”。
- 后端在过渡期同时输出兼容字段，避免旧页面/脚本立即中断。

## 3.3 流式协议变更（工具确认）

### 问题
- `awaiting_input` 目前在 Vercel adapter 侧被丢弃，前端无法稳定拿到确认信息。

### 目标
- 当工具状态为 `awaiting_input` 时，事件中必须可被前端解析出：
  - `toolCallId`
  - `toolName`
  - `confirmationId`
  - `message`（可选）

### 前端解析侧
- `useAgentChat` 的 `extractToolStates` 必须把该事件归类成可进入确认队列的状态。

---

## 4) 分模块实施清单（Decision Complete）

## M1: P0 主链路修复

### 4.1 导航与菜单修复（Chat/Contacts/Actions）

#### 变更文件
- `packages/web/src/pages/ChatPage/index.tsx`
- `packages/web/src/pages/ContactsPage/index.tsx`
- `packages/web/src/pages/ActionsPage/index.tsx`
- `packages/web/src/components/layout/GlobalDrawer.tsx`

#### 实施规则
1. `ContactsPage`、`ActionsPage` 补齐 `isDrawerOpen` 状态与 `onMenuClick`。
2. 两页接入 `<GlobalDrawer />`，参数结构与 `ChatPage` 保持一致。
3. `ChatPage` 的“查看全部”改为打开 Drawer，不再跳 `contacts`。
4. `ChatPage` 的“新对话”改为跳转 `/conversation/new`。

### 4.2 行动页切换聚合接口

#### 变更文件
- `packages/web/src/lib/api/client.ts`
- `packages/web/src/lib/api/types.ts`
- `packages/web/src/pages/ActionsPage/index.tsx`
- `packages/server-nestjs/src/action-panel/action-panel/action-panel.controller.ts`

#### 实施规则
1. 前端新增 `api.actionPanel.getDashboard()`。
2. `ActionsPage` 改为主调用 `getDashboard()`。
3. 页面渲染优先读：`synthesis/recommendations/nextActions/followUps`。
4. 如后端仍返回旧字段，仅作为兜底映射，不影响页面可用。
5. 后端 `dashboard` 输出统一结构（含兼容字段）。

### 4.3 工具确认链路打通

#### 变更文件
- `packages/server-nestjs/src/agent/adapters/vercel-ai-stream.adapter.ts`
- `packages/web/src/hooks/useAgentChat.ts`
- `packages/web/src/hooks/useToolConfirmations.ts`

#### 实施规则
1. Adapter 遇到 `awaiting_input` 不再 `return null`。
2. 以可被前端解析的格式输出确认元信息（含 `confirmationId`）。
3. 前端 `extractToolStates` 解析后，将该工具状态置为 `awaiting_input`。
4. `useToolConfirmations` 只消费带 `confirmationId` 的待确认项。
5. `ToolConfirmationOverlay` 使用现有 confirm/reject API 闭环。

### 4.4 会话去重策略修正

#### 变更文件
- `packages/web/src/pages/ConversationDetailPage/index.tsx`
- （可选）抽离：`packages/web/src/lib/messages/mergeMessages.ts`

#### 实施规则
1. 去重判定加入时间窗（建议 `<= 3000ms`）。
2. 仅对“历史回放 + 流式重放同一条”进行去重。
3. 用户主动重复发送（同文案）必须保留。
4. 若抽离纯函数，补对应单元测试。

## M2: P1 快修与构建收口

### 4.5 占位快修（设置页 + 联系人页）

#### 变更文件
- `packages/web/src/pages/SettingsPage/index.tsx`
- `packages/web/src/pages/ContactsPage/index.tsx`
- `packages/web/src/lib/api/client.ts`（若补 logout helper）

#### 实施规则
1. 设置页“退出登录”：调用 `api.auth.logout`（失败兜底）+ 清 token + 跳 `/login`。
2. 设置页“清除缓存”：清除本地缓存键并提示成功。
3. 设置页其余未实现项：明确标记“即将上线”或禁用态。
4. 联系人搜索框改受控，支持按 `name/company/tags` 本地过滤。
5. 筛选 Chip（全部/最近/重要）至少具备最小可用筛选逻辑。

### 4.6 Demo 默认关闭

#### 变更文件
- `packages/web/src/contexts/DemoModeContext.tsx`

#### 实施规则
1. 无 localStorage 值时默认 `false`。
2. 若已存值，保持用户上次选择。

### 4.7 前端构建错误清理

#### 变更文件
- `packages/web/src/pages/ActionsPage/index.tsx`
- `packages/web/src/pages/ConversationDetailPage/index.tsx`

#### 实施规则
1. 删除未使用 import/变量。
2. `bun run --cwd packages/web build` 必须通过。

## M3: 回归验证与发布说明

### 4.8 回归动作
1. 手工链路回归（见第 5 节验收场景）。
2. 编译回归：前后端 build 通过。
3. 若新增测试，保证通过且不破坏现有基线。

### 4.9 发布说明
- 输出一份简短 changelog，分“行为修复 / 兼容变更 / 已知未覆盖”。

---

## 5) 验收测试与场景（必须通过）

## A. 导航与点击
1. `ContactsPage` 点击菜单按钮可打开 Drawer。
2. `ActionsPage` 点击菜单按钮可打开 Drawer。
3. `ChatPage` “查看全部”不再跳联系人，改为打开会话抽屉。
4. `ChatPage` “新对话”进入 `/conversation/new`。

## B. 行动页
1. 行动页请求接口为 `/v1/action-panel/dashboard`。
2. 页面可渲染 `synthesis/recommendations/nextActions/followUps`。
3. 兼容字段存在时不报错，仍可展示。
4. 刷新按钮连续点击无异常状态残留。

## C. 工具确认
1. 触发需确认工具后出现确认弹层。
2. 点击确认：调用 `/v1/tool-confirmations/:id/confirm` 成功并关闭弹层。
3. 点击拒绝：调用 `/v1/tool-confirmations/:id/reject` 成功并关闭弹层。

## D. 会话消息
1. 用户连续发送同文案（间隔 > 时间窗）保留两条。
2. 历史 + 流式重放同条消息仅显示一条。
3. 停止生成后，用户输入消息不丢。

## E. 快修项
1. 设置页“退出登录”后跳转登录并失去受保护路由访问权限。
2. 设置页“清除缓存”可执行并可感知结果。
3. 联系人搜索与筛选 Chip 生效。
4. Demo 默认首次为关闭（无缓存时）。

## F. 构建
1. `bun run --cwd packages/web build` 通过。
2. `bun run --cwd packages/server-nestjs build` 通过。

---

## 6) 回滚与兼容策略

1. **接口兼容**：`dashboard` 保留 `recommendedContacts` 过渡字段一版迭代周期。
2. **前端兜底**：页面渲染采用“新字段优先、旧字段兜底”。
3. **流式确认变更**：若线上解析异常，可临时回退前端解析逻辑到现有行为，并在后端保留老格式旁路。
4. **逐步收口**：占位快修保持最小侵入，避免一次性重构导致风险扩大。

---

## 7) 里程碑与交付

## M1（P0 主链路修复）
- 菜单与抽屉导航对齐。
- 行动页切换聚合接口。
- 工具确认链路可用。
- 会话去重修正。

## M2（P1 快修与构建收口）
- 设置页关键动作可用。
- 联系人搜索/筛选可用。
- Demo 默认关闭。
- 前端 build 通过。

## M3（回归与发布说明）
- 核心场景回归通过。
- 输出发布说明与已知问题清单。

---

## 默认假设（已锁定）

1. 日期格式：`YYYY-MM-DD`（本次固定 `2026-02-09`）。
2. 文档目录：`docs/`。
3. 文档语言：中文。
4. 修复范围：`P0+P1`。
5. 行动页数据源：`/v1/action-panel/dashboard`。
6. Demo 默认：关闭。
7. 占位功能策略：顺手补快修（最小可用 + 明确提示）。
