# FriendsAI 项目现状分析（2026-02-05）

**生成时间**: 2026-02-05
**整体完成度**: 75%（修正后评估）
**上次评估**: 2026-02-04 (48%)
**提升幅度**: +27%

---

## 执行摘要

经过2月4-5日的大规模重构，项目已成功从Express + 旧数据库迁移到**NestJS v2 + PostgreSQL (friendsai_v2)**。核心架构已建立，**OpenSpec cutover-to-nestjs-v2 变更的所有10个Workstream已完成**。

### 核心成就

1. **✅ Agent编排系统完整实现** - 从完全缺失到90%完成
   - AgentOrchestrator核心编排逻辑
   - SSE流式输出（agent.start/delta/message/end）
   - 工具调用决策与执行
   - 消息持久化

2. **✅ NestJS v2迁移成功** - 100%完成
   - OpenSpec cutover-to-nestjs-v2的所有10个Workstream已完成
   - 全新PostgreSQL数据库（friendsai_v2）
   - Clean Architecture分层清晰

3. **✅ 数据模型重建** - Conversation-first架构落地
   - Citations引用追溯（messages.citations字段）
   - 工具强确认机制（tool_confirmations表+状态机）
   - 会话归档系统

4. **✅ 前后端贯通** - SSE流式完整集成
   - SSE客户端完整集成（useAgentChat hook）
   - 工具确认UI完整（ConfirmBar组件）
   - A2UI组件库完整（8个核心组件）

### 主要差距

- ⚠️ **ContextBuilder缺L2/L3层**（当前仅40%完成）
- ⚠️ **A2UI Builder缺失**（Schema完整，生成逻辑为0%）
- ⚠️ **飞书连接器OAuth不完整**（仅30%）
- ⚠️ **向量检索系统未启用**（仅20%）

---

## Part 1: 重构成果对比（2月4日 vs 2月5日）

### 1.1 已解决的P0级问题

| 问题 | 2月4日状态 | 2月5日状态 | 解决方案 |
|-----|-----------|-----------|---------|
| Chat路由硬编码 | 🔴 正则回复，无AI | ✅ AgentOrchestrator实现 | [agent.orchestrator.ts](../packages/server-nestjs/src/agent/agent.orchestrator.ts) |
| 无SSE流式端点 | 🔴 返回JSON | ✅ POST /v1/agent/chat (SSE) | [agent.controller.ts](../packages/server-nestjs/src/agent/agent.controller.ts) |
| Agent系统缺失 | 🔴 完全不存在 | ✅ 完整架构 | agent/, ai/, tools/ 模块 |
| 数据库Schema不完整 | 🔴 缺citations/confirmations | ✅ 完整v2 schema | [20260205_init_v2_schema.sql](../packages/server-nestjs/migrations/20260205_init_v2_schema.sql) |
| 前端SSE空转 | 🔴 后端无支持 | ✅ 完整对接 | [useAgentChat.ts](../packages/client/src/hooks/useAgentChat.ts) |

### 1.2 OpenSpec Cutover变更完成情况

**变更ID**: `cutover-to-nestjs-v2`
**状态**: ✅ 所有10个Workstream已完成

| WS | 任务 | 状态 | 关键交付物 |
|----|------|------|-----------|
| WS-00 | Bootstrapping | ✅ | `/v1/health` endpoint, NestJS主线启动 |
| WS-10 | Database & Schema | ✅ | migrations系统, v2初始表 |
| WS-20 | Auth (JWT) | ✅ | register/login/refresh/logout |
| WS-30 | Conversations & Messages | ✅ | conversations/messages API + pagination |
| WS-40 | Agent SSE Chat | ✅ | SSE事件流 + 消息持久化 |
| WS-50 | Tool Confirmations | ✅ | tool_confirmations CRUD + confirm/reject |
| WS-60 | Conversation Archive | ✅ | 归档提取 + apply/discard |
| WS-70 | Contacts & Brief | ✅ | 联系人CRUD + brief生成 |
| WS-80 | Client H5 Rewrite | ✅ | 前端对接/v1 API + SSE |
| WS-90 | Verification & Docs | ✅ | 测试 + smoke闭环 |

**关键Git提交**:
```bash
fad426c - Agent SSE stream with agent.start/delta/message/end
259506f - Finalize NestJS v2 cutover verification
77491f6 - 切换到nestjs后端分界点
```

---

## Part 2: 技术架构现状

### 2.1 后端架构（NestJS）

```
packages/server-nestjs/src/
├── agent/              # Agent编排系统 ✅ 90%
│   ├── agent.orchestrator.ts      # 核心编排逻辑
│   ├── agent.controller.ts        # SSE端点
│   ├── context-builder.ts         # 上下文构建（基础版）
│   └── agent-message.store.ts     # 消息存储
├── ai/                 # AI服务层 ✅ 85%
│   ├── ai.service.ts              # AI调用封装
│   ├── tool-registry.ts           # 工具注册中心
│   └── a2ui.schema.ts             # A2UI类型定义
├── conversations/      # 会话管理 ✅ 95%
├── contacts/          # 联系人管理 ✅ 90%
├── tool-confirmations/ # 工具确认 ✅ 95%
├── conversation-archives/ # 会话归档 ✅ 85%
├── connectors/        # 连接器（飞书）⚠️ 40%
└── tools/             # 工具实现 ⚠️ 60%
    └── feishu/        # 飞书工具
```

#### 模块完成度详情

**✅ 已完整实现的模块（90%+）**

1. **Agent编排系统** (90%)
   - ✅ AgentOrchestrator - 核心编排逻辑
   - ✅ SSE流式输出（agent.start/delta/message/end）
   - ✅ 工具调用决策与执行
   - ✅ 消息持久化
   - ✅ 周期性ping保活
   - ✅ 工具状态机流转

2. **认证系统** (100%)
   - ✅ JWT登录/注册/refresh/logout
   - ✅ JWT Guard（受保护端点鉴权）

3. **会话与消息** (95%)
   - ✅ POST /v1/conversations - 创建会话
   - ✅ GET /v1/conversations - 会话列表
   - ✅ GET /v1/conversations/:id/messages - 消息历史
   - ✅ POST /v1/agent/chat - SSE流式对话

4. **工具确认系统** (95%)
   - ✅ tool_confirmations表 + 状态机
   - ✅ 确认/拒绝API
   - ✅ 前端ConfirmBar集成

5. **会话归档** (85%)
   - ✅ AI解析会话内容
   - ✅ Citations构建
   - ✅ Apply/Discard机制
   - ✅ 幂等性保证

**⚠️ 部分实现的模块（40-70%）**

1. **ContextBuilder** (40%)
   ```typescript
   // ✅ 已实现
   - 系统提示注入
   - 用户消息历史（带长度限制）
   - 工具结果追加

   // ❌ 缺失（tech_design.md要求的三层上下文）
   - L1：最近N条消息短期窗口（部分实现，但未分层）
   - L2：会话摘要记忆（完全缺失）
   - L3：向量召回（完全缺失）
   ```

2. **飞书连接器** (40%)
   ```typescript
   // ✅ 已实现
   - buildFeishuAuthorizeUrl() - OAuth授权URL生成
   - FeishuClient基础封装
   - FeishuTool工具定义
   - connector_tokens表

   // ❌ 缺失
   - Token exchange端点（返回501）
   - Token refresh逻辑
   - 核心工具集（bitable, send_message）
   ```

3. **向量检索系统** (20%)
   ```sql
   -- ✅ 数据库支持
   CREATE EXTENSION vector;
   ALTER TABLE conversations ADD COLUMN embedding vector;

   -- ❌ 缺失逻辑
   - embedding生成
   - message_chunks表
   - 向量召回策略
   ```

**❌ 未实现的模块（0%）**

1. **A2UI Builder** - 完全缺失
   - 功能：生成动态UI Payload
   - 当前状态：Schema定义完整，生成逻辑不存在

2. **会话摘要系统** - L2层缺失
   - 需要：conversation_summaries表
   - 需要：定期摘要生成job

3. **Message Chunks向量表** - L3层缺失
   - 需要：message_chunks表
   - 需要：向量检索服务

### 2.2 前端架构（Taro + React）

**完成度：90%**

```
packages/client/src/
├── pages/              ✅ 90%
│   ├── conversation/      # 对话页（SSE集成完整）
│   ├── contact-detail/    # 联系人详情
│   └── connector/         # 连接器设置
├── hooks/              ✅ 95%
│   └── useAgentChat.ts    # SSE流式Hook
└── components/         ✅ 95%
    ├── A2UIRenderer/      # 动态UI引擎
    ├── ArchiveReviewCard/ # 归档确认卡
    ├── ToolTraceCard/     # 工具状态卡
    └── ConfirmBar/        # 强确认条
```

**前端优势**：
- ✅ SSE流式集成完整
- ✅ A2UI组件库完整（8个核心组件）
- ✅ 工具确认UI完整
- ⚠️ 等待后端A2UI生成逻辑

---

## Part 3: 数据库设计

### 3.1 核心表结构（12张表）

**迁移文件**: `packages/server-nestjs/migrations/20260205_init_v2_schema.sql`

#### 用户与认证层

**users** - 用户表
- `id` uuid (PK)
- `email` text (可空，唯一)
- `phone` text
- `password` text
- `name` text
- `createdAt`, `updatedAt` timestamp

**auth_sessions** - 认证会话
- `id` uuid (PK)
- `refreshToken` text
- `expiresAt` timestamp
- `revokedAt` timestamp
- `userId` uuid (FK → users)

#### 会话核心层（Conversation-first）

**conversations** - 会话表
- `id` uuid (PK)
- `title` text
- `content` text
- `embedding` **vector** (向量嵌入)
- `parsedData` **jsonb**
- `isArchived` boolean
- `status` text
- `userId` uuid (FK → users)
- `contactId` uuid (FK → contacts)

**messages** - 消息表
- `id` uuid (PK)
- `role` text (user/assistant/system/tool)
- `content` text
- `metadata` **jsonb**
- `citations` **jsonb** ⭐（引用追溯）
- `conversationId` uuid (FK → conversations)

#### 联系人与沉淀层

**contacts** - 联系人表
- `id` uuid (PK)
- `name` text
- `alias`, `email`, `phone`, `company`, `position` text
- `profile` **jsonb**
- `tags` text
- `note` text
- `userId` uuid (FK → users)

**events** - 时间轴事件
- `id` uuid (PK)
- `title` text
- `description` text
- `details` **jsonb**
- `eventDate` timestamp
- `embedding` **vector**
- `sourceConversationId` uuid
- `sourceMessageIds` **uuid[]** ⭐（来源引用）
- `contactId` uuid (FK → contacts)

**contact_facts** - 联系人事实/画像
- `id` uuid (PK)
- `content` text
- `metadata` **jsonb**
- `sourceConversationId` uuid
- `sourceMessageIds` **uuid[]**
- `contactId` uuid (FK → contacts)

**contact_todos** - 待办事项
- `id` uuid (PK)
- `content` text
- `status` text (pending/done)
- `dueAt` timestamp
- `metadata` **jsonb**
- `sourceConversationId` uuid
- `sourceMessageIds` **uuid[]**
- `contactId` uuid (FK → contacts)

**contact_briefs** - 会前简报
- `id` uuid (PK)
- `content` text
- `citations` **jsonb** ⭐（引用到的events/facts/todos）
- `generatedAt` timestamp
- `contactId` uuid (FK → contacts)

#### 归档与工具层

**conversation_archives** - 归档提取结果
- `id` uuid (PK)
- `conversationId` uuid (FK → conversations)
- `status` text (ready_for_review/applied/discarded)
- `summary` text
- `payload` **jsonb** ⭐（提取的联系人/事件/事实/待办）
- `citations` **jsonb**
- `appliedAt`, `discardedAt` timestamp

**tool_confirmations** - 工具强确认
- `id` uuid (PK)
- `toolName` text
- `payload` **jsonb**（工具参数）
- `result` **jsonb**（执行结果）
- `status` text (pending/confirmed/rejected/executed)
- `error` text
- `conversationId` uuid (FK → conversations)
- `userId` uuid (FK → users)
- `confirmedAt`, `rejectedAt`, `executedAt` timestamp

**connector_tokens** - 连接器OAuth令牌
- `id` uuid (PK)
- `connectorType` text (feishu/wecom/dingtalk)
- `accessToken` text（需加密）
- `refreshToken` text（需加密）
- `tokenType`, `scope` text
- `expiresAt` timestamp
- `metadata` **jsonb**
- `userId` uuid (FK → users)

### 3.2 关键设计特点

#### 1. Citations引用追溯系统

**目的**：实现任何AI提取结果都可指回来源消息

**实现方式**：
```json
// messages.citations 格式
{
  "sourceMessageIds": ["msg1", "msg2"],
  "spans": [
    {"start": 10, "end": 20, "sourceIndex": 0}
  ]
}

// contact_briefs.citations 格式
{
  "events": ["event-id-1"],
  "facts": ["fact-id-2"],
  "todos": ["todo-id-3"],
  "messages": ["msg-id-4"]
}
```

**覆盖范围**：
- ✅ messages.citations - 消息级引用
- ✅ contact_briefs.citations - 简报引用
- ✅ events/facts/todos.sourceMessageIds - 沉淀数据溯源
- ✅ conversation_archives.citations - 归档提取引用

#### 2. 向量检索支持（pgvector）

**已启用字段**：
```sql
-- conversations表
embedding vector  -- 会话整体向量

-- events表
embedding vector  -- 事件向量
```

**待实现**：
```sql
-- 需要创建的表
CREATE TABLE message_chunks (
  id uuid PRIMARY KEY,
  messageId uuid,
  conversationId uuid,
  contactIds uuid[],
  chunkText text,
  embedding vector(1536),  -- OpenAI ada-002 dimension
  createdAt timestamp
);
CREATE INDEX ON message_chunks USING ivfflat (embedding vector_cosine_ops);
```

#### 3. 工具强确认状态机

```
pending → confirmed → executed
        ↘ rejected
```

**规则**：
- **读**工具（list/get）：可自动执行，但要展示trace
- **写/发/改状态**：必须先 `requires_confirmation`，用户点确认后才能执行

---

## Part 4: 主要差距与技术债务

### 4.1 P0级差距（影响核心功能）

#### 1. ContextBuilder缺L2/L3层

**当前完成度**: 40%
**目标完成度**: 100%

**缺失内容**：

**L2层：会话摘要记忆**
- **问题**：长会话（50+ 消息）上下文溢出
- **设计要求**：每隔30-50条消息生成summary
- **需要**：
  ```sql
  CREATE TABLE conversation_summaries (
    id uuid PRIMARY KEY,
    conversationId uuid REFERENCES conversations(id),
    summary text,
    messageRange jsonb,
    createdAt timestamp
  );
  ```

**L3层：向量召回 + 结构化数据**
- **问题**：无法智能检索历史关键信息
- **设计要求**：
  - 向量检索：从message_chunks召回top 5-10片段
  - 结构化数据：联系人的events/facts/todos
- **需要**：
  - 创建`message_chunks`表
  - 实现embedding生成服务
  - 实现向量检索服务

**影响**：
- 🔴 长会话AI会"失忆"
- 🔴 联系人简报质量受限
- 🔴 无法召回30条消息之前的关键信息

**修复工时**: 3天
**优先级**: P0（Sprint 1）

---

#### 2. A2UIBuilder缺失

**当前完成度**: 0%
**目标完成度**: 100%

**当前状态**：
- ✅ A2UI Schema定义完整（a2ui.schema.ts）
- ✅ 前端渲染组件完整（8个组件）
- ❌ 后端生成逻辑完全不存在

**需要实现**：
```typescript
// packages/server-nestjs/src/agent/a2ui.builder.ts
class A2UIBuilder {
  buildArchiveReviewCard(archive: ConversationArchive): A2UIPayload
  buildConfirmBar(toolConfirmation: ToolConfirmation): A2UIPayload
  buildTemplatePicker(templates: Template[]): A2UIPayload
  buildDraftPreview(drafts: Draft[]): A2UIPayload
}
```

**影响**：
- 🔴 归档审核卡无法自动生成
- 🔴 工具确认UI需手动触发
- 🔴 前端A2UI组件库空转

**修复工时**: 2天
**优先级**: P1（Sprint 2）

---

### 4.2 P1级差距（影响产品体验）

#### 3. 飞书连接器OAuth不完整

**当前完成度**: 30%
**目标完成度**: 100%

**已实现**：
- ✅ buildFeishuAuthorizeUrl() - 生成OAuth授权URL
- ✅ connector_tokens表
- ✅ FeishuClient基础封装

**缺失**：
```typescript
// ❌ Token exchange端点（当前返回501）
POST /v1/connectors/feishu/oauth/token
// 输入：code（OAuth回调code）
// 输出：accessToken, refreshToken

// ❌ Token refresh逻辑
POST /v1/connectors/feishu/oauth/refresh

// ❌ 核心工具集
- feishu.bitable.list_templates
- feishu.bitable.create_instance
- feishu.im.send_message
```

**影响**：
- 🟡 无法完成飞书授权流程
- 🟡 设计文档的V1/V2功能无法演示

**修复工时**: 2天
**优先级**: P1（Sprint 2）

---

#### 4. 向量检索系统未启用

**当前完成度**: 20%
**目标完成度**: 100%

**已有基础**：
```sql
-- ✅ 数据库扩展
CREATE EXTENSION vector;

-- ✅ 向量字段
ALTER TABLE conversations ADD COLUMN embedding vector;
ALTER TABLE events ADD COLUMN embedding vector;
```

**缺失**：
- ❌ `message_chunks`表
- ❌ Embedding生成服务
- ❌ 向量检索服务
- ❌ 召回策略

**影响**：
- 🟡 简报无法引用历史会话片段
- 🟡 L3上下文无法实现

**修复工时**: 2.5天
**优先级**: P0（Sprint 1）

---

### 4.3 P2级优化项

5. **会话摘要系统（L2层）** - 2天
6. **测试覆盖率提升至80%** - 4天
7. **安全加固** - 1天

---

## Part 5: 与设计文档对照

### 5.1 tech_design.md符合度：78%

| 章节 | 要求 | 达成度 | 备注 |
|-----|------|--------|------|
| 1. 背景与目标 | MVP定义 | 85% | 核心流程已通 |
| 2. 技术栈 | Taro+React+Express | 100% | 后端已切NestJS（更优） |
| 3. 总体架构 | 分层结构 | 95% | Clean Architecture完整 |
| 4. 数据模型 | Conversation-first | 100% | ✅ conversations/messages核心 |
| 5. Context系统 | L1/L2/L3 | 40% | 🔴 **关键差距** |
| 6. Agent编排 | OpenAI/Anthropic SDK | 90% | ✅ AgentOrchestrator完整 |
| 7. A2UI | Server-driven UI | 50% | 🟡 Schema存在，Builder缺失 |
| 8. 飞书连接器 | OAuth + 工具集 | 35% | 🔴 **关键差距** |
| 9. 后端模块 | 10+模块 | 90% | ✅ 结构对齐 |
| 10. API设计 | /v1/* RESTful | 95% | ✅ SSE完整 |
| 11. 可测试性 | 面向接口 | 80% | 架构支持，测试待补 |
| 12. 运行部署 | Node18 + PG | 100% | ✅ Docker Compose就绪 |
| 13. MVP交付 | V0闭环 | 85% | ✅ **基本可演示** |
| 14. 关键提醒 | 4个坑 | 75% | L2会话摘要待解决 |

**整体符合度：78%** ✅

---

## Part 6: 未来开发规划

### Sprint 1: ContextBuilder增强 + 向量检索（本周）

**时间**: 2月6-12日
**目标**: 提升AI上下文感知能力，避免长会话失忆

**任务**:
1. 创建`message_chunks`表迁移
2. 实现embedding生成服务（OpenAI embeddings API）
3. 实现向量检索服务（pgvector查询）
4. 增强ContextBuilder：
   - `buildL1Context()` - 最近20-40条消息
   - `buildL3Context()` - 向量召回top 5-10片段 + 结构化数据
5. 集成到AgentOrchestrator

**验收标准**:
- [ ] 长会话（50+ 消息）能回忆起30条之前的关键信息
- [ ] 联系人简报能引用历史会话片段
- [ ] 性能：向量召回<200ms

**关键文件**:
```
packages/server-nestjs/migrations/20260206_message_chunks.sql
packages/server-nestjs/src/ai/vector/embedding.service.ts
packages/server-nestjs/src/ai/vector/vector-search.service.ts
packages/server-nestjs/src/agent/context-builder.ts (重构)
```

---

### Sprint 2: A2UI生成 + 飞书OAuth（下周）

**时间**: 2月13-19日
**目标**: 解锁动态UI能力，完成飞书连接器

**任务**:
1. 实现A2UIBuilder核心逻辑
2. 集成到AgentOrchestrator
3. 实现飞书OAuth token exchange/refresh
4. 实现飞书核心工具（bitable, send_message）

**验收标准**:
- [ ] 归档会话后前端自动显示ArchiveReviewCard
- [ ] 飞书连接器授权流程完整可用
- [ ] 聊天中能调用"发送飞书消息"工具（含确认）

**关键文件**:
```
packages/server-nestjs/src/agent/a2ui.builder.ts (新建)
packages/server-nestjs/src/connectors/connectors.controller.ts (完善)
packages/server-nestjs/src/tools/feishu/feishu-oauth.service.ts (新建)
packages/server-nestjs/src/tools/feishu/feishu-bitable.tool.ts (新建)
```

---

### Sprint 3-5: 完整MVP路径（3-5周）

**Sprint 3**: 会话摘要系统（L2层）
**Sprint 4**: 测试覆盖 + 性能优化
**Sprint 5**: 安全加固 + 文档完善

**生产就绪时间预估**: 4-5周

---

## Part 7: 关键指标

### 7.1 代码统计

```
后端（NestJS）:
- 模块数量: 13个
- 核心文件: 80+
- 数据库表: 12张
- API端点: 30+

前端（Taro）:
- 页面数量: 10+
- 组件数量: 30+
- Hooks: 15+
```

### 7.2 完成度矩阵

| 模块 | 完成度 | 状态 | 优先级 |
|-----|--------|------|--------|
| Agent编排系统 | 90% | ✅ 可用 | - |
| 会话与消息 | 95% | ✅ 可用 | - |
| 工具确认系统 | 95% | ✅ 可用 | - |
| 会话归档 | 85% | ✅ 可用 | - |
| 联系人管理 | 90% | ✅ 可用 | - |
| 认证系统 | 100% | ✅ 完整 | - |
| ContextBuilder | 40% | ⚠️ 待增强 | P0 |
| A2UIBuilder | 0% | 🔴 缺失 | P1 |
| 飞书连接器 | 30% | ⚠️ 待完善 | P1 |
| 向量检索 | 20% | ⚠️ 待启用 | P0 |
| 测试覆盖 | 30% | ⚠️ 待补充 | P2 |

**整体完成度: 75%**

---

## 总结

### 🎉 核心成就（2月4→5日重构）

1. **架构跃升**: Express → NestJS + Clean Architecture
2. **Agent系统从0到1**: AgentOrchestrator + SSE + ToolRegistry完整实现
3. **数据模型重建**: Conversation-first + citations + 工具确认完整落地
4. **前后端贯通**: SSE流式 + 工具确认UI + 消息持久化闭环

### 🎯 当前状态（2026-02-05）

- **整体完成度**: 75%（vs 2月4日的48%，提升27%）
- **可演示性**: ✅ 登录→聊天→归档→简报 核心闭环可用
- **技术债务**: 🟡 L2/L3上下文、A2UI生成、飞书OAuth待解决

### 🚀 下一步（近期1-2周）

**Week 1 (2月6-12日)**: ContextBuilder增强 + 向量检索
**Week 2 (2月13-19日)**: A2UI生成 + 飞书OAuth完整

### 📊 对比结论

- **设计文档符合度**: 78% ✅
- **OpenSpec cutover变更**: 100% ✅
- **前端UI完成度**: 90% ✅
- **后端核心系统**: 75% ⚠️（ContextBuilder/A2UI待补）

**生产就绪时间预估**: 4-5周（完成Sprint 1-5后）

---

**文档版本**: v2.0 (2026-02-05)
**上次更新**: 2026-02-04 ([project-status-2026-02-04.md](./project-status-2026-02-04.md))
**下次更新**: Sprint 1完成后（预计2月12日）
**关联文档**:
- [技术设计文档](./tech_design.md)
- [OpenSpec变更详情](../openspec/changes/cutover-to-nestjs-v2/)
