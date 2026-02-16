# Tasks for 前端 API 客户端集成

## 1. 准备工作

- [x] **1.1** 分析后端 API 结构
  - 查看后端 Swagger 文档
  - 确认所有控制器和 DTO
  - 确认认证方式（JWT）

- [x] **1.2** 分析现有前端 API 客户端
  - 文件：`packages/web/src/lib/api/client.ts`
  - 文件：`packages/web/src/lib/api/types.ts`
  - 确认已有实现和缺失部分

## 2. 类型定义完善

- [x] **2.1** 定义 Auth 相关类型
  - `RegisterRequest`, `LoginRequest`, `RefreshRequest`, `LogoutRequest`
  - `AuthResponse`

- [x] **2.2** 定义 Contact 相关类型
  - `Contact`, `CreateContactRequest`, `UpdateContactRequest`
  - `ContactListResponse`, `ContactContext`

- [x] **2.3** 定义 Conversation 相关类型
  - `Conversation`, `CreateConversationRequest`
  - `Message`, `GetMessagesRequest`

- [x] **2.4** 定义 Event 相关类型
  - `Event`, `CreateEventRequest`

- [x] **2.5** 定义 Briefing 相关类型
  - `BriefSnapshot`

- [x] **2.6** 定义 Conversation Archive 相关类型
  - `ConversationArchiveResponse`
  - `ArchivePayload`, `ArchiveContact`, `ArchiveEvent`, `ArchiveFact`, `ArchiveTodo`
  - `Citation`

- [x] **2.7** 定义 Tool Confirmation 相关类型
  - `ToolConfirmation`
  - `CreateToolConfirmationRequest`, `ConfirmToolRequest`, `RejectToolRequest`

## 3. API 客户端实现 - Auth

- [x] **3.1** 实现 register 方法
  ```typescript
  async register(data: RegisterRequest): Promise<AuthResponse>
  ```

- [x] **3.2** 实现 login 方法
  ```typescript
  async login(data: LoginRequest): Promise<AuthResponse>
  ```
  - 登录成功后自动保存 token

- [x] **3.3** 实现 refresh 方法
  ```typescript
  async refresh(data: RefreshRequest): Promise<AuthResponse>
  ```

- [x] **3.4** 实现 logout 方法
  ```typescript
  async logout(data: LogoutRequest): Promise<void>
  ```
  - 登出时清除 token

## 4. API 客户端实现 - Contacts

- [x] **4.1** 实现 create 方法
  ```typescript
  async create(data: CreateContactRequest): Promise<Contact>
  ```

- [x] **4.2** 实现 list 方法
  ```typescript
  async list(params?: { page?: number; limit?: number }): Promise<ContactListResponse>
  ```

- [x] **4.3** 实现 get 方法
  ```typescript
  async get(id: string): Promise<Contact>
  ```

- [x] **4.4** 实现 update 方法
  ```typescript
  async update(id: string, data: UpdateContactRequest): Promise<Contact>
  ```

- [x] **4.5** 实现 delete 方法
  ```typescript
  async delete(id: string): Promise<void>
  ```

- [x] **4.6** 实现 getContext 方法
  ```typescript
  async getContext(id: string): Promise<ContactContext>
  ```

## 5. API 客户端实现 - Conversations

- [x] **5.1** 实现 create 方法
  ```typescript
  async create(data: CreateConversationRequest): Promise<Conversation>
  ```

- [x] **5.2** 实现 list 方法
  ```typescript
  async list(): Promise<Conversation[]>
  ```

- [x] **5.3** 实现 get 方法
  ```typescript
  async get(id: string): Promise<Conversation>
  ```

- [x] **5.4** 实现 getMessages 方法
  ```typescript
  async getMessages(id: string, params?: GetMessagesRequest): Promise<Message[]>
  ```

## 6. API 客户端实现 - Events

- [x] **6.1** 实现 create 方法
  ```typescript
  async create(data: CreateEventRequest): Promise<Event>
  ```

- [x] **6.2** 实现 findByContact 方法
  ```typescript
  async findByContact(contactId: string): Promise<Event[]>
  ```

## 7. API 客户端实现 - Briefings

- [x] **7.1** 实现 getBriefing 方法
  ```typescript
  async getBriefing(contactId: string): Promise<BriefSnapshot>
  ```

- [x] **7.2** 实现 refreshBriefing 方法
  ```typescript
  async refreshBriefing(contactId: string): Promise<BriefSnapshot>
  ```

- [x] **7.3** 实现 refreshBriefingExplicit 方法
  ```typescript
  async refreshBriefingExplicit(contactId: string): Promise<BriefSnapshot>
  ```

## 8. API 客户端实现 - Conversation Archives

- [x] **8.1** 实现 createArchive 方法
  ```typescript
  async createArchive(conversationId: string): Promise<ConversationArchiveResponse>
  ```

- [x] **8.2** 实现 applyArchive 方法
  ```typescript
  async applyArchive(archiveId: string): Promise<ConversationArchiveResponse>
  ```

- [x] **8.3** 实现 discardArchive 方法
  ```typescript
  async discardArchive(archiveId: string): Promise<ConversationArchiveResponse>
  ```

## 9. API 客户端实现 - Tool Confirmations

- [x] **9.1** 实现 create 方法
  ```typescript
  async create(data: CreateToolConfirmationRequest): Promise<ToolConfirmation>
  ```

- [x] **9.2** 实现 list 方法
  ```typescript
  async list(params?: { status?: string; userId?: string; conversationId?: string }): Promise<ToolConfirmation[]>
  ```

- [x] **9.3** 实现 get 方法
  ```typescript
  async get(id: string): Promise<ToolConfirmation>
  ```

- [x] **9.4** 实现 confirm 方法
  ```typescript
  async confirm(id: string, data?: ConfirmToolRequest): Promise<ToolConfirmation>
  ```

- [x] **9.5** 实现 reject 方法
  ```typescript
  async reject(id: string, data?: RejectToolRequest): Promise<ToolConfirmation>
  ```

## 10. Token 管理

- [x] **10.1** 实现 token 存储
  - 使用 localStorage 存储 token
  - 登录/注册后自动保存

- [x] **10.2** 实现 token 读取
  - `fetchWithAuth` 自动从 localStorage 读取 token
  - 自动添加到请求头 `Authorization: Bearer <token>`

- [x] **10.3** 实现 token 清除
  - 登出时清除 token
  - 401 错误时清除 token

## 11. 错误处理

- [x] **11.1** 实现统一错误处理
  - `handleResponse` 函数统一处理响应
  - 解析错误信息并抛出异常

- [x] **11.2** 处理 HTTP 状态码
  - 401: 清除 token，可能需要重新登录
  - 404: 资源不存在
  - 500: 服务器错误

## 12. 类型验证

- [x] **12.1** 验证所有类型定义
  - 与后端 DTO/Entity 对比
  - 确认字段名称和类型匹配

- [x] **12.2** 验证 API 路径
  - 与后端控制器路径对比
  - 确认 HTTP 方法正确

- [x] **12.3** TypeScript 编译检查
  - 运行 `npm run type-check`
  - 修复所有类型错误

## 13. 文档

- [x] **13.1** 创建 OpenSpec 规范文档
  - 文件：`openspec/specs/api-client-integration/spec.md`
  - 定义 API 对接规范

- [x] **13.2** 创建实现需求文档
  - 文件：`openspec/changes/frontend-api-client-integration/proposal.md`
  - 文件：`openspec/changes/frontend-api-client-integration/tasks.md`

## 14. 验收

- [x] **14.1** 类型定义完整性
  - 所有实体都有类型定义
  - 所有请求/响应都有类型

- [x] **14.2** API 方法完整性
  - 所有后端接口都有对应的方法
  - 所有方法都有正确的类型签名

- [x] **14.3** Token 管理
  - 登录后 token 自动保存
  - 请求时 token 自动添加
  - 登出时 token 自动清除

- [x] **14.4** 错误处理
  - 所有错误都有明确的错误信息
  - 401 错误时自动清除 token

- [x] **14.5** TypeScript 编译
  - 无类型错误
  - 无编译错误



