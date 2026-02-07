# Feature: 前端 API 客户端集成

## Summary

完善前端 API 客户端，实现与后端 NestJS API 的完整对接，包括所有实体的 CRUD 操作、类型定义和认证管理。

## Motivation

- 当前前端 API 客户端不完整，缺少部分实体的 CRUD 操作
- 类型定义与后端 DTO/Entity 不匹配，导致类型安全问题
- 需要统一的 API 调用接口，便于前端组件使用
- 需要自动化的 token 管理和错误处理

## Proposed Solution

### 1. 类型定义完善

在 `packages/web/src/lib/api/types.ts` 中定义所有实体类型：

- **Auth**: `RegisterRequest`, `LoginRequest`, `RefreshRequest`, `LogoutRequest`, `AuthResponse`
- **Contact**: `Contact`, `CreateContactRequest`, `UpdateContactRequest`, `ContactListResponse`, `ContactContext`
- **Conversation**: `Conversation`, `CreateConversationRequest`, `Message`, `GetMessagesRequest`
- **Event**: `Event`, `CreateEventRequest`
- **Briefing**: `BriefSnapshot`
- **Conversation Archive**: `ConversationArchiveResponse`, `ArchivePayload`, `ArchiveContact`, `ArchiveEvent`, `ArchiveFact`, `ArchiveTodo`
- **Tool Confirmation**: `ToolConfirmation`, `CreateToolConfirmationRequest`, `ConfirmToolRequest`, `RejectToolRequest`

### 2. API 客户端实现

在 `packages/web/src/lib/api/client.ts` 中实现所有 API 方法：

#### Auth API
- `register()` - 用户注册
- `login()` - 用户登录
- `refresh()` - 刷新 token
- `logout()` - 用户登出

#### Contacts API
- `create()` - 创建联系人
- `list()` - 获取联系人列表（支持分页）
- `get()` - 获取单个联系人
- `update()` - 更新联系人
- `delete()` - 删除联系人
- `getContext()` - 获取联系人上下文

#### Conversations API
- `create()` - 创建会话
- `list()` - 获取会话列表
- `get()` - 获取单个会话
- `getMessages()` - 获取会话消息列表

#### Events API
- `create()` - 创建事件
- `findByContact()` - 根据联系人获取事件列表

#### Briefings API
- `getBriefing()` - 获取联系人简报
- `refreshBriefing()` - 刷新联系人简报
- `refreshBriefingExplicit()` - 显式刷新联系人简报

#### Conversation Archives API
- `createArchive()` - 创建归档
- `applyArchive()` - 应用归档
- `discardArchive()` - 丢弃归档

#### Tool Confirmations API
- `create()` - 创建工具确认
- `list()` - 获取工具确认列表（支持筛选）
- `get()` - 获取单个工具确认
- `confirm()` - 确认工具执行
- `reject()` - 拒绝工具执行

### 3. 功能特性

- **自动 Token 管理**: 登录/注册后自动保存 token，登出时清除
- **统一错误处理**: `handleResponse` 统一处理 API 响应错误
- **类型安全**: 所有接口都有完整的 TypeScript 类型定义
- **与后端一致**: 接口路径、方法、参数与后端 Swagger 文档完全一致

## Alternatives Considered

1. **使用 tRPC** - 需要后端改造，成本高
2. **使用 GraphQL** - 需要后端改造，过度设计
3. **手动 fetch** - 缺少类型安全和统一管理

## Dependencies

- 依赖后端 NestJS API 完成
- 依赖后端 Swagger 文档准确

## Impact

- [x] Breaking changes - 更新了类型定义，可能影响现有代码
- [ ] Database migrations
- [ ] API changes

## Files to Modify/Create

| 操作 | 文件路径 |
|------|----------|
| 修改 | `packages/web/src/lib/api/types.ts` |
| 修改 | `packages/web/src/lib/api/client.ts` |
| 新建 | `openspec/specs/api-client-integration/spec.md` |

## Acceptance Criteria

1. 所有实体类型定义完整，与后端 DTO/Entity 匹配
2. 所有 API 方法实现完整，路径和方法与后端一致
3. Token 自动管理，登录后自动添加到请求头
4. 错误处理统一，所有错误都有明确的错误信息
5. TypeScript 编译无错误
6. 所有接口都有完整的类型定义，支持类型检查



