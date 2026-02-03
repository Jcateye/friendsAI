# FriendsAI Feature Fix Plan

## TL;DR

> **快速总结**: 本计划旨在解决当前 FriendsAI 应用中“功能已实现但页面不可用”的问题。主要通过补齐前端交互逻辑、完善缺失的后端 API 接口、并统一前后端数据模型来打通核心功能。
>
> **可交付成果**:
> - 完整的前端联系人新增/编辑表单及其后端 CRUD 接口。
> - 行动面板中快捷操作按钮的实际业务逻辑（如跳转到相关页面）。
> - 用户设置页中“通知”、“深色模式”、“自动同步”、“导出数据”、“清除缓存”功能的后端 API 支持及前端交互。
> - 完整的前后端连接器模块，支持连接/断开第三方服务。
> - 待办事项在详情页的可交互状态切换及在联系人详情页的展示。
>
> **预估工作量**: **中等** - 涉及大量前端交互细化、多个后端 API 的新增与修改，以及部分数据模型调整。
> **并行执行**: **是** - 前端与后端相关任务可并行展开。
> **关键路径**: 联系人管理 (P0) -> 用户设置 (P1) -> 连接器 (P1)。

---

## Context

### 原始需求
用户反馈，FriendsAI 项目中许多开发任务被标记为“完成”，但实际页面功能（除了发送消息和归档状态）仍然缺失，希望通过代码审查找出原因。

### 面谈总结
详细代码审计揭示了以下主要问题：
1.  **前端占位交互**：许多按钮（如行动页快捷操作、联系人新增/编辑、开始对话、设置页导出/清除）仅显示 Toast 提示，未实际触发业务逻辑或跳转。
2.  **后端接口缺失**：`connectorApi` 在前端已定义，但后端缺乏对应的 `connectors` 模块；用户设置相关的 `notificationsEnabled`, `darkModeEnabled`, `autoSyncEnabled` 等功能的后端 API 缺失（`users.controller.ts` 中有明确 TODO）。
3.  **数据模型不一致**：前端 `TodoItem` 类型包含 `completed` 字段，但后端 `Briefing.pendingTodos` 存储为 `string[]`，导致任务完成状态无法持久化和交互。
4.  **UI 未完全利用后端功能**：例如联系人详情页未展示待办列表，会前简报未提供刷新机制。

### 研究发现
-   **前端关键文件**：
    -   `/packages/client/src/pages/action/index.tsx`：快捷操作逻辑待实现。
    -   `/packages/client/src/pages/contacts/index.tsx`：联系人新增/导入交互待实现。
    -   `/packages/client/src/pages/contact-detail/index.tsx`：编辑/开始对话交互待实现，待办列表未展示。
    -   `/packages/client/src/pages/settings/index.tsx`：用户偏好设置、数据管理交互待实现。
    -   `/packages/client/src/pages/connector/index.tsx`：连接器列表使用本地 mock 数据。
    -   `/packages/client/src/services/api.ts`：前端 API 接口定义。
-   **后端关键文件**：
    -   `/packages/server-nestjs/src/users/users.controller.ts` & `users.service.ts`：用户设置 API 待实现。
    -   `/packages/server-nestjs/src/contacts/contacts.controller.ts` & `contacts.service.ts`：联系人 CRUD 接口需完善。
    -   `/packages/server-nestjs/src/entities/briefing.entity.ts`：待办数据结构需修改。

---

## Work Objectives

### 核心目标
全面打通 FriendsAI 应用中当前假性功能，通过完善前后端交互和 API 实现，使用户能真实操作并管理联系人、快捷行动、个性化设置和第三方连接器。

### 具体可交付物
-   **联系人管理**：
    -   前端联系人新增/编辑表单页面。
    -   后端联系人创建 (`POST /contacts`) 和更新 (`PATCH /contacts/:id`) API。
-   **行动面板**：
    -   “快速笔记”按钮跳转至对话页。
    -   “发送消息”按钮跳转至消息发送页。
    -   “安排会议”、“设置提醒”按钮至少有初步的交互逻辑。
-   **用户设置**：
    -   后端 `/users/profile` 接口支持更新 `notificationsEnabled`, `darkModeEnabled`, `autoSyncEnabled`。
    -   前端设置页的开关与后端 API 联动。
    -   后端“导出数据” (`POST /users/export`) 和“清除缓存” (`DELETE /users/clear`) API。
    -   前端设置页“导出数据”和“清除缓存”按钮功能。
-   **连接器**：
    -   后端 `connectors` 模块，包含 `getList`, `connect`, `disconnect`, `test` API。
    -   前端连接器列表显示后端数据，并能触发连接/断开操作。
-   **待办事项**：
    -   后端 `Briefing` 实体中 `pendingTodos` 字段的数据结构调整为可追踪完成状态。
    -   前端对话详情页的待办列表可交互（勾选/取消勾选）。
    -   前端联系人详情页展示其关联的待办事项。

### 完成定义
-   所有 P0、P1、P2 任务均已完成。
-   所有新增/修改的后端 API 均能正常响应，符合预期数据结构。
-   所有新增/修改的前端交互均能正确触发后端 API 调用，并更新 UI 状态。
-   用户能够完整执行新增联系人、编辑联系人、在行动面板触发快捷操作、修改个人设置、连接/断开连接器、以及在对话详情中标记待办完成等操作。

---

## Verification Strategy (Manual)

> **注意**: 鉴于项目 README 中未提供前端自动化测试配置，且后端测试仅覆盖部分单元/E2E，当前阶段以手动验证为主。每个任务的验收标准将提供明确的手动操作步骤和预期结果。

### 核心原则
-   **API 验证**: 使用 Postman, Insomnia 或 `curl` 命令验证后端新 API 的功能和响应。
-   **前端 UI 验证**: 在浏览器模拟器或真机（如微信开发者工具）中操作，检查 UI 状态、页面跳转、数据展示是否正确。
-   **数据持久化验证**: 必要时检查数据库，确认数据变更。

---

## Execution Strategy

### 并行执行波次

```
Wave 1 (启动后端核心API):
├── Task 1: Backend: Add Create/Update Contact API (P0)
└── Task 6: Backend: Implement User Settings API (P1)

Wave 2 (启动前端核心UI，依赖Wave 1):
├── Task 2: Frontend: Implement Create/Edit Contact Form (P0)
├── Task 7: Frontend: Integrate User Settings API (P1)
├── Task 3: Frontend: Wire "Start Conversation" in Contact Detail (P0)
└── Task 4: Frontend: Wire "快速笔记" (Quick Note) (P0)

Wave 3 (后端 Connector 模块 & 剩余后端API):
├── Task 5: Frontend: Wire "发送消息" (Send Message) (P0)
├── Task 8: Backend: Implement Export Data API (P1)
├── Task 9: Backend: Implement Clear Data API (P1)
└── Task 11: Backend: Create Connector Module (Skeleton) (P1)

Wave 4 (前端 Connector 模块 & 剩余前端UI):
├── Task 10: Frontend: Wire "导出数据" and "清除缓存" (P1)
└── Task 12: Frontend: Integrate Connector List (P1)

Wave 5 (数据模型统一 & 待办交互):
├── Task 13: Backend: Update Briefing Entity for Todos (P2)
├── Task 14: Backend: Update Conversation Processor Service (P2)
├── Task 15: Backend: Update Briefings Service (P2)
├── Task 16: Frontend: Update TodoItem Type (P2)
├── Task 17: Frontend: Implement Todo Item Interaction in Conversation Detail (P2)
└── Task 18: Frontend: Display Pending Todos in Contact Detail (P2)

Critical Path: 1 -> 2 -> (11 -> 12) -> (13 -> 17)
```

### 依赖矩阵

| 任务 | 依赖 | 阻塞 | 可并行任务 |
|------|------|------|-------------|
| 1 | None | 2, 3 | 6 |
| 2 | 1 | None | 7, 3, 4 |
| 3 | 1 | None | 2, 7, 4 |
| 4 | None | None | 2, 3, 7 |
| 5 | 11 | None | 8, 9, 10 |
| 6 | None | 7 | 1 |
| 7 | 6 | None | 2, 3, 4 |
| 8 | None | 10 | 5, 9, 11 |
| 9 | None | 10 | 5, 8, 11 |
| 10 | 8, 9 | None | 5, 12 |
| 11 | None | 5, 12 | 8, 9 |
| 12 | 11 | None | 5, 10 |
| 13 | None | 14, 15, 16 | None |
| 14 | 13 | None | 15, 16 |
| 15 | 13 | None | 14, 16 |
| 16 | 13 | 17, 18 | 14, 15 |
| 17 | 16 | None | 18 |
| 18 | 16 | None | 17 |

---

## TODOs

### P0：核心“假按钮”功能补齐

- [ ] 1. **Backend: Implement Create/Update Contact API**
  **做什么**:
  - 在 `packages/server-nestjs/src/contacts/contacts.controller.ts` 中增加 `POST /contacts` 用于创建联系人。
  - 在 `packages/server-nestjs/src/contacts/contacts.controller.ts` 中增加 `PATCH /contacts/:id` 用于更新联系人。
  - 在 `packages/server-nestjs/src/contacts/contacts.service.ts` 中实现 `create` 和 `update` 方法的逻辑。
  **建议 Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及控制器、服务和 DTO 的修改，需要理解 NestJS 的 DI 机制和 TypeORM 操作。
  - **Skills**: [`lsp_goto_definition`, `ast_grep_search`]
    - `lsp_goto_definition`: 快速定位实体和 DTO 定义。
    - `ast_grep_search`: 检查现有 CRUD 模式。
  **并行化**:
  - **可并行**: YES (与 Task 6 并行)
  - **并行组**: Wave 1
  - **阻塞**: Task 2, Task 3
  - **被阻塞**: None
  **References**:
  - `packages/server-nestjs/src/contacts/contacts.controller.ts` - 现有联系人控制器。
  - `packages/server-nestjs/src/contacts/contacts.service.ts` - 现有联系人服务。
  - `packages/server-nestjs/src/contacts/dtos/contact.dto.ts` - `CreateContactDto` 和 `UpdateContactDto`。
  - `packages/server-nestjs/src/entities/contact.entity.ts` - 联系人实体定义。
  **验收标准**:
  - [ ] `POST /contacts` 成功创建联系人，并返回新联系人数据（ID, name, initial 等）。
  - [ ] `PATCH /contacts/:id` 成功更新指定联系人信息，并返回更新后的数据。
  - [ ] 尝试创建联系人时提供无效数据（如空 name）时，API 接口返回 400 错误。

- [ ] 2. **Frontend: Implement Create/Edit Contact Form**
  **做什么**:
  - 创建一个新页面 (`pages/contact-form/index.tsx`) 或弹窗组件，用于联系人的创建和编辑。
  - 该表单应包含姓名、邮箱、电话、公司、职位、标签等字段。
  - 在 `/pages/contacts/index.tsx` 中，将“新增联系人”按钮和空状态下的新增按钮逻辑修改为跳转到联系人表单页面。
  - 在 `/pages/contact-detail/index.tsx` 中，将“编辑联系人”按钮逻辑修改为跳转到联系人表单页面，并传入当前联系人 ID。
  - 表单提交时，调用 `contactApi.create` 或 `contactApi.update`。
  **建议 Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 涉及前端 UI 页面设计和交互逻辑。
  - **Skills**: [`frontend-ui-ux`, `playwright`]
    - `frontend-ui-ux`: 确保表单的用户体验和样式一致性。
    - `playwright`: 可用于捕获表单交互截图进行验证。
  **并行化**:
  - **可并行**: YES (与 Task 7, Task 3, Task 4 并行)
  - **并行组**: Wave 2
  - **阻塞**: None
  - **被阻塞**: Task 1
  **References**:
  - `packages/client/src/pages/contacts/index.tsx` - 联系人列表页。
  - `packages/client/src/pages/contact-detail/index.tsx` - 联系人详情页。
  - `packages/client/src/services/api.ts` - `contactApi` 定义。
  - `packages/client/src/types/index.ts` - 联系人相关类型定义。
  **验收标准**:
  - [ ] 在联系人列表页点击“新增联系人”按钮，成功跳转到联系人创建表单页。
  - [ ] 在联系人详情页点击“编辑联系人”按钮，成功跳转到联系人编辑表单页，并预填充当前联系人数据。
  - [ ] 填写表单并提交，成功创建/更新联系人，并能返回联系人列表或详情页，显示更新后的数据。

- [ ] 3. **Frontend: Wire "Start Conversation" in Contact Detail**
  **做什么**:
  - 在 `/pages/contact-detail/index.tsx` 中，将“开始对话”按钮的 `handleStartConversation` 逻辑修改为跳转到 `/pages/conversation/index` 页面。
  - 如果可能，应尝试在跳转时将当前联系人信息带入对话页，以便后续对话能关联到该联系人。
  **建议 Agent Profile**:
  - **Category**: `quick`
    - Reason: 仅涉及页面跳转逻辑的修改。
  - **Skills**: None
  **并行化**:
  - **可并行**: YES (与 Task 2, Task 7, Task 4 并行)
  - **并行组**: Wave 2
  - **阻塞**: None
  - **被阻塞**: Task 1
  **References**:
  - `packages/client/src/pages/contact-detail/index.tsx` - 联系人详情页。
  - `packages/client/src/pages/conversation/index.tsx` - 对话列表页。
  **验收标准**:
  - [ ] 在联系人详情页点击“开始对话”按钮，成功跳转到对话列表页。
  - [ ] (可选) 对话页输入框可显示与该联系人相关的提示信息。

- [ ] 4. **Frontend: Wire "快速笔记" (Quick Note)**
  **做什么**:
  - 在 `/packages/client/src/pages/action/index.tsx` 中，将“快速笔记”的 `handleActionClick` 逻辑修改为跳转到 `/pages/conversation/index` 页面。
  - 可考虑在跳转时预填一个提示文本，引导用户开始记录笔记。
  **建议 Agent Profile**:
  - **Category**: `quick`
    - Reason: 仅涉及页面跳转逻辑。
  - **Skills**: None
  **并行化**:
  - **可并行**: YES (与 Task 2, Task 7, Task 3 并行)
  - **并行组**: Wave 2
  - **阻塞**: None
  - **被阻塞**: None
  **References**:
  - `packages/client/src/pages/action/index.tsx` - 行动面板页。
  - `packages/client/src/pages/conversation/index.tsx` - 对话列表页。
  **验收标准**:
  - [ ] 在行动面板点击“快速笔记”，成功跳转到对话列表页。

- [ ] 5. **Frontend: Wire "发送消息" (Send Message)**
  **做什么**:
  - 在 `/packages/client/src/pages/action/index.tsx` 中，将“发送消息”的 `handleActionClick` 逻辑修改为跳转到一个新的消息发送页面。
  - 该页面应允许用户选择联系人、选择消息模板（需连接器提供），并输入消息内容，最终调用 `connectorApi.sendMessage`。
  **建议 Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 涉及新页面设计和复杂交互。
  - **Skills**: [`frontend-ui-ux`, `playwright`]
  **并行化**:
  - **可并行**: YES (与 Task 8, Task 9, Task 10 并行)
  - **并行组**: Wave 3
  - **阻塞**: None
  - **被阻塞**: Task 11 (依赖连接器功能)
  **References**:
  - `packages/client/src/pages/action/index.tsx` - 行动面板页。
  - `packages/client/src/services/api.ts` - `connectorApi.sendMessage`。
  **验收标准**:
  - [ ] 在行动面板点击“发送消息”，成功跳转到消息发送页面。
  - [ ] 消息发送页面能展示联系人选择器和消息模板选择器。

### P1：API 缺失及用户设置

- [ ] 6. **Backend: Implement User Settings API**
  **做什么**:
  - 在 `packages/server-nestjs/src/users/users.controller.ts` 中，完善 `PATCH /users/profile` 接口，使其能够更新 `notificationsEnabled`, `darkModeEnabled`, `autoSyncEnabled` 等字段。
  - 在 `packages/server-nestjs/src/users/users.service.ts` 中，更新 `updateProfile` 方法，处理这些字段的持久化。
  - 确保 `packages/server-nestjs/src/entities/user.entity.ts` 中的 `User` 实体包含这些字段。
  **建议 Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及后端接口逻辑和数据库实体修改。
  - **Skills**: [`lsp_goto_definition`, `ast_grep_search`]
  **并行化**:
  - **可并行**: YES (与 Task 1 并行)
  - **并行组**: Wave 1
  - **阻塞**: Task 7
  - **被阻塞**: None
  **References**:
  - `packages/server-nestjs/src/users/users.controller.ts` - 用户控制器 (TODO 所在)。
  - `packages/server-nestjs/src/users/users.service.ts` - 用户服务。
  - `packages/server-nestjs/src/entities/user.entity.ts` - 用户实体。
  - `packages/client/src/types/user.dto.ts` - 前端 `UserProfileDto` 和 `UpdateUserProfileDto`。
  **验收标准**:
  - [ ] 调用 `PATCH /users/profile` 接口，传入 `notificationsEnabled`, `darkModeEnabled`, `autoSyncEnabled` 等字段，确认数据库中用户记录更新。
  - [ ] 再次调用 `GET /users/profile` 接口，确认返回的配置文件中这些字段已更新。

- [ ] 7. **Frontend: Integrate User Settings API**
  **做什么**:
  - 在 `/packages/client/src/pages/settings/index.tsx` 中，将“通知”、“深色模式”、“自动同步”的 `Switch` 组件连接到 `userApi.updateSettings`。
  - 确保开关状态能正确反映用户配置文件中的值。
  **建议 Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 涉及前端 UI 交互和 API 调用。
  - **Skills**: [`frontend-ui-ux`, `playwright`]
  **并行化**:
  - **可并行**: YES (与 Task 2, Task 3, Task 4 并行)
  - **并行组**: Wave 2
  - **阻塞**: None
  - **被阻塞**: Task 6
  **References**:
  - `packages/client/src/pages/settings/index.tsx` - 设置页。
  - `packages/client/src/services/api.ts` - `userApi.updateSettings`。
  **验收标准**:
  - [ ] 在设置页切换“通知”、“深色模式”、“自动同步”开关，确认 UI 状态正确更新。
  - [ ] 刷新页面后，开关状态能保持上次设置，与后端数据一致。

- [ ] 8. **Backend: Implement Export Data API**
  **做什么**:
  - 在 `packages/server-nestjs/src/users/users.controller.ts` 中增加 `POST /users/export` 接口。
  - 在 `packages/server-nestjs/src/users/users.service.ts` 中实现 `exportData` 方法，模拟或真实生成用户数据导出链接。
  **建议 Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及后端 API 和数据处理逻辑。
  - **Skills**: None
  **并行化**:
  - **可并行**: YES (与 Task 5, Task 9, Task 11 并行)
  - **并行组**: Wave 3
  - **阻塞**: Task 10
  - **被阻塞**: None
  **References**:
  - `packages/server-nestjs/src/users/users.controller.ts` - 用户控制器。
  - `packages/server-nestjs/src/users/users.service.ts` - 用户服务。
  **验收标准**:
  - [ ] 调用 `POST /users/export` 接口，返回一个模拟的或真实的下载链接。

- [ ] 9. **Backend: Implement Clear Data API**
  **做什么**:
  - 在 `packages/server-nestjs/src/users/users.controller.ts` 中增加 `DELETE /users/clear` 接口。
  - 在 `packages/server-nestjs/src/users/users.service.ts` 中实现 `clearData` 方法，模拟或真实清除用户数据。
  **建议 Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及后端 API 和数据处理逻辑。
  - **Skills**: None
  **并行化**:
  - **可并行**: YES (与 Task 5, Task 8, Task 11 并行)
  - **并行组**: Wave 3
  - **阻塞**: Task 10
  - **被阻塞**: None
  **References**:
  - `packages/server-nestjs/src/users/users.controller.ts` - 用户控制器。
  - `packages/server-nestjs/src/users/users.service.ts` - 用户服务。
  **验收标准**:
  - [ ] 调用 `DELETE /users/clear` 接口，返回成功信息。

- [ ] 10. **Frontend: Wire "导出数据" and "清除缓存"**
  **做什么**:
  - 在 `/packages/client/src/pages/settings/index.tsx` 中，将“导出数据”按钮链接到 `userApi.exportData()`。
  - 将“清除缓存”按钮链接到 `userApi.clearData()`。
  - 导出后可提示用户，清除数据前可增加确认弹窗。
  **建议 Agent Profile**:
  - **Category**: `quick`
    - Reason: 涉及前端交互和 API 调用。
  - **Skills**: None
  **并行化**:
  - **可并行**: YES (与 Task 5, Task 12 并行)
  - **并行组**: Wave 4
  - **阻塞**: None
  - **被阻塞**: Task 8, Task 9
  **References**:
  - `packages/client/src/pages/settings/index.tsx` - 设置页。
  - `packages/client/src/services/api.ts` - `userApi.exportData` 和 `userApi.clearData`。
  **验收标准**:
  - [ ] 在设置页点击“导出数据”，触发下载操作或显示下载链接。
  - [ ] 在设置页点击“清除缓存”，触发清除操作，并可增加确认弹窗。

- [ ] 11. **Backend: Create Connector Module (Skeleton)**
  **做什么**:
  - 创建 `packages/server-nestjs/src/connectors` 模块，包含 `connectors.controller.ts`, `connectors.service.ts`, `connector.entity.ts` (可选，如果需要持久化连接信息)。
  - 实现 `GET /connectors` (获取连接器列表), `POST /connectors/:type/connect` (连接), `POST /connectors/:type/disconnect` (断开), `GET /connectors/:type/templates` (获取消息模板) API 的骨架。
  - 这些 API 可以先返回模拟数据或简单的成功响应。
  **建议 Agent Profile**:
  - **Category**: `build from scratch`
    - Reason: 需要创建全新的后端模块。
  - **Skills**: [`ast_grep_search`]
    - `ast_grep_search`: 参照其他模块的结构进行开发。
  **并行化**:
  - **可并行**: YES (与 Task 5, Task 8, Task 9 并行)
  - **并行组**: Wave 3
  - **阻塞**: Task 5, Task 12
  - **被阻塞**: None
  **References**:
  - `packages/server-nestjs/src/contacts` - 参照现有模块结构。
  - `packages/client/src/services/api.ts` - `connectorApi` 定义。
  **验收标准**:
  - [ ] 后端启动后，能够通过 `GET /connectors` 获取模拟的连接器列表。
  - [ ] 能够通过 `POST /connectors/wechat/connect` 等接口模拟连接操作。

- [ ] 12. **Frontend: Integrate Connector List**
  **做什么**:
  - 在 `/packages/client/src/pages/connector/index.tsx` 中，用 `connectorApi.getList()` 替换当前的 mock 数据。
  - 将 `handleConnectorToggle` 逻辑修改为调用 `connectorApi.connect` 和 `connectorApi.disconnect`。
  **建议 Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 涉及前端数据加载和交互更新。
  - **Skills**: [`frontend-ui-ux`, `playwright`]
  **并行化**:
  - **可并行**: YES (与 Task 5, Task 10 并行)
  - **并行组**: Wave 4
  - **阻塞**: None
  - **被阻塞**: Task 11
  **References**:
  - `packages/client/src/pages/connector/index.tsx` - 连接器页面。
  - `packages/client/src/services/api.ts` - `connectorApi` 定义。
  **验收标准**:
  - [ ] 连接器列表页显示来自后端 API 的数据，而非本地 mock。
  - [ ] 点击连接器切换按钮，能触发后端连接/断开 API 调用，并更新 UI 状态。

### P2：待办事项数据模型及交互

- [ ] 13. **Backend: Update Briefing Entity for Todos**
  **做什么**:
  - 在 `packages/server-nestjs/src/entities/briefing.entity.ts` 中，将 `pendingTodos: string[]` 字段修改为 `todoItems: { content: string; completed: boolean; }[]` 或类似的结构，以便存储完成状态。
  **建议 Agent Profile**:
  - **Category**: `refactoring`
    - Reason: 涉及现有数据模型修改。
  - **Skills**: [`lsp_find_references`]
    - `lsp_find_references`: 查找 `pendingTodos` 的所有使用处，确保后续任务能正确修改。
  **并行化**:
  - **可并行**: NO (此为核心数据模型修改，需优先完成)
  - **并行组**: Wave 5
  - **阻塞**: Task 14, Task 15, Task 16
  - **被阻塞**: None
  **References**:
  - `packages/server-nestjs/src/entities/briefing.entity.ts` - 简报实体。
  **验收标准**:
  - [ ] 数据库迁移成功，`briefing` 表结构中 `pendingTodos` 字段已更新为新的 JSON 数组结构。

- [ ] 14. **Backend: Update Conversation Processor Service**
  **做什么**:
  - 在 `packages/server-nestjs/src/conversations/conversation-processor/conversation-processor.service.ts` 中，修改 AI 解析结果中 `todos` 字段的处理逻辑。
  - 确保解析出的待办事项能按照新的 `todoItems` 结构存储到 `conversation.parsedData`。
  **建议 Agent Profile**:
  - **Category**: `refactoring`
    - Reason: 涉及 AI 解析结果与数据模型适配。
  - **Skills**: None
  **并行化**:
  - **可并行**: YES (与 Task 15, Task 16 并行)
  - **并行组**: Wave 5
  - **阻塞**: None
  - **被阻塞**: Task 13
  **References**:
  - `packages/server-nestjs/src/conversations/conversation-processor/conversation-processor.service.ts` - 对话处理服务。
  **验收标准**:
  - [ ] 提交新的对话内容并进行 AI 解析，确认 `conversation.parsedData` 中的 `todoItems` 字段包含 `content` 和 `completed: false`。

- [ ] 15. **Backend: Update Briefings Service**
  **做什么**:
  - 在 `packages/server-nestjs/src/briefings/briefings.service.ts` 中，修改 `generateBriefing` 方法中对 `contact.briefing.pendingTodos` 的读取和处理逻辑，使其适应新的 `todoItems` 结构。
  - 确保会前简报能正确聚合待办事项。
  **建议 Agent Profile**:
  - **Category**: `refactoring`
    - Reason: 涉及会前简报生成逻辑与数据模型适配。
  - **Skills**: None
  **并行化**:
  - **可并行**: YES (与 Task 14, Task 16 并行)
  - **并行组**: Wave 5
  - **阻塞**: None
  - **被阻塞**: Task 13
  **References**:
  - `packages/server-nestjs/src/briefings/briefings.service.ts` - 简报服务。
  **验收标准**:
  - [ ] 为一个联系人生成会前简报，确认简报内容中能正确显示新的待办事项结构。

- [ ] 16. **Frontend: Update TodoItem Type**
  **做什么**:
  - 在 `packages/client/src/types/index.ts` 中，更新 `TodoItem` 接口定义，使其与后端新的 `todoItems` 结构保持一致。
  **建议 Agent Profile**:
  - **Category**: `quick`
    - Reason: 仅涉及类型定义修改。
  - **Skills**: None
  **并行化**:
  - **可并行**: YES (与 Task 14, Task 15 并行)
  - **并行组**: Wave 5
  - **阻塞**: Task 17, Task 18
  - **被阻塞**: Task 13
  **References**:
  - `packages/client/src/types/index.ts` - 前端类型定义。
  **验收标准**:
  - [ ] `TodoItem` 类型在 IDE 中不再报错，且包含 `content: string; completed: boolean;` 等字段。

- [ ] 17. **Frontend: Implement Todo Item Interaction in Conversation Detail**
  **做什么**:
  - 在 `/packages/client/src/pages/conversation-detail/index.tsx` 中，修改待办事项的渲染逻辑。
  - 根据 `todo.completed` 状态显示不同的勾选样式。
  - 为 `todo-checkbox` 增加 `onClick` 事件，触发状态切换，并调用后端 API 更新 `conversation.parsedData` 中的待办事项完成状态。
  **建议 Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 涉及前端 UI 交互和 API 调用。
  - **Skills**: [`frontend-ui-ux`, `playwright`]
  **并行化**:
  - **可并行**: YES (与 Task 18 并行)
  - **并行组**: Wave 5
  - **阻塞**: None
  - **被阻塞**: Task 16
  **References**:
  - `packages/client/src/pages/conversation-detail/index.tsx` - 对话详情页。
  - `packages/client/src/services/api.ts` - 可能需要新增 API 来更新单个 Todo 状态或重新归档。
  **验收标准**:
  - [ ] 对话详情页中的待办事项能正确显示完成/未完成状态。
  - [ ] 点击待办事项的勾选框，能切换其完成状态，并更新 UI。
  - [ ] 刷新页面后，待办事项的完成状态保持一致。

- [ ] 18. **Frontend: Display Pending Todos in Contact Detail**
  **做什么**:
  - 在 `/packages/client/src/pages/contact-detail/index.tsx` 中，添加一个区段来展示 `contact.briefing.todoItems` （如果存在）。
  - 可以考虑与对话详情页类似的方式展示，但此处可能无需交互，仅展示即可。
  **建议 Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 涉及前端 UI 展示。
  - **Skills**: [`frontend-ui-ux`]
  **并行化**:
  - **可并行**: YES (与 Task 17 并行)
  - **并行组**: Wave 5
  - **阻塞**: None
  - **被阻塞**: Task 16
  **References**:
  - `packages/client/src/pages/contact-detail/index.tsx` - 联系人详情页。
  **验收标准**:
  - [ ] 联系人详情页能展示该联系人关联的待办事项列表。

---

## Commit Strategy

针对每个任务，在完成后进行一次原子提交。提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

| 任务 | 提交消息示例 | 涉及文件示例 |
|------|-----------------|-----------------|
| 1 | `feat(contacts): add create and update contact api` | `server-nestjs/src/contacts/*` |
| 2 | `feat(client): implement contact form for crud` | `client/src/pages/contact-form/*`, `client/src/pages/contacts/*` |
| 3 | `feat(client): wire "start conversation" in contact detail` | `client/src/pages/contact-detail/index.tsx` |
| 4 | `feat(client): wire quick note in action panel` | `client/src/pages/action/index.tsx` |
| 5 | `feat(client): wire send message in action panel` | `client/src/pages/action/index.tsx`, `client/src/pages/send-message/*` |
| 6 | `feat(users): implement user settings api` | `server-nestjs/src/users/*`, `server-nestjs/src/entities/user.entity.ts` |
| 7 | `feat(client): integrate user settings in frontend` | `client/src/pages/settings/index.tsx` |
| 8 | `feat(users): implement export data api` | `server-nestjs/src/users/*` |
| 9 | `feat(users): implement clear data api` | `server-nestjs/src/users/*` |
| 10 | `feat(client): wire export/clear data in settings` | `client/src/pages/settings/index.tsx` |
| 11 | `feat(connectors): create connector module skeleton` | `server-nestjs/src/connectors/*` |
| 12 | `feat(client): integrate connector list with api` | `client/src/pages/connector/index.tsx` |
| 13 | `refactor(briefing): update pending todos to todoitems structure` | `server-nestjs/src/entities/briefing.entity.ts` |
| 14 | `refactor(conversation): adapt processor for new todoitems` | `server-nestjs/src/conversations/conversation-processor/*` |
| 15 | `refactor(briefing): adapt service for new todoitems` | `server-nestjs/src/briefings/briefings.service.ts` |
| 16 | `refactor(client): update todoitem type definition` | `client/src/types/index.ts` |
| 17 | `feat(client): implement todo item interaction in conversation detail` | `client/src/pages/conversation-detail/index.tsx` |
| 18 | `feat(client): display pending todos in contact detail` | `client/src/pages/contact-detail/index.tsx` |

---

## Success Criteria

### 验证命令
- **后端 API**: 使用 `curl` 或 Postman/Insomnia 验证每个新 API 的端点和响应。
- **前端 UI**:
    - `npm run dev:h5` 启动前端开发服务器。
    - 在浏览器中打开 `http://localhost:10001`。
    - 针对每个任务，按照验收标准进行手动操作和检查。

### 最终检查清单
- [ ] 所有“可交付成果”中列出的功能均已实现并可正常使用。
- [ ] 所有新增的后端 API 均已测试通过，符合预期功能。
- [ ] 所有修改的前端页面交互均能正确触发后端 API 调用，并正确显示 UI 状态。
- [ ] 用户能够通过应用界面完成所有上述修复任务涉及的核心操作。
