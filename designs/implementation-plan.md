# FriendsAI 实现完成度分析 & 开发任务拆分

## 项目概述

**项目**: AI原生人脉管理系统 (关系情报应用)
**技术栈**: Taro + React 前端 | Express + TypeScript 后端 | PostgreSQL + pgvector
**整体完成度**: ~55%

---

# Part 1: 当前现状

## 1.1 前端实现状态 (完成度: 82%)

### 页面覆盖情况

| 原型屏幕 | 实现文件 | 状态 | 说明 |
|---------|---------|------|------|
| 1. Login/Register | `pages/login` | ✅ 90% | 邮箱/手机+验证码登录 |
| 2. Conversation Tab | `pages/conversation` | ✅ 85% | 主页聊天入口 |
| 3. Conversation Detail | `pages/conversation-detail` | ✅ 80% | AI归档结果展示 |
| 4. Contact List Tab | `pages/contacts` | ✅ 85% | 搜索、分组、筛选 |
| 4.1 Contact List Empty | `pages/contacts` | ✅ 90% | 空状态 |
| 5. Contact Detail | `pages/contact-detail` | ✅ 75% | 简报/时间轴/事实 |
| 6. Action Tab | `pages/action` | ✅ 80% | 待办/建议/周回顾 |
| 7. Settings | `pages/settings` | ✅ 70% | 基础设置 |
| 8. Global Drawer | `components/GlobalDrawer` | ✅ 85% | 会话历史抽屉 |
| C1. Settings - Connector | `pages/connector` | ✅ 75% | 飞书连接器 |
| C2. Tool Panel | `components/BottomSheet` | ✅ 80% | 飞书模板底部面板 |
| C2.1 Messages List | `pages/conversation-chat` | ✅ 85% | 聊天消息列表 |

### 组件实现情况

| 组件 | 文件 | 状态 |
|-----|------|------|
| StatusBar | `components/StatusBar` | ✅ 已实现 |
| Header | `components/Header` | ✅ 已实现 |
| TabBar | `components/TabBar` | ✅ 已实现 |
| ContactCard | `components/ContactCard` | ✅ 已实现 |
| RecordCard | `components/RecordCard` | ✅ 已实现 |
| BottomSheet | `components/BottomSheet` | ✅ 已实现 |
| GlobalDrawer | `components/GlobalDrawer` | ✅ 已实现 |
| **A2UI组件** | - | ❌ 未组件化 |

### 前端缺失项

1. **A2UI组件系统** - ArchiveReviewCard, ToolTraceCard, ConfirmBar 未独立组件化
2. **SSE Hook** - 无流式聊天hook
3. **Citations渲染** - 来源引用高亮组件缺失

---

## 1.2 后端实现状态 (完成度: 60%)

### 已实现模块

```
packages/server/src/
├── app/                    # ✅ 中间件 (auth, error, validate)
├── application/            # ✅ Use Cases (auth, context, action, sync, journal)
├── infrastructure/
│   ├── ai/                 # ✅ AI SDK集成 (openaiCompat.ts)
│   ├── db/                 # ✅ PostgreSQL + 5个迁移
│   ├── repositories/       # ✅ 8个Repo (user, workspace, contact, chat...)
│   └── tools/              # ⚠️ Mock工具提供者
├── presentation/http/
│   └── routes/             # ✅ 10个路由模块
└── types/                  # ⚠️ 基础类型，缺A2UI
```

### API端点覆盖

| 设计文档 API | 状态 | 说明 |
|-------------|------|------|
| POST /v1/conversations | ✅ | 通过journal实现 |
| GET /v1/conversations | ✅ | 列表 |
| GET /v1/conversations/:id/messages | ✅ | 消息历史 |
| **POST /v1/agent/chat (SSE)** | ❌ | **核心缺失** |
| POST /v1/conversations/:id/archive | ✅ | 触发提取 |
| POST /v1/conversations/:id/archive/apply | ✅ | 确认归档 |
| GET /v1/contacts | ✅ | 联系人列表 |
| GET /v1/contacts/:id/brief | ✅ | 简报生成 |
| GET /v1/actions/todos | ✅ | 待办列表 |
| GET /v1/connectors/feishu/status | ✅ | 连接状态 |
| POST /v1/connectors/feishu/connect | ⚠️ | OAuth待验证 |
| POST /v1/tool-runs/:id/confirm | ⚠️ | 部分实现 |

### 后端关键问题

| 问题 | 严重性 | 位置 |
|------|--------|------|
| **Router冲突** | 🔴 阻塞 | `router.ts` 第17/19行 `/contacts`重复挂载 |
| **Chat硬编码** | 🔴 阻塞 | `routes/chat.ts` 使用regex回复，无真实AI |
| **无SSE支持** | 🔴 阻塞 | 缺少 `/v1/agent/chat` SSE端点 |
| Context Builder缺失 | 🟡 高 | 无三层上下文架构 |
| A2UI Schema缺失 | 🟡 高 | 无标准化UI payload |
| 空目录 | 🟢 低 | controllers/, middleware/, models/ 空 |

---

## 1.3 Agent系统状态 (完成度: 40%)

### 已有基础

- `infrastructure/ai/openaiCompat.ts` - AI提供者 (支持primary/fallback)
- `infrastructure/ai/embeddings.ts` - 向量嵌入服务
- `application/usecases/contextUsecases.ts` - 基础上下文构建

### 核心缺失

| 模块 | 设计要求 | 当前状态 |
|------|---------|---------|
| AgentOrchestrator | Agent编排核心 | ❌ 不存在 |
| ContextBuilder (L1/L2/L3) | 三层上下文 | ❌ 不存在 |
| ToolRegistry | 工具注册管理 | ❌ 不存在 |
| ToolStateMachine | 状态机 (planned→executing→succeeded) | ❌ 不存在 |
| A2UIBuilder | UI Payload生成 | ❌ 不存在 |
| Citations | 来源引用追踪 | ❌ 不存在 |

---

## 1.4 连接器状态 (完成度: 50%)

### 飞书连接器

| 功能 | 状态 | 说明 |
|------|------|------|
| 模板列表 | ✅ | Mock数据 |
| 发送消息 | ⚠️ | Mock实现 |
| OAuth连接 | ❓ | 代码存在，未验证 |
| OAuth回调 | ❓ | 代码存在，未验证 |
| Token刷新 | ❌ | 未实现 |
| 工具注册到Agent | ❌ | 未实现 |

---

## 1.5 测试与安全 (完成度: 15%)

| 项目 | 状态 |
|------|------|
| 单元测试 | ❌ 0% |
| 集成测试 | ❌ 0% |
| E2E测试 | ❌ 0% |
| Rate Limiting | ❌ 缺失 |
| Helmet安全头 | ❌ 缺失 |
| CORS配置 | ⚠️ 开放所有 |

---

# Part 2: 开发任务拆分

## 任务依赖图

```
┌─────────────────────────────────────────────────────────────────┐
│                        可并行执行                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Task 1]          [Task 2]           [Task 3]                  │
│  Router修复         类型定义            数据库迁移                  │
│  (后端)            (后端)              (后端)                     │
│     │                 │                   │                     │
│     └────────┬────────┴───────────────────┘                     │
│              ▼                                                  │
│         [Task 4]                                                │
│       Agent核心编排                                               │
│       (后端，依赖1,2,3)                                           │
│              │                                                  │
│     ┌────────┴────────┐                                         │
│     ▼                 ▼                                         │
│  [Task 5]         [Task 6]                                      │
│  SSE流式API        A2UI组件                                       │
│  (后端)           (前端)                                          │
│     │                 │                                         │
│     └────────┬────────┘                                         │
│              ▼                                                  │
│         [Task 7]                                                │
│       前端SSE集成                                                 │
│       (前端，依赖5,6)                                             │
│              │                                                  │
│     ┌────────┴────────┐                                         │
│     ▼                 ▼                                         │
│  [Task 8]         [Task 9]          [Task 10]                   │
│  飞书OAuth        飞书工具           Citations                    │
│  (后端)          (后端)             (全栈)                        │
│     │                 │                                         │
│     └────────┬────────┘                                         │
│              ▼                                                  │
│         [Task 11]                                               │
│        工具强确认流程                                              │
│        (全栈，依赖8,9)                                            │
│              │                                                  │
│              ▼                                                  │
│         [Task 12]                                               │
│          测试覆盖                                                 │
│         (全栈)                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Task 1: Router冲突修复 [后端]

**优先级**: 🔴 P0 - 阻塞
**预估**: 0.5天
**可并行**: ✅ 是
**前置依赖**: 无

### 问题描述

`router.ts` 中 `/contacts` 路径被重复挂载：
- 第17行: `contactsRouter` 挂载到 `/contacts`
- 第19行: `contextRouter` 也挂载到 `/contacts`

导致 `contextRouter` 覆盖了 `contactsRouter`，联系人相关API不可用。

### 输入

- 文件: `packages/server/src/presentation/http/router.ts`

### 输出

- `contactsRouter` 保持挂载在 `/contacts`
- `contextRouter` 改为挂载在 `/context`

### 对接协议变更

| 原路径 | 新路径 |
|-------|-------|
| GET /v1/contacts/:id/context | GET /v1/context/:contactId/context |
| GET /v1/contacts/:id/brief | GET /v1/context/:contactId/brief |

### 验收标准

- [ ] GET /v1/contacts 返回联系人列表 (200)
- [ ] GET /v1/contacts/:id 返回单个联系人 (200)
- [ ] GET /v1/context/:contactId/brief 返回简报 (200)
- [ ] 无路由冲突警告
- [ ] 前端相关调用已同步修改 (如有)

### 建议实现

1. 检查 `contextRouter` 中定义的路由，确认依赖的参数名
2. 修改挂载路径
3. 更新 Postman/API 文档

---

## Task 2: 类型定义 [后端]

**优先级**: 🔴 P0
**预估**: 1天
**可并行**: ✅ 是
**前置依赖**: 无

### 目标

定义 Agent 系统和 A2UI 所需的 TypeScript 类型，作为前后端对接的契约。

### 输出文件

| 文件 | 职责 |
|-----|------|
| `packages/server/src/agent/types.ts` | Agent 核心类型 |
| `packages/server/src/types/a2ui.ts` | A2UI 组件 schema |
| `packages/server/src/types/tooltrace.ts` | 工具执行跟踪类型 |

### 类型定义规范

#### 1. 工具状态机 (ToolState)

```
状态流转: planned → requires_auth → requires_confirmation → executing → succeeded/failed
```

| 状态 | 含义 |
|-----|------|
| `planned` | AI规划了工具调用，尚未执行 |
| `requires_auth` | 需要连接器授权 |
| `requires_confirmation` | 需要用户确认 (写操作) |
| `executing` | 正在执行 |
| `succeeded` | 执行成功 |
| `failed` | 执行失败 |

#### 2. SSE 事件类型 (SSEEventType)

| 事件 | 用途 | data 结构 |
|-----|------|----------|
| `message.delta` | 流式文本增量 | `{ content: string }` |
| `message.final` | 完整消息 | `{ content: string, citations?: Citation[] }` |
| `ui` | A2UI 组件 | `A2UIPayload` |
| `tool.trace` | 工具执行状态 | `ToolTrace` |
| `error` | 错误 | `{ code: string, message: string }` |

#### 3. 三层上下文 (ContextLayers)

| 层级 | 内容 | 来源 |
|-----|------|------|
| L1 | 最近 N 条消息 (建议20-40条) | 当前会话 |
| L2 | 会话摘要 | 超过阈值时生成 |
| L3 | 结构化数据 + 向量召回 | 联系人相关 events/facts/todos/brief |

#### 4. A2UI 组件类型

| 组件 | 用途 | 关键 props |
|-----|------|-----------|
| `ArchiveReviewCard` | 归档确认 | extractedItems, onConfirm, onEdit |
| `TemplatePicker` | 选择飞书模板 | templates, selectedId, onSelect |
| `VariableForm` | 填写模板变量 | variables, values, onChange |
| `DraftPreview` | 预览生成文案 | drafts, selectedIndex |
| `ConfirmBar` | 强确认条 | title, description, onConfirm, onCancel |
| `ToolTraceCard` | 工具执行状态 | toolName, state, input, output, error |

#### 5. Citation (来源引用)

| 字段 | 类型 | 说明 |
|-----|------|------|
| sourceMessageIds | string[] | 引用的源消息 ID 列表 |
| spans | Array<{start, end, sourceIndex}> | 文本中的引用位置 |

### 验收标准

- [ ] 所有类型定义完整且可 import
- [ ] 使用 Zod 定义运行时校验 schema (A2UI)
- [ ] 导出到统一入口 `packages/server/src/types/index.ts`
- [ ] 类型文档注释完整

### 建议实现

1. 先定义基础类型 (ToolState, SSEEventType)
2. 定义复合类型 (ContextLayers, Citation)
3. 使用 Zod 定义 A2UI schema，同时导出类型和校验器
4. 编写类型测试确保 schema 正确

---

## Task 3: 数据库迁移 [后端]

**优先级**: 🟡 P1
**预估**: 0.5天
**可并行**: ✅ 是
**前置依赖**: 无

### 目标

添加 Agent 系统所需的数据库表和字段。

### 输出文件

| 文件 | 职责 |
|-----|------|
| `migrations/006_citations.sql` | 消息引用字段 |
| `migrations/007_tool_confirmations.sql` | 工具确认表 |
| `migrations/008_connector_tokens.sql` | 连接器令牌表 |

### Schema 定义

#### 006_citations.sql

修改 `chat_message` 表:

| 字段 | 类型 | 说明 |
|-----|------|------|
| citations_json | JSONB | 引用数据，默认 `[]` |

#### 007_tool_confirmations.sql

新建 `tool_confirmations` 表:

| 字段 | 类型 | 约束 | 说明 |
|-----|------|------|------|
| id | UUID | PK | 主键 |
| session_id | UUID | FK → chat_session | 会话 ID |
| tool_call_id | VARCHAR(255) | NOT NULL | 工具调用 ID |
| tool_name | VARCHAR(100) | NOT NULL | 工具名称 |
| params | JSONB | NOT NULL | 调用参数 |
| state | VARCHAR(50) | DEFAULT 'pending' | pending/confirmed/cancelled/expired |
| expires_at | TIMESTAMPTZ | NOT NULL | 过期时间 |
| confirmed_at | TIMESTAMPTZ | - | 确认时间 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 创建时间 |

索引: `(session_id)`, `(tool_call_id)`, `(expires_at)`

#### 008_connector_tokens.sql

新建 `connector_tokens` 表:

| 字段 | 类型 | 约束 | 说明 |
|-----|------|------|------|
| id | UUID | PK | 主键 |
| workspace_id | UUID | FK → workspace | 工作空间 |
| provider | VARCHAR(50) | NOT NULL | feishu/dingtalk/wecom |
| access_token | TEXT | NOT NULL | 访问令牌 (加密) |
| refresh_token | TEXT | - | 刷新令牌 (加密) |
| expires_at | TIMESTAMPTZ | - | 令牌过期时间 |
| scopes | TEXT[] | - | 授权范围 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | - |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | - |

约束: `UNIQUE(workspace_id, provider)`

### 验收标准

- [ ] `npm run migrate` 执行成功
- [ ] 新表/字段在数据库中存在
- [ ] 支持回滚 (down migration)
- [ ] 索引创建正确

### 建议实现

1. 遵循现有迁移文件命名规范
2. 敏感字段 (access_token, refresh_token) 应在应用层加密
3. 考虑添加 `updated_at` 触发器

---

## Task 4: Agent核心编排 [后端]

**优先级**: 🔴 P0
**预估**: 3天
**可并行**: ❌ 否
**前置依赖**: Task 1, 2, 3

### 目标

实现 Agent 编排核心，包括三层上下文构建、工具注册、状态机管理。

### 输出文件

| 文件 | 职责 |
|-----|------|
| `agent/index.ts` | 模块入口 |
| `agent/orchestrator.ts` | Agent 主循环，生成 SSE 事件 |
| `agent/contextBuilder.ts` | 三层上下文构建 |
| `agent/toolRegistry.ts` | 工具注册与查询 |
| `agent/policies.ts` | 工具执行策略 (确认/权限) |

### 接口定义

#### AgentOrchestrator

**输入**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| sessionId | string | ✅ | 会话 ID |
| userMessage | string | ✅ | 用户消息 |
| contactId | string | ❌ | 关联联系人 (用于 L3 上下文) |

**输出**: `AsyncGenerator<SSEEvent>`

生成的事件序列:
1. `tool.trace` (如有工具调用)
2. `message.delta` (多次，流式文本)
3. `ui` (如有 A2UI 组件)
4. `message.final` (一次，完整消息)

#### ContextBuilder

**输入**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| sessionId | string | 会话 ID |
| contactId | string? | 联系人 ID |

**输出**: `ContextLayers`

**构建逻辑**:
- L1: 从 `chatRepo` 获取最近 20 条消息
- L2: 消息数超过 40 条时，调用 AI 生成摘要
- L3: 从 `contactRepo` 获取 events/facts/todos/brief

#### ToolRegistry

**方法**:
| 方法 | 输入 | 输出 | 说明 |
|-----|------|------|------|
| register | ToolDefinition | void | 注册工具 |
| get | toolName: string | ToolDefinition | 获取工具 |
| getAll | - | ToolDefinition[] | 获取所有工具 |
| getForAI | - | AIToolSchema[] | 获取 AI SDK 格式的工具定义 |

**ToolDefinition 结构**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| name | string | 工具名称 |
| description | string | 工具描述 (给 AI 看) |
| parameters | ZodSchema | 参数校验 |
| requiresAuth | boolean | 是否需要连接器授权 |
| requiresConfirmation | boolean | 是否需要用户确认 |
| execute | Function | 执行函数 |

### 验收标准

- [ ] AgentOrchestrator 可实例化并正确生成 SSE 事件
- [ ] 三层上下文按规则正确构建
- [ ] 工具可注册和查询
- [ ] 工具调用时正确判断 requiresAuth/requiresConfirmation
- [ ] 单元测试覆盖核心逻辑

### 建议实现

1. 使用 Vercel AI SDK 的 `streamText` 进行流式生成
2. ContextBuilder 使用 `Promise.all` 并行获取三层数据
3. 工具执行前检查策略，必要时生成 `requires_confirmation` 状态
4. 考虑超时和错误处理

---

## Task 5: SSE流式API [后端]

**优先级**: 🔴 P0
**预估**: 1.5天
**可并行**: ❌ 否
**前置依赖**: Task 4

### 目标

实现 `POST /v1/agent/chat` SSE 端点。

### 输出文件

| 文件 | 职责 |
|-----|------|
| `routes/agent.ts` | Agent 路由 (新建) |
| `router.ts` | 注册路由 (修改) |

### API 规范

**端点**: `POST /v1/agent/chat`

**请求头**:
| Header | 值 |
|--------|---|
| Content-Type | application/json |
| Authorization | Bearer {token} |
| X-Workspace-Id | {workspaceId} |

**请求体**:
| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| sessionId | string | ✅ | 会话 ID |
| message | string | ✅ | 用户消息 |
| contactId | string | ❌ | 关联联系人 |

**响应头**:
| Header | 值 |
|--------|---|
| Content-Type | text/event-stream |
| Cache-Control | no-cache |
| Connection | keep-alive |
| X-Accel-Buffering | no |

**SSE 事件格式**:
```
event: {eventType}
data: {json}

```

**事件类型**: 见 Task 2 中 SSEEventType 定义

### 错误处理

| 错误 | HTTP Status | SSE Event |
|-----|-------------|-----------|
| 未授权 | 401 | - |
| 会话不存在 | 404 | - |
| AI 调用失败 | - | `event: error` |
| 工具执行失败 | - | `event: error` |

### 验收标准

- [ ] curl 测试可正常接收 SSE 事件流
- [ ] `message.delta` 实时推送，间隔 < 100ms
- [ ] `tool.trace` 状态更新正确
- [ ] 连接断开时资源正确清理
- [ ] Nginx 代理配置文档 (X-Accel-Buffering)

### 建议实现

1. 使用 `res.write()` 逐条写入事件
2. 设置正确的响应头禁用缓冲
3. 监听 `req.on('close')` 处理客户端断开
4. 错误时发送 `error` 事件后再 `res.end()`

---

## Task 6: A2UI组件 [前端]

**优先级**: 🟡 P1
**预估**: 2.5天
**可并行**: ✅ 是 (与 Task 5 并行)
**前置依赖**: Task 2 (类型定义)

### 目标

实现 A2UI 组件系统，用于渲染 AI 返回的动态 UI。

### 输出文件

| 文件 | 职责 |
|-----|------|
| `components/A2UI/index.ts` | 模块入口 |
| `components/A2UI/Renderer.tsx` | 动态组件分发器 |
| `components/A2UI/ArchiveReviewCard.tsx` | 归档确认卡片 |
| `components/A2UI/TemplatePicker.tsx` | 模板选择器 |
| `components/A2UI/VariableForm.tsx` | 变量填写表单 |
| `components/A2UI/DraftPreview.tsx` | 草稿预览 |
| `components/A2UI/ConfirmBar.tsx` | 强确认条 |
| `components/A2UI/ToolTraceCard.tsx` | 工具执行状态 |
| `components/A2UI/styles.scss` | 样式 |

### 组件规范

#### Renderer

**输入**: `{ payload: A2UIPayload }`
**输出**: 对应的 A2UI 组件

**逻辑**: 根据 `payload.type` 分发到对应组件

#### ArchiveReviewCard

**Props**:
| 属性 | 类型 | 说明 |
|-----|------|------|
| contactId | string | 联系人 ID |
| extractedItems | ExtractedItem[] | 提取的事件/事实/行动 |
| onConfirm | () => void | 确认回调 |
| onEdit | () => void | 编辑回调 |

**UI 要素**: 联系人信息、提取项列表 (可编辑)、确认/编辑按钮

#### TemplatePicker

**Props**:
| 属性 | 类型 | 说明 |
|-----|------|------|
| templates | Template[] | 模板列表 |
| selectedId | string? | 选中的模板 |
| onSelect | (id: string) => void | 选择回调 |

**UI 要素**: 模板卡片列表、选中状态

#### ToolTraceCard

**Props**:
| 属性 | 类型 | 说明 |
|-----|------|------|
| id | string | 工具调用 ID |
| name | string | 工具名称 |
| state | ToolState | 执行状态 |
| input | object? | 输入参数 |
| output | object? | 输出结果 |
| error | string? | 错误信息 |

**UI 要素**: 状态图标、工具名、折叠的输入/输出

#### ConfirmBar

**Props**:
| 属性 | 类型 | 说明 |
|-----|------|------|
| title | string | 标题 |
| description | string | 描述 |
| onConfirm | () => void | 确认回调 |
| onCancel | () => void | 取消回调 |

**UI 要素**: 固定在底部的确认条、确认/取消按钮

### 验收标准

- [ ] 6 个 A2UI 组件均可独立渲染
- [ ] Renderer 正确分发组件
- [ ] 样式与 Pencil 原型一致
- [ ] 响应式适配 (小程序/H5)
- [ ] 组件支持受控模式

### 建议实现

1. 从 Task 2 导入类型定义
2. Renderer 使用组件映射表
3. 样式参考现有组件 (如 BottomSheet)
4. 考虑加载状态和错误边界

---

## Task 7: 前端SSE集成 [前端]

**优先级**: 🔴 P0
**预估**: 2天
**可并行**: ❌ 否
**前置依赖**: Task 5, 6

### 目标

将 SSE 流式聊天集成到前端聊天页面。

### 输出文件

| 文件 | 职责 |
|-----|------|
| `hooks/useAgentChat.ts` | SSE 聊天 Hook (新建) |
| `services/api.ts` | API 基础设施 (修改) |
| `pages/conversation-chat/index.tsx` | 聊天页 (修改) |

### Hook 接口

#### useAgentChat

**输入**: `sessionId: string`

**返回**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| messages | ChatMessage[] | 消息列表 |
| isStreaming | boolean | 是否正在流式接收 |
| currentDelta | string | 当前流式增量文本 |
| pendingUI | A2UIPayload? | 待渲染的 A2UI |
| toolTraces | ToolTrace[] | 工具执行状态列表 |
| sendMessage | (content, contactId?) => Promise | 发送消息 |

**行为**:
1. 调用 `sendMessage` 时立即添加用户消息到列表
2. 发起 SSE 请求
3. 解析事件流，更新对应状态
4. `message.final` 时将完整消息加入列表

### SSE 事件处理

| 事件 | 处理 |
|-----|------|
| message.delta | 追加到 currentDelta |
| message.final | 添加到 messages，清空 currentDelta |
| ui | 设置 pendingUI |
| tool.trace | 更新 toolTraces 中对应项 |
| error | 显示错误 Toast |

### 页面集成

修改 `conversation-chat/index.tsx`:

1. 替换现有消息发送逻辑为 `useAgentChat`
2. 渲染流式文本 (`currentDelta`)
3. 集成 `A2UIRenderer` 渲染 `pendingUI`
4. 展示 `toolTraces` 工具执行状态

### 验收标准

- [ ] 消息流式显示，无明显延迟
- [ ] 工具执行状态实时更新
- [ ] A2UI 组件正确渲染在消息流中
- [ ] 错误状态有 Toast 提示
- [ ] 页面切换/返回时正确断开连接
- [ ] 离线状态处理 (可选)

### 建议实现

1. 使用 `fetch` + `ReadableStream` 读取 SSE
2. 实现 SSE 事件解析器 (`parseSSEEvents`)
3. 使用 `useRef` 存储 reader 便于清理
4. 在 `useEffect` 清理函数中断开连接

---

## Task 8: 飞书OAuth [后端]

**优先级**: 🟡 P1 (V1必需)
**预估**: 2天
**可并行**: ✅ 是
**前置依赖**: Task 3, 4

### 目标

实现完整的飞书 OAuth 2.0 授权流程。

### 输出文件

| 文件 | 职责 |
|-----|------|
| `connectors/feishu/oauth.ts` | OAuth 流程 (新建) |
| `connectors/feishu/client.ts` | API 客户端 (新建) |
| `connectors/feishu/types.ts` | 类型定义 (新建) |
| `routes/feishu.ts` | 路由 (修改) |

### API 规范

#### 发起连接

**端点**: `POST /v1/connectors/feishu/connect`

**请求体**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| redirectUri | string | 授权后跳转地址 |

**响应**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| authUrl | string | 飞书授权页面 URL |

#### OAuth 回调

**端点**: `GET /v1/connectors/feishu/callback`

**Query 参数**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| code | string | 授权码 |
| state | string | 状态校验 |

**行为**:
1. 校验 state
2. 用 code 换取 token
3. 保存到 `connector_tokens` 表
4. 重定向到前端成功页

#### 断开连接

**端点**: `POST /v1/connectors/feishu/disconnect`

**行为**: 删除对应 workspace 的 token 记录

#### 连接状态

**端点**: `GET /v1/connectors/feishu/status`

**响应**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| connected | boolean | 是否已连接 |
| expiresAt | string? | 令牌过期时间 |
| scopes | string[]? | 授权范围 |

### Token 管理

| 功能 | 说明 |
|-----|------|
| 存储 | 加密后存入 `connector_tokens` 表 |
| 刷新 | 过期前自动刷新 (建议过期前 5 分钟) |
| 获取 | 封装为 `getFeishuClient(workspaceId)` |

### 验收标准

- [ ] 点击"连接飞书"正确跳转授权页
- [ ] 授权后正确回调并保存 token
- [ ] Token 过期自动刷新
- [ ] 断开连接功能正常
- [ ] 状态查询正确反映连接状态

### 建议实现

1. state 使用加密随机字符串，存入 Redis (TTL 10分钟)
2. Token 使用 AES 加密存储
3. 实现 token 刷新中间件
4. 参考飞书开放平台 OAuth 文档

---

## Task 9: 飞书工具集 [后端]

**优先级**: 🟡 P1 (V1必需)
**预估**: 1.5天
**可并行**: ✅ 是 (与 Task 8 并行)
**前置依赖**: Task 4

### 目标

将飞书 API 封装为 Agent 可调用的工具。

### 输出文件

| 文件 | 职责 |
|-----|------|
| `agent/tools/feishuTools.ts` | 飞书工具定义 (新建) |
| `agent/tools/index.ts` | 工具注册入口 (新建/修改) |

### 工具定义

#### feishu_list_templates (V1)

| 属性 | 值 |
|-----|---|
| 名称 | feishu_list_templates |
| 描述 | 列出可用的飞书消息模板 |
| 参数 | 无 |
| requiresAuth | true |
| requiresConfirmation | false |

**返回**: `{ templates: Array<{id, name, description}> }`

#### feishu_get_template (V1)

| 属性 | 值 |
|-----|---|
| 名称 | feishu_get_template |
| 描述 | 获取指定飞书模板详情 |
| 参数 | `{ templateId: string }` |
| requiresAuth | true |
| requiresConfirmation | false |

**返回**: `{ id, name, description, variables: Array<{name, type, required}> }`

#### feishu_create_instance (V2)

| 属性 | 值 |
|-----|---|
| 名称 | feishu_create_instance |
| 描述 | 创建飞书模板实例 |
| 参数 | `{ templateId: string, variables: Record<string, string> }` |
| requiresAuth | true |
| requiresConfirmation | **true** |

**返回**: `{ instanceId, previewUrl }`

#### feishu_send_message (V2)

| 属性 | 值 |
|-----|---|
| 名称 | feishu_send_message |
| 描述 | 发送飞书消息 |
| 参数 | `{ receiverId: string, content: string }` |
| requiresAuth | true |
| requiresConfirmation | **true** |

**返回**: `{ messageId, status }`

### 工具注册

提供 `registerFeishuTools(registry: ToolRegistry)` 函数，在 Agent 初始化时调用。

### 验收标准

- [ ] 4 个工具正确注册到 ToolRegistry
- [ ] list_templates 返回真实数据 (需 Task 8 完成)
- [ ] get_template 返回模板详情
- [ ] 写操作工具标记为 requiresConfirmation=true
- [ ] 未授权时返回 requires_auth 状态

### 建议实现

1. 复用 Task 8 的 FeishuClient
2. V1 阶段可 Mock V2 工具的返回
3. 工具 execute 函数接收 context 参数获取 workspaceId

---

## Task 10: Citations系统 [全栈]

**优先级**: 🟡 P1
**预估**: 2天
**可并行**: ✅ 是
**前置依赖**: Task 3, 4

### 目标

实现 AI 输出的来源引用追踪，让用户可验证 AI 生成内容的依据。

### 输出文件

**后端**:
| 文件 | 职责 |
|-----|------|
| `agent/orchestrator.ts` | 添加 citations 生成 (修改) |
| `repositories/chatRepo.ts` | 支持 citations 存取 (修改) |

**前端**:
| 文件 | 职责 |
|-----|------|
| `components/A2UI/CitationHighlight.tsx` | 引用高亮组件 (新建) |
| `pages/conversation-chat/index.tsx` | 集成引用渲染 (修改) |

### 后端逻辑

#### Citation 生成策略

1. **基于 Prompt**: 在 system prompt 中要求 AI 使用 `[1]`, `[2]` 等标记引用
2. **后处理提取**: 解析 AI 输出中的引用标记，映射到源消息
3. **存储**: 将 citations 存入 `chat_message.citations_json`

#### Citation 数据结构

```json
{
  "sourceMessageIds": ["msg-123", "msg-456"],
  "spans": [
    {"start": 10, "end": 15, "sourceIndex": 0},
    {"start": 50, "end": 60, "sourceIndex": 1}
  ]
}
```

### 前端组件

#### CitationHighlight

**Props**:
| 属性 | 类型 | 说明 |
|-----|------|------|
| text | string | 原始文本 |
| citations | Citation[] | 引用数据 |
| onCitationClick | (messageId: string) => void | 点击回调 |

**行为**:
1. 根据 spans 将文本分段
2. 引用部分添加高亮样式和上标编号
3. 点击引用跳转到源消息

### 验收标准

- [ ] AI 回复中的引用被正确标记
- [ ] 点击引用可定位到源消息
- [ ] citations 正确存储到数据库
- [ ] 无引用时正常显示

### 建议实现

1. 使用特殊 prompt 引导 AI 生成引用标记
2. 正则提取 `[数字]` 模式
3. 前端使用 `scrollIntoView` 实现跳转

---

## Task 11: 工具强确认流程 [全栈]

**优先级**: 🟡 P1 (V2必需)
**预估**: 2天
**可并行**: ❌ 否
**前置依赖**: Task 8, 9

### 目标

实现写操作工具的用户确认流程，确保不会误发消息。

### 输出文件

**后端**:
| 文件 | 职责 |
|-----|------|
| `agent/toolConfirmation.ts` | 确认流程管理 (新建) |
| `routes/toolRuns.ts` | 确认 API (修改) |

**前端**:
| 文件 | 职责 |
|-----|------|
| `components/A2UI/ConfirmBar.tsx` | 已在 Task 6 |
| `pages/conversation-chat/index.tsx` | 集成确认交互 (修改) |

### 流程设计

```
1. Agent 调用 requiresConfirmation=true 的工具
2. 创建 tool_confirmations 记录 (state=pending, expires_at=now+5min)
3. 发送 SSE tool.trace 事件 (state=requires_confirmation)
4. 前端显示 ConfirmBar
5a. 用户确认 → 执行工具 → 更新状态为 confirmed → 发送结果
5b. 用户取消 → 更新状态为 cancelled
5c. 超时 → 自动设为 expired
```

### API 规范

#### 确认工具执行

**端点**: `POST /v1/tool-runs/:toolCallId/confirm`

**请求体**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| confirmed | boolean | true=确认, false=取消 |

**响应**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| state | ToolState | 执行结果状态 |
| output | object? | 工具输出 (如成功) |
| error | string? | 错误信息 (如失败) |

### 前端交互

当 `toolTrace.state === 'requires_confirmation'`:
1. 在聊天区域底部显示 ConfirmBar
2. 显示工具名称和参数摘要
3. 确认按钮 → 调用确认 API (confirmed=true)
4. 取消按钮 → 调用确认 API (confirmed=false)
5. 显示执行结果/错误

### 验收标准

- [ ] 写操作工具触发确认 UI
- [ ] 用户确认后工具正确执行
- [ ] 用户取消后工具不执行
- [ ] 超时 (5分钟) 自动取消
- [ ] 确认后更新 ToolTraceCard 状态

### 建议实现

1. 使用数据库事务确保一致性
2. 后台定时任务处理过期确认
3. ConfirmBar 使用 Portal 渲染到页面底部

---

## Task 12: 测试覆盖 [全栈]

**优先级**: 🟢 P2
**预估**: 4天
**可并行**: ❌ 否 (最后执行)
**前置依赖**: 所有 Task

### 目标

达到 80% 测试覆盖率。

### 输出文件

**后端测试**:
```
packages/server/src/__tests__/
├── unit/
│   ├── agent/orchestrator.test.ts
│   ├── agent/contextBuilder.test.ts
│   ├── agent/toolRegistry.test.ts
│   └── types/a2ui.test.ts
├── integration/
│   ├── agent.test.ts
│   ├── feishu.test.ts
│   └── chat.test.ts
```

**前端测试**:
```
packages/client/src/__tests__/
├── hooks/useAgentChat.test.ts
└── components/A2UI/*.test.tsx
```

**E2E 测试**:
```
packages/e2e/
└── chat.spec.ts
```

### 测试类型要求

| 类型 | 工具 | 覆盖范围 |
|-----|------|---------|
| 单元测试 | Jest/Vitest | Agent 核心模块 |
| 集成测试 | Supertest | API 端点 |
| E2E 测试 | Playwright | 关键用户流程 |

### 重点测试场景

#### 单元测试
- [ ] ContextBuilder 三层上下文构建
- [ ] ToolRegistry 注册/查询
- [ ] 工具状态机转换
- [ ] A2UI schema 校验
- [ ] SSE 事件解析

#### 集成测试
- [ ] POST /v1/agent/chat SSE 流完整性
- [ ] 飞书工具调用 (Mock API)
- [ ] 工具确认流程
- [ ] Token 刷新

#### E2E 测试
- [ ] 完整聊天流程 (发送→流式响应→完成)
- [ ] 归档流程 (归档→确认→写入联系人)
- [ ] 飞书连接流程 (连接→授权→状态)

### 验收标准

- [ ] 总体覆盖率 >= 80%
- [ ] Agent 模块覆盖率 >= 90%
- [ ] CI 集成测试通过
- [ ] E2E 关键流程全覆盖
- [ ] 测试报告可视化

### 建议实现

1. 配置 Jest/Vitest + Coverage
2. 飞书 API 使用 MSW Mock
3. SSE 测试使用 mock-sse-server
4. E2E 使用 Playwright + 测试数据隔离

---

# Part 3: 任务分配建议

## 按角色分配

### 后端开发者 A (核心Agent)
| Task | 内容 | 预估 |
|------|------|------|
| Task 1 | Router修复 | 0.5天 |
| Task 2 | 类型定义 | 1天 |
| Task 4 | Agent核心编排 | 3天 |
| Task 5 | SSE流式API | 1.5天 |
| **总计** | | **6天** |

### 后端开发者 B (连接器)
| Task | 内容 | 预估 |
|------|------|------|
| Task 3 | 数据库迁移 | 0.5天 |
| Task 8 | 飞书OAuth | 2天 |
| Task 9 | 飞书工具集 | 1.5天 |
| Task 11 | 工具强确认 (后端) | 1天 |
| **总计** | | **5天** |

### 前端开发者 C
| Task | 内容 | 预估 |
|------|------|------|
| Task 6 | A2UI组件 | 2.5天 |
| Task 7 | 前端SSE集成 | 2天 |
| Task 10 | Citations (前端) | 1天 |
| Task 11 | 工具强确认 (前端) | 1天 |
| **总计** | | **6.5天** |

### 全栈/QA
| Task | 内容 | 预估 |
|------|------|------|
| Task 10 | Citations (后端) | 1天 |
| Task 12 | 测试覆盖 | 4天 |
| **总计** | | **5天** |

## 关键里程碑

| 里程碑 | 完成标志 | 预计 |
|--------|---------|------|
| **M1: 基础可用** | Task 1-5 完成，SSE聊天工作 | Day 6 |
| **M2: V0 MVP** | Task 6-7 完成，前端集成 | Day 8 |
| **M3: V1 飞书只读** | Task 8-9 完成 | Day 10 |
| **M4: V2 飞书写操作** | Task 10-11 完成 | Day 14 |
| **M5: 生产就绪** | Task 12 完成，测试通过 | Day 18 |

---

# 附录: 文件清单

## 新建文件 (25个)

### 后端 (16个)
```
packages/server/src/agent/
├── index.ts
├── types.ts
├── orchestrator.ts
├── contextBuilder.ts
├── toolRegistry.ts
├── policies.ts
├── toolConfirmation.ts
└── tools/
    ├── index.ts
    └── feishuTools.ts

packages/server/src/types/
├── a2ui.ts
└── tooltrace.ts

packages/server/src/presentation/http/routes/
└── agent.ts

packages/server/src/infrastructure/connectors/feishu/
├── oauth.ts
├── client.ts
└── types.ts

packages/server/src/infrastructure/db/migrations/
├── 006_citations.sql
├── 007_tool_confirmations.sql
└── 008_connector_tokens.sql
```

### 前端 (10个)
```
packages/client/src/hooks/
└── useAgentChat.ts

packages/client/src/components/A2UI/
├── index.ts
├── Renderer.tsx
├── ArchiveReviewCard.tsx
├── TemplatePicker.tsx
├── VariableForm.tsx
├── DraftPreview.tsx
├── ConfirmBar.tsx
├── ToolTraceCard.tsx
├── CitationHighlight.tsx
└── styles.scss
```

## 修改文件 (6个)
```
packages/server/src/presentation/http/router.ts
packages/server/src/presentation/http/routes/feishu.ts
packages/server/src/presentation/http/routes/toolRuns.ts
packages/server/src/infrastructure/repositories/chatRepo.ts
packages/client/src/services/api.ts
packages/client/src/pages/conversation-chat/index.tsx
```
