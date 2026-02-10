# FriendsAI 当前预计现状（2026-02-04）

> 本文档以**当前仓库代码**为准，结合以下需求/设计文档对照评估：
> - `designs/人脉管理系统.pdf`（产品 MVP 范围与主流程）
> - `designs/tech_design.md`（Conversation-first / SSE / A2UI / 工具确认 / 引用追溯等技术设计）
> - `designs/implementation-plan.md`（任务拆分参考；其中部分结论与代码不一致，以本报告为准）
>
> 评估口径：优先看**端到端闭环是否可跑通**；仅有 UI 或仅有接口但未串联，记为“部分完成”。

**生成时间**：2026-02-04  
**总体完成度（端到端口径）**：约 **35% ~ 45%**  

---

## 0. TL;DR（结论）

1. **当前可运行主线**是：`packages/client`（Taro 前端） + `packages/server`（Express 后端）。两者在 **`/v1` 前缀**上对齐：  
   - Express：`packages/server/src/app/app.ts` 挂载 `app.use('/v1', router)`  
   - Client：`packages/client/src/services/api.ts` 默认 `BASE_URL = http://localhost:3000/v1`
2. **NestJS 后端（`packages/server-nestjs`）已实现一部分“AI Native”核心（Agent SSE、工具、A2UI schema 等）**，但与当前前端的鉴权/路由契约不一致，尚未接入主线，整体处于“并行试验”状态。
3. **MVP 最关键闭环**（会后记录 → AI 解析 → 用户确认归档 → 联系人画像/时间轴/待办更新）目前 **Express 后端能力基本具备**，但**前端未完成对接**（`pages/conversation-detail` 仍为 mock 数据），因此整体端到端完成度被显著拉低。

---

## 1. 当前代码实际形态（以运行脚本与路由契约为准）

### 1.1 主线（当前脚本 `project.sh start:mvp` 所启动的）：Express（`packages/server`）

**特点**：以“日记/纪要（journal_entry）”承载会后记录；以“chat_session/chat_message”承载一个可演示的聊天壳（但回复为硬编码）。

- API 前缀：`/v1`（`packages/server/src/app/app.ts`）
- 已具备能力（后端）：
  - ✅ 登录/注册/JWT 刷新（`packages/server/src/presentation/http/routes/auth.ts`）
  - ✅ 联系人 CRUD + tags/identities（`packages/server/src/presentation/http/routes/contacts.ts`）
  - ✅ 联系人上下文 & 会前简报（`/v1/contacts/:id/context`、`/v1/contacts/:id/brief`，见 `packages/server/src/presentation/http/routes/context.ts`）
  - ✅ 会后记录创建（`/v1/journal-entries`）+ AI 提取（`/v1/journal-entries/:id/extract`）+ 确认归档（`/v1/journal-entries/:id/confirm`）（`packages/server/src/presentation/http/routes/journal.ts`）
  - ✅ 待办/工具任务（action_item/tool_task）与 worker 执行（`packages/server/src/presentation/http/routes/action.ts`、`packages/server/src/presentation/http/routes/toolTasks.ts`、`packages/server/src/worker.ts`）
  - ⚠️ 飞书模板/发送（mock） （`packages/server/src/presentation/http/routes/feishu.ts` + `packages/server/src/infrastructure/tools/provider.ts`）
  - 🔴 “聊天 AI”仍为硬编码回复（`packages/server/src/presentation/http/routes/chat.ts` 的 `buildAssistantReply`）

### 1.2 并行线（未接入当前前端主线）：NestJS（`packages/server-nestjs`）

**特点**：实现了更接近 `tech_design.md` 的 Agent 编排与 SSE，但与现有前端契约不一致（鉴权/路由前缀/数据形状）。

- ✅ SSE 端点：`POST /v1/agent/chat`（`packages/server-nestjs/src/agent/agent.controller.ts`）
- ✅ Agent 编排：`AgentOrchestrator`（`packages/server-nestjs/src/agent/agent.orchestrator.ts`）
- ✅ 工具执行策略（含 requires_confirmation）：`ToolExecutionStrategy`（`packages/server-nestjs/src/ai/tools/tool-execution.strategy.ts`）
- ✅ A2UI Schema（Zod）：`packages/server-nestjs/src/ai/a2ui.schema.ts`
- ✅ 实体：`tool_confirmations` / `connector_tokens`（`packages/server-nestjs/src/entities/*.entity.ts`）
- ⚠️ 鉴权：`auth` 仅返回 `{id,email}`，没有 JWT/accessToken（`packages/server-nestjs/src/auth/auth.controller.ts`）
- ⚠️ 多处 controller 仍用 `mock-user-id`（例如 `packages/server-nestjs/src/conversations/conversations.controller.ts`）
- ⚠️ 大多数 controller 未统一 `/v1` 前缀（只有 agent 是 `/v1/agent`），与当前 client 默认 `BASE_URL=/v1` 不兼容

---

## 2. MVP 需求完成度矩阵（来自 `人脉管理系统.pdf`）

> 标记说明：✅ 端到端可用；⚠️ 部分完成/可演示但不闭环；❌ 基本未实现或未接入

| MVP 模块 | 前端（packages/client） | Express 后端（packages/server） | NestJS 后端（packages/server-nestjs） | 关键说明 |
|---|---|---|---|---|
| 登录/注册 | ✅ | ✅ | ⚠️ | NestJS 的 auth 返回不含 token，无法直接替换现有前端 |
| 对话（记录输入） | ⚠️ | ✅ | ⚠️ | 前端“对话 Tab”走 `/chat/sessions`；“会后记录”入口与详情页未闭环 |
| 对话详情（AI 解析 + 确认归档） | ❌ | ⚠️ | ⚠️ | Express 已有 extract/confirm；前端 `pages/conversation-detail` 仍为 mock |
| 联系人列表 | ✅ | ✅ | ⚠️ | NestJS 分页结构与 userId 写入/校验未完善 |
| 联系人详情（画像/标签/时间轴/会前简报） | ⚠️ | ✅ | ⚠️ | 前端简报刷新已对接；开始对话/编辑等仍是占位 |
| 行动（待跟进 / AI 建议 / 回顾） | ⚠️ | ⚠️ | ⚠️ | Express 有 action_item/tool_task 与页面展示；“AI 建议联系谁/周回顾”未闭环 |
| 设置（账号/导出/AI偏好/通知/反馈） | ⚠️ | ❌ | ❌ | 前端多为本地 UI；后端缺少导出/偏好/反馈等端点 |
| 侧边栏 Drawer（记录库 + 设置入口） | ⚠️ | N/A | N/A | Drawer UI 有，但记录类型与跳转不一致（见第 4 节） |
| 连接器（飞书） | ⚠️ | ⚠️ | ⚠️ | Express：模板+发送为 mock；NestJS：authorize URL 可生成，但 token 交换/刷新未实现 |

---

## 3. 技术设计增强项完成度（来自 `tech_design.md`）

| 能力 | 前端现状 | Express 后端现状 | NestJS 后端现状 | 备注 |
|---|---|---|---|---|
| Conversation-first 多轮多消息（像 ChatGPT） | ⚠️ | ⚠️ | ✅/⚠️ | Express chat 仅存储+硬编码回复；NestJS 有 Agent SSE，但未接入前端 |
| SSE 流式聊天 | ⚠️（基础设施有，但未接入页面） | ❌ | ✅ | 前端 `useAgentChat` 存在，但当前页面未使用且期望端点在 Express 不存在 |
| A2UI（Server-driven UI） | ⚠️（组件存在，但未使用） | ❌ | ⚠️（schema 有，生成逻辑未贯通） | 前端 `components/A2UIRenderer` 目前无页面引用 |
| 工具执行 Trace（聊天内展示过程） | ⚠️（卡片组件存在但未使用） | ⚠️（tool_task/worker 是离线执行） | ⚠️（ToolExecutionStrategy 有，但与 DB tool_confirmations 体系并行） | “实时工具 trace”未打通 |
| 工具强确认（写/发类工具必须确认） | ⚠️ | ⚠️ | ⚠️ | 目前存在两套确认机制（tool_task vs tool_confirmations），需统一 |
| 引用追溯（citations） | ❌ | ❌ | ❌ | 前端虽有 `CitationHighlight`，但后端未产出 citations |
| 向量检索 | ⚠️ | ⚠️ | ⚠️ | Express：写入 `embedding`，联系人简报会做相似历史召回；NestJS：VectorService/ContextBuilderService 有但未接主链路 |

---

## 4. 当前最关键的“断点/错配”（建议优先修）

1. **主线后端（Express）与并行后端（NestJS）并存，契约不统一**  
   - Client 默认 `BASE_URL=/v1` + JWT（`packages/client/src/services/api.ts`）  
   - NestJS 除 agent 外多数路由无 `/v1` 前缀，auth 也不发 token
2. **会后记录闭环未打通（这是 MVP 的核心）**  
   - 后端已具备：`POST /v1/journal-entries/:id/extract`、`POST /v1/journal-entries/:id/confirm`  
   - 前端详情页仍为 mock：`packages/client/src/pages/conversation-detail/index.tsx`
3. **Drawer 的“记录库”数据类型与跳转页面不一致**  
   - Drawer 展示的是 `chatApi.listSessions()` 的会话，但点击跳转 `pages/conversation-chat`，该页又走 `conversationApi.getDetail()`（journal_entry）  
   - 相关文件：`packages/client/src/components/GlobalDrawer/index.tsx`、`packages/client/src/pages/conversation/index.tsx`、`packages/client/src/pages/conversation-chat/index.tsx`
4. **聊天 AI 仍为硬编码**（影响“AI 原生”演示效果）  
   - `packages/server/src/presentation/http/routes/chat.ts` 的 `buildAssistantReply`
5. **工具确认机制分裂**  
   - Express：`tool_task`（行动项侧确认）  
   - NestJS：`tool_confirmations`（聊天/工具侧确认）  
   - 前端：`pages/conversation-chat` 调 `toolConfirmationApi`，但当前主线后端并不提供该 API

---

## 5. 建议的“最短可交付路径”（2~5 天内拉起 PDF 的 MVP 闭环）

> 目标：优先基于 **Express 主线**把 PDF 的主流程跑通（会后记录→解析→确认→沉淀）。

1. **把 `pages/conversation-detail` 改为真实对接 journal extract/confirm**  
   - create：`conversationApi.create`（已存在）  
   - extract：`journalApi.extract` / `journalApi.listExtracted`（已存在）  
   - confirm：`journalApi.confirmExtracted`（已存在）
2. **统一“记录库”的数据源与跳转**（选一种：chat_session 或 journal_entry）  
   - 若以“会后记录”为核心：Drawer 与列表应展示 journal_entry，并跳转 conversation-detail  
   - 若以“聊天”为核心：conversation-chat 页面应改为基于 chat_session
3. **把“飞书”先保持为 mock，但把确认交互统一**  
   - 短期可用 modal（现 `pages/conversation` 已这么做），中期再统一到某一种 confirmation 体系

---

## 6. 备注：对现有计划文档的校正点

- `designs/implementation-plan.md` 中提到的“contextRouter 未挂载”等结论与代码不一致：  
  - `contextRouter` 实际是通过 `contactsRouter.use('/', contextRouter)` 挂载在 `/v1/contacts/*` 下（见 `packages/server/src/presentation/http/routes/contacts.ts`）
- 过去版本的“现状分析”中对“前端 SSE/A2UI 已接入页面”的描述不准确：  
  - 现代码中 A2UI/ToolTrace 组件多为“已存在但未使用”，SSE hook/测试也存在多份不一致实现
