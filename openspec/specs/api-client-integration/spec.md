# API Client Integration Spec

## Intent
将后端 Swagger 文档中的所有接口与前端的各个实体（Contact, Conversation, Event, Message, Brief, Archive, ToolConfirmation）的增删改查操作完整对接，确保类型安全和接口一致性。

## Scope
- 前端 API client (`packages/web/src/lib/api/client.ts`) 实现所有后端接口的调用
- 前端类型定义 (`packages/web/src/lib/api/types.ts`) 与后端 DTO/Entity 完全匹配
- 覆盖所有实体的 CRUD 操作：
  - Contacts: create, list, get, update, delete, getContext
  - Conversations: create, list, get, getMessages
  - Events: create, findByContact
  - Briefings: getBriefing, refreshBriefing
  - Conversation Archives: createArchive, applyArchive, discardArchive
  - Tool Confirmations: create, findAll, findOne, confirm, reject
  - Auth: register, login, refresh, logout

## Non-Goals
- 不修改后端接口定义
- 不实现业务逻辑，只做接口封装
- 不处理流式接口（agent/chat SSE），已有单独实现

## Requirements

### API-CLIENT-001: Contacts CRUD
**Given** 前端需要管理联系人数据  
**When** 调用 contacts API  
**Then** 应该支持：
- `POST /v1/contacts` - 创建联系人
- `GET /v1/contacts` - 获取联系人列表（支持分页）
- `GET /v1/contacts/:id` - 获取单个联系人
- `PATCH /v1/contacts/:id` - 更新联系人
- `DELETE /v1/contacts/:id` - 删除联系人
- `GET /v1/contacts/:id/context` - 获取联系人上下文

### API-CLIENT-002: Conversations CRUD
**Given** 前端需要管理会话数据  
**When** 调用 conversations API  
**Then** 应该支持：
- `POST /v1/conversations` - 创建会话
- `GET /v1/conversations` - 获取会话列表
- `GET /v1/conversations/:id` - 获取单个会话
- `GET /v1/conversations/:id/messages` - 获取会话消息列表

### API-CLIENT-003: Events Management
**Given** 前端需要管理事件数据  
**When** 调用 events API  
**Then** 应该支持：
- `POST /v1/events` - 创建事件
- `GET /v1/events/contact/:contactId` - 根据联系人获取事件列表

### API-CLIENT-004: Briefings Management
**Given** 前端需要获取联系人简报  
**When** 调用 briefings API  
**Then** 应该支持：
- `GET /v1/contacts/:contactId/brief` - 获取联系人简报
- `POST /v1/contacts/:contactId/brief` - 刷新联系人简报
- `POST /v1/contacts/:contactId/brief/refresh` - 显式刷新联系人简报

### API-CLIENT-005: Conversation Archives
**Given** 前端需要管理会话归档  
**When** 调用 conversation-archives API  
**Then** 应该支持：
- `POST /v1/conversations/:conversationId/archive` - 创建归档
- `POST /v1/conversation-archives/:archiveId/apply` - 应用归档
- `POST /v1/conversation-archives/:archiveId/discard` - 丢弃归档

### API-CLIENT-006: Tool Confirmations
**Given** 前端需要管理工具确认  
**When** 调用 tool-confirmations API  
**Then** 应该支持：
- `POST /v1/tool-confirmations` - 创建工具确认
- `GET /v1/tool-confirmations` - 获取工具确认列表（支持筛选）
- `GET /v1/tool-confirmations/:id` - 获取单个工具确认
- `POST /v1/tool-confirmations/:id/confirm` - 确认工具执行
- `POST /v1/tool-confirmations/:id/reject` - 拒绝工具执行

### API-CLIENT-007: Authentication
**Given** 前端需要用户认证  
**When** 调用 auth API  
**Then** 应该支持：
- `POST /v1/auth/register` - 注册用户
- `POST /v1/auth/login` - 用户登录
- `POST /v1/auth/refresh` - 刷新 token
- `POST /v1/auth/logout` - 用户登出

### API-CLIENT-008: Type Safety
**Given** 前端需要类型安全  
**When** 使用 API client  
**Then** 所有请求和响应类型应该与后端 DTO/Entity 匹配，包括：
- Contact 类型与后端 Contact entity 匹配
- Conversation 类型与后端 Conversation entity 匹配
- Event 类型与后端 Event entity 匹配
- Message 类型与后端 Message entity 匹配
- 所有 DTO 类型与后端 DTO 匹配

## Acceptance
1. 所有 API 方法在 `packages/web/src/lib/api/client.ts` 中实现
2. 所有类型定义在 `packages/web/src/lib/api/types.ts` 中定义
3. TypeScript 编译无错误
4. 所有接口路径、方法、参数与后端 Swagger 文档一致
5. 认证 token 自动添加到请求头（Bearer token）








