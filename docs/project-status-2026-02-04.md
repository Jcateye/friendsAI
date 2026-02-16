# FriendsAI 项目现状深度分析

**生成时间**: 2026-02-04
**整体完成度**: 48%（修正后评估）

---

## 执行摘要

本项目是一个AI原生人脉管理系统，采用**Taro + React**前端和**Express + TypeScript**后端架构。经过深度代码审查，发现：

- ✅ **前端实现度高**（85%）：页面、组件、SSE集成、A2UI渲染系统均已完成
- ⚠️ **后端核心缺失**（30%）：虽有完整架构框架，但**Agent编排系统完全未实现**
- 🔴 **关键阻塞问题**：Chat路由使用硬编码正则回复，无真实AI调用

**最大差距**：设计文档要求的"Conversation-first + Agent编排"核心未落地，当前仅为传统CRUD系统。

---

## Part 1: 后端实现现状（完成度：30%）

### 1.1 架构与基础设施 ✅ 完成度：90%

#### Clean Architecture 分层（优秀）

```
packages/server/src/
├── app/                    ✅ 中间件层完整
│   ├── middleware/         ✅ auth, validate, errorHandler, logger
│   └── errors/             ✅ 自定义错误类型
├── application/            ⚠️ Use Cases 基础完成，Agent逻辑缺失
│   └── usecases/           ✅ 5个基础usecase
├── infrastructure/         ⚠️ AI集成存在但未用于聊天
│   ├── db/                 ✅ Pool, migrate, transaction
│   ├── repositories/       ✅ 8个repo完整
│   ├── ai/                 ✅ openaiCompat, embeddings（未集成）
│   └── tools/              ⚠️ Mock provider
├── presentation/           ✅ 10个路由模块
│   └── http/routes/        ✅ RESTful API完整
└── worker.ts               ✅ 后台工具执行器
```

**评价**：架构设计专业，但核心业务逻辑（Agent）未填充。

---

#### 数据库迁移 ✅ 完成度：70%

**已有5个迁移文件**：

| 文件 | 内容 | 状态 |
|-----|------|------|
| 001_init.sql | 初始化表结构（8张核心表） | ✅ 已应用 |
| 002_embeddings.sql | 向量嵌入表（pgvector） | ✅ 已应用 |
| 003_journal_entry_contact_unique.sql | 唯一性约束 | ✅ 已应用 |
| 004_sync_idempotency.sql | 同步去重 | ✅ 已应用 |
| 005_chat.sql | 聊天会话与消息表 | ✅ 已应用 |

**核心表结构审查**（从001_init.sql）：

```sql
-- ✅ 已有表
workspace, "user", contact, journal_entry, event, fact,
action_item, brief_snapshot, journal_entry_contact

-- ✅ 聊天表（005_chat.sql）
chat_session, chat_message

-- ✅ 工具执行表
tool_task, tool_execution

-- ❌ 设计要求但缺失的表
tool_confirmations      -- 工具强确认流程
connector_tokens        -- 连接器令牌（OAuth）
conversation_archives   -- 会话归档提取结果
message_chunks          -- 向量检索用的消息分块
```

**关键问题**：
1. `chat_message`表**没有`citations_json`字段**（来源引用追踪缺失）
2. **没有工具确认机制**的数据库支持
3. **没有连接器OAuth令牌存储**

---

#### API端点覆盖 ⚠️ 完成度：60%

**已实现的路由**（从router.ts）：

| 路由 | 挂载路径 | 状态 | 说明 |
|-----|---------|------|------|
| authRouter | `/auth` | ✅ | 登录、注册、验证码 |
| workspaceRouter | `/workspaces` | ✅ | 工作空间CRUD |
| contactRouter | `/contacts` | ✅ | 联系人管理 |
| journalRouter | `/journal-entries` | ✅ | 日记条目 |
| actionRouter | `/action-items` | ✅ | 行动项 |
| toolTaskRouter | `/tool-tasks` | ✅ | 工具任务管理 |
| syncRouter | `/sync` | ✅ | 数据同步 |
| feishuRouter | `/feishu` | ⚠️ | Webhook（OAuth未完整） |
| chatRouter | `/chat` | 🔴 | **硬编码回复，无AI** |
| contextRouter | - | ❌ | **未挂载** |

**🔴 严重问题：Chat路由的硬编码逻辑**

```typescript
// packages/server/src/presentation/http/routes/chat.ts:41-62
const buildAssistantReply = (history, content) => {
  const shouldTriggerFeishu = /飞书|模板|发送/.test(content);
  if (shouldTriggerFeishu) {
    const receiverName = extractReceiverName(content) || '张三';
    return {
      content: `好的，我来帮你消息给${receiverName}。请选择模板并填写内容：`,
      metadata: { suggestTool: { type: 'feishu', receiverName } }
    };
  }
  // ... 其他硬编码逻辑
};
```

**影响**：
- ❌ 没有调用AI模型生成回复
- ❌ 没有上下文构建（L1/L2/L3）
- ❌ 没有工具调用决策
- ❌ 没有SSE流式输出
- ✅ 只是正则匹配后返回预设文本

**设计文档要求的核心端点缺失**：

| 设计要求 | 状态 | 缺失原因 |
|---------|------|----------|
| `POST /v1/agent/chat` (SSE) | ❌ | 无AgentOrchestrator |
| `POST /v1/conversations/:id/archive` | ⚠️ | 归档逻辑未验证 |
| `POST /v1/tool-runs/:id/confirm` | ❌ | 无确认表和逻辑 |
| `GET /v1/contacts/:id/brief` | ✅ | contextUsecases已实现 |

---

### 1.2 Agent系统 ❌ 完成度：5%

**设计要求的核心模块**：

| 模块 | 设计要求 | 当前状态 | 完成度 |
|-----|---------|---------|--------|
| **AgentOrchestrator** | 编排AI调用、工具执行、SSE事件生成 | ❌ 不存在 | 0% |
| **ContextBuilder** | 三层上下文（L1/L2/L3）构建 | ❌ 不存在 | 0% |
| **ToolRegistry** | 工具注册、查询、AI Schema转换 | ❌ 不存在 | 0% |
| **A2UIBuilder** | 生成动态UI Payload | ❌ 不存在 | 0% |
| **PolicyEnforcer** | 强确认策略、权限检查 | ❌ 不存在 | 0% |
| **ToolStateMachine** | 工具状态流转管理 | ⚠️ 部分（tool_task.status） | 30% |

**已有的相关代码分析**：

#### AI基础设施（存在但未使用）

```typescript
// infrastructure/ai/openaiCompat.ts
export class OpenAICompatProvider implements AiProvider {
  async chat(messages, tools?, ...): Promise<string> { ... }
  async brief(context: ContactContext): Promise<string> { ... }
  // ✅ 实现了AI调用接口
  // ❌ 但chat路由完全没用它！
}
```

#### 上下文构建（仅联系人简报用）

```typescript
// application/usecases/contextUsecases.ts
export const buildContactContextUseCase = async (contactId) => {
  // ✅ 获取stableFacts, recentEvents, openActions, similarHistory
  // ❌ 不是设计要求的三层上下文（L1/L2/L3）
  // ❌ 没有会话短期窗口（L1）
  // ❌ 没有会话摘要记忆（L2）
};
```

**问题**：
1. 这只是联系人维度的上下文，不是会话维度
2. 没有"最近N条消息"的L1层
3. 没有长会话的摘要机制（L2层）

#### 工具系统（后台worker，非实时）

```typescript
// worker.ts
async function processToolTasks() {
  const tasks = await claimToolTasksToRun(20);
  for (const task of tasks) {
    const provider = getToolProvider(task.type);
    const result = await provider.execute(task.payload_json);
    await recordToolExecution(...);
    await markToolTaskDone(task.id);
  }
}
```

**问题**：
1. ✅ 有后台异步工具执行
2. ❌ 没有聊天中的实时工具调用
3. ❌ 没有"requires_confirmation"状态（直接从confirmed→running）
4. ❌ 没有工具调用的SSE trace推送

---

### 1.3 飞书连接器 ⚠️ 完成度：40%

#### 已实现部分

```typescript
// routes/feishu.ts
feishuRouter.post('/webhook', async (req, res) => {
  // ✅ 处理飞书Webhook事件
  // ✅ 事件类型识别
  // ✅ 同步到journal_entry
});
```

#### 缺失部分

| 功能 | 状态 | 说明 |
|-----|------|------|
| OAuth授权流程 | ❌ | 无`/connect`端点 |
| OAuth回调处理 | ❌ | 无`/callback`端点 |
| Token存储与刷新 | ❌ | 无connector_tokens表 |
| 飞书工具集 | ❌ | 无feishu_list_templates等工具 |
| 工具注册到Agent | ❌ | 无ToolRegistry |

**当前飞书集成仅为单向webhook接收，无主动调用能力。**

---

### 1.4 测试与安全 ❌ 完成度：10%

| 项目 | 状态 | 文件 |
|-----|------|------|
| 单元测试 | ⚠️ | 仅有smoke-mvp.ts, test-ai.ts |
| 集成测试 | ❌ | 0个 |
| E2E测试 | ❌ | 0个 |
| Rate Limiting | ❌ | 无 |
| Helmet安全头 | ❌ | 无 |
| CORS配置 | ⚠️ | 未审查限制 |

---

## Part 2: 前端实现现状（完成度：85%）

### 2.1 页面与路由 ✅ 完成度：95%

**所有原型屏幕已实现**：

| 原型 | 页面路径 | 完成度 | 说明 |
|-----|---------|--------|------|
| Login/Register | `pages/login/` | ✅ 100% | 邮箱/手机验证码登录 |
| Conversation List | `pages/conversation/` | ✅ 95% | 会话列表 |
| Conversation Chat | `pages/conversation-chat/` | ✅ 90% | SSE聊天界面 |
| Conversation Detail | `pages/conversation-detail/` | ✅ 85% | 会话详情 |
| Contact List | `pages/contacts/` | ✅ 95% | 联系人列表、搜索 |
| Contact Detail | `pages/contact-detail/` | ✅ 90% | 简报/时间轴/事实 |
| Contact Create | `pages/contact-create/` | ✅ 90% | 创建联系人 |
| Action Tab | `pages/action/` | ✅ 90% | 待办/建议 |
| Settings | `pages/settings/` | ✅ 85% | 设置页 |
| Connector Settings | `pages/connector/` | ✅ 80% | 飞书连接器 |

**评价**：前端页面覆盖完整，UI/UX已打磨。

---

### 2.2 A2UI组件系统 ✅ 完成度：100%

**核心组件已全部实现**：

```
components/
├── A2UIRenderer/           ✅ 动态渲染引擎
├── ArchiveReviewCard/      ✅ 归档确认卡
├── ToolTraceCard/          ✅ 工具执行状态
├── ConfirmBar/             ✅ 强确认条
├── CitationHighlight/      ✅ 来源引用高亮
├── DraftPreview/           ✅ 草稿预览
├── TemplatePicker/         ✅ 模板选择器
└── VariableForm/           ✅ 变量表单
```

**A2UIRenderer分析**（`components/A2UIRenderer/index.tsx`）：

```typescript
export const A2UIRenderer: React.FC<{ payload: A2UIPayload }> = ({ payload }) => {
  switch (payload.type) {
    case 'archive_review': return <ArchiveReviewCard {...payload} />;
    case 'tool_trace': return <ToolTraceCard {...payload} />;
    case 'confirm_bar': return <ConfirmBar {...payload} />;
    case 'template_picker': return <TemplatePicker {...payload} />;
    case 'variable_form': return <VariableForm {...payload} />;
    // ...
  }
};
```

**评价**：
- ✅ **Server-driven UI架构优秀**
- ✅ 组件完整、类型安全
- ❌ **但后端没有生成A2UI payload的逻辑**（当前chat路由只返回文本）

---

### 2.3 SSE流式集成 ✅ 完成度：100%

#### SSE客户端实现

```typescript
// utils/sse/sseClient.ts
export class SSEClient {
  connect(url: string, handlers: EventHandlers) {
    const reader = response.body.getReader();
    // ✅ 完整的SSE解析逻辑
    // ✅ 重连机制
    // ✅ 错误处理
  }
}
```

#### useAgentChat Hook

```typescript
// hooks/useAgentChat.ts
export function useAgentChat(sessionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentDelta, setCurrentDelta] = useState('');
  const [pendingUI, setPendingUI] = useState<A2UIPayload | null>(null);
  const [toolTraces, setToolTraces] = useState<ToolTrace[]>([]);

  const sendMessage = async (content, contactId?) => {
    // ✅ SSE事件处理：message.delta, message.final, ui, tool.trace, error
  };

  return { messages, sendMessage, isStreaming, currentDelta, pendingUI, toolTraces };
}
```

**测试覆盖**：
- ✅ `__tests__/utils/sseClient.test.ts`
- ✅ `hooks/__tests__/useAgentChat.test.ts`

**问题**：
- ✅ 前端SSE基础设施完备
- ❌ **但后端没有SSE端点**（chat路由返回JSON，不是SSE）

---

### 2.4 聊天页面集成 ✅ 完成度：90%

**conversation-chat/index.tsx**：

```typescript
const ConversationChatPage = () => {
  const { messages, sendMessage, isStreaming, currentDelta, pendingUI, toolTraces }
    = useAgentChat(sessionId);

  return (
    <>
      {messages.map(msg => <MessageBubble {...msg} />)}
      {currentDelta && <StreamingText text={currentDelta} />}
      {pendingUI && <A2UIRenderer payload={pendingUI} />}
      {toolTraces.map(trace => <ToolTraceCard {...trace} />)}
    </>
  );
};
```

**评价**：
- ✅ UI完整、流式文本渲染、A2UI集成、工具状态展示
- ❌ **等待后端SSE端点对接**

---

### 2.5 API服务层 ✅ 完成度：90%

```typescript
// services/api.ts
class ApiService {
  request<T>(endpoint, options): Promise<T> { ... }
  // ✅ 统一请求封装
  // ✅ Token注入
  // ✅ 错误处理
  // ✅ 类型安全
}
```

---

## Part 3: 核心差距分析

### 3.1 设计文档 vs 实际实现对比表

| 设计要求 | 优先级 | 后端状态 | 前端状态 | 阻塞原因 |
|---------|--------|---------|---------|----------|
| **三层上下文（L1/L2/L3）** | P0 | ❌ 0% | N/A | 无ContextBuilder |
| **AgentOrchestrator编排** | P0 | ❌ 0% | N/A | 完全缺失 |
| **SSE流式聊天端点** | P0 | ❌ 0% | ✅ 100% | 后端无实现 |
| **A2UI生成逻辑** | P0 | ❌ 0% | ✅ 100% | 后端无A2UIBuilder |
| **工具注册与调用** | P0 | ⚠️ 30% | ✅ 100% | 无ToolRegistry |
| **工具强确认流程** | P1 | ❌ 0% | ✅ 100% | 无数据库表 |
| **Citations引用系统** | P1 | ❌ 0% | ✅ 100% | 数据库字段缺失 |
| **飞书OAuth授权** | P1 | ❌ 0% | ✅ 80% | 后端无OAuth逻辑 |
| **会话归档提取** | P1 | ⚠️ 50% | ✅ 90% | 提取逻辑未验证 |
| **联系人简报生成** | P1 | ✅ 90% | ✅ 95% | 基本可用 |

**结论**：
- **前端已为AI系统做好准备**（SSE、A2UI、工具确认UI全部就绪）
- **后端核心Agent系统完全空缺**（当前仅为传统CRUD API）

---

### 3.2 关键技术债务

#### 🔴 P0级（阻塞MVP）

1. **Chat路由硬编码回复**
   - **位置**：`packages/server/src/presentation/http/routes/chat.ts:41-62`
   - **问题**：使用正则匹配返回预设文本，完全没有AI调用
   - **影响**：用户体验为"假AI"
   - **修复工时**：3-5天（实现AgentOrchestrator + SSE）

2. **无SSE流式端点**
   - **设计要求**：`POST /v1/agent/chat` (SSE)
   - **当前**：`POST /v1/chat/sessions/:id/messages` (JSON)
   - **影响**：前端SSE Hook空转
   - **修复工时**：1.5天

3. **无三层上下文构建**
   - **设计要求**：L1（短期窗口）+ L2（会话摘要）+ L3（向量召回）
   - **当前**：只有联系人维度的context
   - **影响**：AI无法感知会话历史
   - **修复工时**：2天

#### 🟡 P1级（影响核心功能）

4. **无工具确认机制**
   - **缺失**：tool_confirmations表 + 确认API
   - **影响**：写操作工具（发飞书消息）可能误触发
   - **修复工时**：2天

5. **飞书OAuth未实现**
   - **缺失**：connector_tokens表 + OAuth流程
   - **影响**：无法连接飞书
   - **修复工时**：2天

6. **Citations字段缺失**
   - **缺失**：chat_message.citations_json
   - **影响**：AI回复无法追溯来源
   - **修复工时**：0.5天（数据库迁移）

#### 🟢 P2级（可后续优化）

7. **测试覆盖率低**
   - **当前**：<15%
   - **目标**：80%
   - **修复工时**：4天

8. **安全加固**
   - **缺失**：Rate limiting, Helmet, CORS限制
   - **修复工时**：1天

---

### 3.3 架构设计偏差

**设计文档期望的数据流**：

```
User → SSE连接 → AgentOrchestrator → ContextBuilder(L1/L2/L3)
  → AI Model → ToolRegistry → 工具执行 → SSE推送 → 前端渲染
```

**当前实际数据流**：

```
User → HTTP POST → 正则匹配 → 预设文本 → JSON响应 → 前端显示
```

**偏差原因**：
1. 核心Agent模块完全未开发
2. 现有代码为传统CRUD原型，不是AI原生架构
3. AI基础设施（openaiCompat.ts）存在但未集成到聊天流程

---

## Part 4: 可交付物评估

### 4.1 当前可演示功能（V0-）

✅ **可用功能**：
- 登录/注册
- 联系人CRUD
- 日记条目添加
- 联系人简报生成（调用AI）
- 行动项管理
- 会话列表/创建
- **硬编码聊天**（正则回复）

❌ **不可用核心功能**：
- AI流式聊天
- 会话归档提取
- 工具调用（飞书发消息）
- 来源引用追踪
- 动态A2UI展示

### 4.2 距离MVP的差距

**设计文档定义的V0 MVP**：
> 多会话多消息聊天 + 会话归档提取 + 联系人简报 + 行动面板 + 会话历史Drawer

**当前状态**：
- ✅ 联系人简报（90%）
- ✅ 行动面板（90%）
- ⚠️ 多会话聊天（页面100%，后端30%）
- ❌ 会话归档（提取逻辑未验证）
- ✅ 会话历史Drawer（前端100%）

**完成度**：**55% → 48%**（修正后，因Chat为假AI）

---

## Part 5: 推荐修复路径

### 5.1 最小可行修复（2周冲刺）

**目标**：实现真实的AI流式聊天 + 基础工具调用

#### Week 1: Agent核心

| 任务 | 工时 | 负责人 | 交付物 |
|-----|------|--------|--------|
| Task 1: 修复Router冲突 | 0.5天 | 后端 | contactRouter正常 |
| Task 2: 类型定义（Agent + A2UI） | 1天 | 后端 | types/a2ui.ts, agent/types.ts |
| Task 3: 数据库迁移（citations + confirmations） | 0.5天 | 后端 | 006_citations.sql, 007_tool_confirmations.sql |
| Task 4: AgentOrchestrator实现 | 3天 | 后端 | agent/orchestrator.ts, contextBuilder.ts |

#### Week 2: 集成与验证

| 任务 | 工时 | 负责人 | 交付物 |
|-----|------|--------|--------|
| Task 5: SSE流式API | 1.5天 | 后端 | routes/agent.ts (POST /v1/agent/chat) |
| Task 6: 前端SSE对接 | 1天 | 前端 | 验证流式聊天工作 |
| Task 7: 基础工具注册（飞书只读） | 1.5天 | 后端 | agent/tools/feishuTools.ts |
| Task 8: E2E测试 | 2天 | QA | 聊天→归档→简报闭环 |

**里程碑**：
- Day 5: AgentOrchestrator可调用AI
- Day 8: SSE流式聊天工作
- Day 10: 飞书模板读取工作

---

### 5.2 完整MVP路径（4周）

基于[implementation-plan.md](file:///Users/haoqi/OnePersonCompany/friendsAI/designs/implementation-plan.md)的12个Task：

**Week 1-2**：Task 1-7（Agent核心 + SSE + A2UI）
**Week 3**：Task 8-11（飞书OAuth + 工具确认 + Citations）
**Week 4**：Task 12（测试覆盖 + 安全加固）

---

## Part 6: 风险与建议

### 6.1 技术风险

| 风险 | 严重性 | 缓解措施 |
|-----|--------|----------|
| 长会话上下文溢出 | 高 | 必须实现L2会话摘要 |
| A2UI schema不稳定 | 中 | 使用Zod运行时校验 + 版本化 |
| 工具误触发 | 高 | 强制确认策略（数据库约束） |
| SSE连接中断 | 中 | 前端重连机制（已有）+ 消息持久化 |

### 6.2 进度建议

**🚨 立即行动**：
1. **停止前端新功能开发**（前端已超前）
2. **全力攻坚后端Agent系统**
3. **优先实现SSE聊天端点**（解锁前端已有能力）

**协作建议**：
- 后端开发者A：专注Agent编排（Task 2/4/5）
- 后端开发者B：专注连接器与工具（Task 3/8/9）
- 前端开发者：辅助E2E测试、UI细节打磨

### 6.3 架构建议

1. **保持Clean Architecture**：当前分层清晰，继续保持
2. **面向接口编程**：AI Provider、Tool Provider已有接口，新增功能遵循
3. **渐进式集成**：先让基础聊天工作，再加工具调用、A2UI
4. **测试驱动**：每个Agent模块必须有单元测试（当前0%）

---

## 附录A: 关键文件清单

### 需要创建的文件（25个）

#### 后端（16个）

```
packages/server/src/
├── agent/
│   ├── index.ts                    ❌ 新建
│   ├── types.ts                    ❌ 新建
│   ├── orchestrator.ts             ❌ 新建
│   ├── contextBuilder.ts           ❌ 新建
│   ├── toolRegistry.ts             ❌ 新建
│   ├── policies.ts                 ❌ 新建
│   ├── a2uiBuilder.ts              ❌ 新建
│   └── tools/
│       ├── index.ts                ❌ 新建
│       └── feishuTools.ts          ❌ 新建
├── types/
│   ├── a2ui.ts                     ❌ 新建
│   └── tooltrace.ts                ❌ 新建
├── presentation/http/routes/
│   └── agent.ts                    ❌ 新建（SSE端点）
└── infrastructure/connectors/feishu/
    ├── oauth.ts                    ❌ 新建
    ├── client.ts                   ❌ 新建
    └── types.ts                    ❌ 新建
```

#### 数据库迁移（3个）

```
migrations/
├── 006_citations.sql               ❌ 新建
├── 007_tool_confirmations.sql      ❌ 新建
└── 008_connector_tokens.sql        ❌ 新建
```

#### 前端（0个，已全部实现）

```
✅ 前端所有必需文件已存在
```

### 需要修改的文件（6个）

```
packages/server/src/
├── presentation/http/router.ts                 ⚠️ 修改（挂载agent.ts）
├── presentation/http/routes/chat.ts            ⚠️ 重构（移除硬编码）
├── presentation/http/routes/feishu.ts          ⚠️ 增强（OAuth端点）
├── infrastructure/repositories/chatRepo.ts     ⚠️ 修改（支持citations）
└── infrastructure/repositories/contextRepo.ts  ⚠️ 增强（工具确认）

packages/client/src/
└── pages/conversation-chat/index.tsx           ⚠️ 微调（连接新端点）
```

---

## 附录B: 数据库Schema补充

### 需要添加的迁移

#### 006_citations.sql

```sql
-- 为chat_message表添加citations字段
ALTER TABLE chat_message
ADD COLUMN citations_json JSONB DEFAULT '[]'::jsonb;

CREATE INDEX idx_chat_message_citations ON chat_message USING GIN (citations_json);

COMMENT ON COLUMN chat_message.citations_json IS
'引用来源，格式：{"sourceMessageIds": ["msg1", "msg2"], "spans": [{"start": 10, "end": 20, "sourceIndex": 0}]}';
```

#### 007_tool_confirmations.sql

```sql
CREATE TABLE tool_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_session(id) ON DELETE CASCADE,
  tool_call_id VARCHAR(255) NOT NULL,
  tool_name VARCHAR(100) NOT NULL,
  params JSONB NOT NULL,
  state VARCHAR(50) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tool_confirmations_session ON tool_confirmations(session_id);
CREATE INDEX idx_tool_confirmations_tool_call ON tool_confirmations(tool_call_id);
CREATE INDEX idx_tool_confirmations_expires ON tool_confirmations(expires_at);

COMMENT ON TABLE tool_confirmations IS '工具执行强确认记录';
```

#### 008_connector_tokens.sql

```sql
CREATE TABLE connector_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, provider)
);

CREATE INDEX idx_connector_tokens_workspace ON connector_tokens(workspace_id);

COMMENT ON TABLE connector_tokens IS '连接器OAuth令牌存储（加密）';
COMMENT ON COLUMN connector_tokens.access_token IS '访问令牌（应用层AES加密）';
COMMENT ON COLUMN connector_tokens.refresh_token IS '刷新令牌（应用层AES加密）';
```

---

## 总结

**项目亮点**：
- ✅ 前端实现质量高、组件化好、SSE集成完整
- ✅ 后端架构设计专业、Clean Architecture清晰
- ✅ 数据库设计合理、pgvector集成

**核心问题**：
- 🔴 Chat路由为硬编码正则回复，**无真实AI调用**
- 🔴 Agent编排系统完全缺失（AgentOrchestrator等5个核心模块）
- 🔴 SSE流式端点不存在，前端SSE能力无法使用

**建议优先级**：
1. **P0**：实现AgentOrchestrator + SSE端点（解锁AI聊天）
2. **P1**：三层上下文构建 + 工具确认机制
3. **P2**：飞书OAuth + Citations + 测试覆盖

**预估工时**：
- 最小可行修复（真实AI聊天）：**2周**
- 完整MVP（含工具调用、归档）：**4周**
- 生产就绪（含测试、安全）：**5周**

---

**文档版本**: v1.0
**下次更新**: 完成Task 1-5后重新评估
**联系**: 项目架构师
