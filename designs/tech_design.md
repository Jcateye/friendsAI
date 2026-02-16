下面是一份**全新、Conversation-first（ChatGPT式多会话多消息）**的技术设计文档，完全按你给的栈来写：**Taro + React 前端**，**Express + TypeScript 后端（Node 18+）**，并内置 **AI Agent 多轮交互、会话归档提取、A2UI、连接器（飞书）** 的完整后端方案。

---

# AI 原生人脉管理系统：技术设计（TypeScript/Express）

## 1. 背景与目标

### 业务目标（MVP）

这是一个 AI 原生的“关系情报”应用，用**多轮聊天**承载工作流：

* **多轮会话**：用户与 Agent 聊天（像 ChatGPT），一段会话包含很多消息
* **会话可归档**：把会话中关键信息提取为：

  * 联系人关联（谁）
  * 事件时间轴（发生了什么）
  * 事实要点（画像/偏好/家庭等）
  * 待办行动（下一步）
* **会前简报**：打开联系人，一键生成简报（最近事件、待办、画像要点、建议话术）
* **连接器（飞书）**：在设置里连接授权；聊天中按需调用工具，**展示工具执行过程与结果**；写/发类工具必须用户确认执行

### 约束与原则

* 极简：不做 CRM 式复杂字段/层级
* “2 级页面搞定”：核心动作（记录、简报、归档）不要深层导航
* 可解释可追溯：任何 AI 提取结果都可指回来源消息（message citation）
* 可测试可迭代：面向接口编程（LLM、向量、连接器、存储均可替换）
* 低复杂度：核心 Agent 框架选 OpenAI 或 Anthropic Agent SDK；其余尽量简

---

## 2. 技术栈

### 前端 (packages/web)

* **产品形态**：Web-first 移动端（优先手机浏览器体验，可选 PWA；后续可用 Capacitor 打包 WebView 壳包）
* **构建**：Vite 5 + TypeScript
* **框架**：React 18
* **路由**：React Router v6
* **聊天 UI**：Assistant-UI（React 组件库，已集成 Vercel AI SDK）
* **AI 流式/对话协议**：Vercel AI SDK（前端 hooks + stream protocol）
* **状态管理**：React Context + hooks（复杂场景可上 Zustand）
* **数据请求**：fetch + 自封装 client（或 TanStack Query）
* **样式**：Tailwind CSS
* **校验**：zod（A2UI payload、tool trace schema 运行时校验）
* **测试**：Vitest + Testing Library（E2E 可选 Playwright）

### 后端 (packages/server)

* 框架：Express.js
* 语言：TypeScript
* 运行时：Node.js 18+

### 推荐基础设施（最少但够用）

* PostgreSQL 15+（主存储）
* pgvector（向量检索，减少额外组件复杂度）
* Redis（可选：会话流式状态、限流、短缓存）
* 对象存储（可选：语音转写/图片/附件原始文件）

---

## 3. 总体架构

### 3.1 分层结构（面向接口）

**Client（Vite React + Assistant-UI）**

* **UI Layer**：页面、布局、Assistant-UI Chat 组件、A2UI 渲染器（ArchiveReviewCard/ConfirmBar/ToolTraceCard 等）
* **Runtime Layer**：流式 SSE 响应转消息流、tool trace、A2UI 指令；管理会话 thread、消息追加、失败重试
* **Data Layer**：REST API 客户端（会话/联系人/行动/连接器）+ Chat SSE + tool-runs confirm
* **Schema Layer**：A2UI/ToolTrace JSON schema（zod）+ DTO types

**Express API（BFF）**

* 鉴权、会话/联系人 CRUD
* SSE 流式推送聊天/工具执行过程
* 统一输出：`message events + A2UI + tool trace + citations`

**Agent Orchestrator**

* 封装 OpenAI/Anthropic Agent SDK
* 构建上下文（结构化 + 向量召回 + 会话摘要）
* 决策是否调用连接器工具
* 生成：普通文本 + A2UI 指令 + 工具调用计划

**Domain Services**

* Conversations / Messages
* Contacts / Timeline / Facts / Todos / Briefs
* Archive（会话归档提取与应用）

**Connector Gateway（Feishu）**

* OAuth 绑定、token 托管
* 工具执行（list/get template、create instance、send message…）
* 强确认策略、审计日志

---

## 4. 核心数据模型（Conversation-first）

> 重点：**会话**是第一公民；“记录”就是会话中的消息。

### 4.1 会话与消息

#### conversations

* `id` (uuid)
* `ownerUserId`
* `title`（可空，AI 自动生成）
* `status`: `active | archived`
* `mode`: `general | contact_focus | template_workflow`（可选）
* `pinned`（可选）
* `createdAt`, `updatedAt`, `archivedAt`

#### messages

* `id` (uuid)
* `conversationId`
* `role`: `user | assistant | system | tool`
* `contentType`: `text | a2ui | tool_trace | tool_result | error`
* `content`（文本或简短描述）
* `metadata`（jsonb）：

  * `a2ui`：A2UI payload（当 contentType=a2ui）
  * `tool`: { toolCallId, toolName, state, summary, resultRef }（当 tool_*）
  * `citations`: [{ messageId, start, end }]（可追溯来源片段）
* `createdAt`

#### conversation_contact_links

* `conversationId`
* `contactId`
* `confidence` (0~1)
* `userConfirmed` (bool)
* `createdAt`

### 4.2 结构化沉淀（联系人侧）

#### contacts

* `id`
* `ownerUserId`
* `displayName`
* `alias`
* `tags` (text[])
* `note`
* `lastInteractionAt`
* `heatScore`（计算/更新）

#### events（时间轴）

* `id`
* `contactId`
* `happenedAt`
* `type`（meet/call/wechat/deal/event_info/…）
* `summary`
* `sourceConversationId`
* `sourceMessageIds`（引用哪些消息）
* `createdAt`

#### facts（画像/事实）

* `id`
* `contactId`
* `key`（如 family/role/preference/taboo）
* `value`
* `confidence`
* `status`：`active | removed`
* `sourceConversationId`
* `sourceMessageIds`
* `createdAt`

#### todos（行动/待办）

* `id`
* `contactId`
* `content`
* `dueAt`（可空）
* `status`: `open | done`
* `sourceConversationId`
* `sourceMessageIds`
* `createdAt`

#### briefs（会前简报缓存）

* `contactId`
* `briefText`
* `citations`（引用到的 event/fact/todo/message）
* `generatedAt`
* `stale`（bool）

### 4.3 会话归档与审计

#### conversation_archives（归档提取结果）

* `id`
* `conversationId`
* `status`: `pending | ready_for_review | applied | discarded`
* `summary`
* `payload`（jsonb：contactLinks/events/facts/todos）
* `citations`（message spans）
* `createdAt`, `appliedAt`

#### tool_runs（工具调用记录）

* `id` (uuid)
* `conversationId`
* `toolCallId`（模型或系统生成）
* `toolName`
* `state`: `planned | requires_auth | requires_confirmation | executing | succeeded | failed`
* `summary`
* `resultRef`（指向结果存储或直接存 jsonb）
* `createdAt`, `updatedAt`

#### confirmations（强确认动作）

* `id`
* `toolRunId`
* `conversationId`
* `actionSummary`（将做什么、影响范围）
* `confirmedByUserId`
* `confirmedAt`
* `status`: `waiting | confirmed | cancelled`

---

## 5. Context 系统（多会话、多消息）

### 5.1 三层上下文（推荐实现）

**L1：当前会话短期窗口**

* 最近 N 条 `user/assistant` 消息（建议 20~40）
* 最近的工具结果摘要（不要塞大 JSON）

**L2：会话摘要记忆（可选但强烈推荐）**

* 每隔 M 条消息生成一个 `conversation_summary`
* 存在 `conversations.summary` 或独立表 `conversation_summaries`
* 作用：防止长会话上下文溢出、提升稳定性

**L3：结构化 + 向量召回**

* 结构化（联系人相关）：events/facts/todos/brief
* 向量（message chunks）：在会话内/联系人历史会话里检索关键片段

### 5.2 向量检索（pgvector）

建议只对以下内容做 embedding（控成本）：

* 用户消息（user role）
* assistant 中带“结论/摘要/生成文案”的消息（可筛选）
* 工具结果的“摘要”（而非全量）

表：`message_chunks`

* `id`
* `messageId`
* `conversationId`
* `contactIds`（可空）
* `chunkText`
* `embedding vector`
* `createdAt`

召回策略（简单版）：

1. 优先当前会话（conversationId）
2. 若有关联联系人：扩展到该联系人的历史会话 chunks
3. 最后全局（按时间衰减）

---

## 6. Agent 编排（OpenAI / Anthropic Agent SDK）

### 6.1 Agent 的职责边界

Agent 只做：

* 意图识别：聊天、归档会话、生成简报、模板工作流
* 组装上下文：调用 ContextBuilder
* 产出：文本 + A2UI + tool plan（工具调用计划）
* 输出引用：citations（message spans）

Agent 不做：

* 直接写 DB（走 Domain services）
* 直接调用飞书 API（走 Connector Gateway）
* 绕过强确认规则（后端策略层强制）

### 6.2 两条关键“可测管线”

#### 管线 A：多轮聊天（Chat Loop）

1. 客户端发送 user message
2. Server 落库 message(user)
3. AgentOrchestrator：

   * build context（L1/L2/L3）
   * 生成 assistant response（可能含 A2UI）
   * 如需工具：生成 tool_runs + tool_trace 消息
4. 流式推送给客户端（SSE）
5. 最终落库 message(assistant/a2ui/tool_trace/tool_result)

#### 管线 B：会话归档（Archive Conversation）

触发：用户点“归档此会话”或 AI 建议归档。

步骤：

1. 创建 `conversation_archives(status=pending)`
2. Agent 执行 extraction：

   * 联系人候选/关联
   * 事件、事实、待办
   * 摘要与要点
   * 引用 citations（message spans）
3. 写入 archive(status=ready_for_review)
4. 客户端展示“归档确认卡”（A2UI）
5. 用户确认后：

   * 写入 contacts/events/facts/todos
   * 更新 contacts 热度与 lastInteractionAt
   * archive -> applied

---

## 7. A2UI 与 Tool Trace（聊天内交付）

### 7.1 统一事件流（SSE）

建议 `POST /v1/agent/chat` 返回 SSE（或 WebSocket）。事件类型：

* `message.delta`：assistant 文本增量
* `message.final`：assistant 完整消息（可含 citations）
* `ui`：A2UI payload（卡片/表单/确认条）
* `tool.trace`：工具执行状态更新
* `error`：错误消息

### 7.2 A2UI 最小组件集（MVP）

* `ArchiveReviewCard`：归档提取结果的确认/编辑（联系人、事件、事实、待办）
* `TemplatePicker`：选择飞书模板
* `VariableForm`：填变量（时间/地点/优惠等）
* `DraftPreview`：预览生成文案（多版本）
* `ConfirmBar`：强确认（写入/下发/改状态）
* `ToolTraceCard`：工具执行过程与结果
* `ErrorCard`：失败/重试

### 7.3 工具调用状态机（强确认）

`planned → requires_auth → requires_confirmation → executing → succeeded/failed`

规则：

* **读**工具（list/get）：可自动执行，但要展示 trace
* **写/发/改状态**：必须先 `requires_confirmation`，用户点确认后才能执行

---

## 8. 飞书连接器（Connector / MCP / Skill）

### 8.1 设置页入口（产品约束）

连接器只出现在设置页：

* 连接/解绑
* scopes 查看
* 连接测试（可选）

### 8.2 后端实现方式

你可以把“飞书工具”实现为两层：

* **ConnectorGateway（Express internal module）**：封装 OAuth、token、API 调用、审计
* **ToolAdapter**：把 Gateway 的能力包装成 Agent 可调用的 tools（MCP/skill 也可以在这里对接）

### 8.3 最小工具集（建议）

* `feishu.connection.status`
* `feishu.bitable.list_templates`
* `feishu.bitable.get_template`
* `feishu.bitable.create_instance`（v1 留痕）
* `feishu.im.send_message`（v1 内部分发）
* `feishu.instance.update_status`（v2 审核）

---

## 9. 后端模块与目录结构（TypeScript/Express）

建议 `packages/server/src`：

```
src/
  app.ts
  routes/
    auth.routes.ts
    conversations.routes.ts
    contacts.routes.ts
    actions.routes.ts
    connectors.routes.ts
    agent.routes.ts
  domain/
    conversations/
      conversation.service.ts
      message.service.ts
      archive.service.ts
      conversation.repo.ts
    contacts/
      contact.service.ts
      timeline.service.ts
      brief.service.ts
      contact.repo.ts
    actions/
      todo.service.ts
  agent/
    orchestrator.ts
    context.builder.ts
    a2ui.builder.ts
    policies.ts
    providers/
      openai.provider.ts
      anthropic.provider.ts
  connectors/
    feishu/
      oauth.service.ts
      gateway.ts
      tools.ts
      policy.ts
  infra/
    db.ts
    redis.ts (optional)
    vector/
      pgvector.store.ts
    audit/
      audit.service.ts
  types/
    a2ui.ts
    tooltrace.ts
    dto.ts
  tests/
```

---

## 10. API 设计（Conversation-first）

### 10.1 会话与消息

* `POST /v1/conversations` 创建会话
* `GET /v1/conversations?status=active|archived&cursor=...` 会话列表（用于 Drawer）
* `GET /v1/conversations/:id/messages?cursor=...` 拉消息历史
* `POST /v1/conversations/:id/messages` 发送 user 消息（非流式可用）

### 10.2 流式聊天（推荐）

* `POST /v1/agent/chat`（SSE）

  * input: `{ conversationId, messageText }`
  * output: SSE events（message/ui/tool.trace）

### 10.3 会话归档

* `POST /v1/conversations/:id/archive` 触发提取
* `GET /v1/conversations/:id/archive` 获取归档草稿
* `POST /v1/conversations/:id/archive/apply` 用户确认写入联系人/行动

### 10.4 联系人与简报

* `GET /v1/contacts?query=...&filter=...`
* `GET /v1/contacts/:id`
* `GET /v1/contacts/:id/timeline`
* `GET /v1/contacts/:id/brief?refresh=0|1`

### 10.5 行动面板

* `GET /v1/actions/todos`
* `GET /v1/actions/suggestions`

### 10.6 连接器（设置页）

* `GET /v1/connectors/feishu/status`
* `POST /v1/connectors/feishu/connect`（返回 OAuth URL）
* `GET /v1/connectors/feishu/callback`（OAuth 回调）
* `POST /v1/connectors/feishu/disconnect`
* `POST /v1/connectors/feishu/test`

### 10.7 强确认（工具写/发）

* `POST /v1/tool-runs/:id/confirm`（用户确认后执行）

---

## 11. 可测试性设计（重点）

### 11.1 面向接口编程（关键接口）

* `LLMProvider`：OpenAI/Anthropic 可替换
* `VectorStore`：pgvector 实现可替换
* `ConnectorProvider`：Feishu 可替换（未来钉钉/企微）
* `PolicyEnforcer`：强确认/权限/风险策略可单测

### 11.2 测试分层

* Domain 单测：不依赖 LLM/连接器
* Contract 测试：A2UI schema、ToolTrace 状态机固定
* Golden 测试：同样输入会话，归档提取 payload 结构稳定（允许文本变化，但结构不漂）
* E2E：归档闭环、简报闭环、连接器“requires_confirmation”闭环

---

## 12. 运行与部署建议（不复杂）

* Node 18 + PM2 / Docker
* Postgres + pgvector（同一实例即可）
* 日志：pino/winston + requestId
* SSE：Nginx 反代需要开启 `proxy_buffering off;`

---

## 13. MVP 交付节奏（建议）

### V0（纯本地）

* 多会话多消息聊天
* 会话归档提取 + 用户确认写入联系人/行动
* 联系人详情：简报/时间轴/标签
* 行动面板：待办 + 建议
* Drawer：会话列表

### V1（飞书连接器：只读模板）

* 设置授权飞书
* 聊天中：读取模板→填变量→生成文案→复制

### V2（飞书连接器：留痕/下发）

* create_instance、send_message
* 强确认 + 审计完善

---

## 14. 关键实现提醒（你后面一定会踩的坑）

* **长会话上下文溢出**：必须做 L2 会话摘要（哪怕先用简单 summarizer）
* **A2UI 稳定性**：schema 要固定；尽量让模型输出结构化 JSON，再由后端校验/修复
* **工具误发风险**：写/发必须确认，不要只靠 prompt
* **引用可追溯**：提取结果每一条都带 message span（否则用户不信）

