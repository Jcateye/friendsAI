## Why

当前主线（Taro client + Express server）与 `designs/tech_design.md` 的目标形态（Conversation-first + SSE + A2UI + 工具强确认 + 引用追溯）存在结构性偏差：对话与归档流程割裂、SSE/A2UI 组件未贯通、工具确认机制分裂，导致端到端演示不稳定且难以迭代。

我们选择直接切换到 `packages/server-nestjs` 作为后端主线，并同步重构前端，建立以 conversation/message 为核心的统一数据模型与流式交互骨架，为后续能力（工具、连接器、引用追溯）提供稳定底座。

## Intent

在保持“主要运行 H5”的前提下，把 FriendsAI 的主线交付切到 NestJS + 新数据库，并跑通 Conversation-first 的核心闭环：聊天 → 归档提取 → 用户确认 → 联系人侧沉淀 → 会前简报。

## Scope

- 后端主线切换到 `packages/server-nestjs`，统一 API 前缀 `/v1`
- 使用全新 PostgreSQL 数据库（例如 `friendsai_v2`），不迁移旧数据；旧库仅用于回滚对照
- 以 Conversation-first 数据模型重建核心域：
  - conversations/messages
  - contacts +（events/facts/todos/brief 等沉淀）
  - conversation archives（归档提取结果待审/应用）
- Agent SSE：提供流式输出（文本 delta、tool trace、A2UI、citations），前端 H5 接入
- 工具强确认：写/发类工具必须 `requires_confirmation`，用户确认后才执行
- 调整根目录启动脚本与环境配置，使默认开发/启动链路指向 NestJS（Express 已移除）

## Non-Goals

- 旧数据迁移（contacts/journal/chat_session/action_item/tool_task 等旧表不迁）
- 小程序端（weapp）流式能力适配（本阶段只保证 H5）
- 一次性做完所有连接器能力（飞书 OAuth/token 交换、模板体系可先最小化或 mock）
- 复杂的多租户/workspace 体系（默认按 userId 隔离；如需 workspace 另开变更）

## Risks

- **Breaking**：前后端契约与数据模型重写，短期会导致旧页面/旧 API 不可用，需要同步改造客户端
- 流式实现复杂度：H5 SSE 客户端（EventSource 的限制 / fetch stream 的兼容性）需要明确并落地稳定方案
- 新 DB + 新 schema：需要完善 migrations/初始化脚本，否则开发体验与回滚会受影响
- 连接器/工具确认链路的安全性与可观测性（审计、幂等、失败重试）需要在设计与任务中明确边界

## Rollback

- Express 旧后端已移除，回滚需回退到删除前的 git commit/tag
- 因为新主线使用独立 DB（`friendsai_v2`），回滚不涉及数据回迁

## Acceptance

- 本地启动（H5）可跑通：
  - 启动后端：`curl http://localhost:3000/v1/health` 返回 `ok`
  - 前端 H5 页面可访问并完成登录（获得 `accessToken/refreshToken`）
  - 用户可创建/进入一个 conversation，发送消息后能收到流式回复（可见 delta/最终消息）
  - 触发“归档此会话”后能看到归档审核 UI（A2UI 或等价页面），确认后联系人侧可见新增的 events/facts/todos
  - 联系人详情可生成/刷新 brief（可观察到 brief 内容更新）
  - 至少一个“写/发”类工具走强确认：先 `requires_confirmation`，用户确认后执行并记录结果

## What Changes

- **BREAKING**：主线后端从 Express 切到 NestJS；主线 DB 切到新 schema（`friendsai_v2`）
- 前端对话/归档/联系人等页面与数据结构对齐 Conversation-first 设计
- 统一工具确认机制为 `tool_confirmations`（并在聊天中展示 tool trace）

## Capabilities

### New Capabilities

- `auth-jwt`: JWT 登录/注册/refresh（H5 主线）；统一鉴权策略与错误码
- `agent-chat-sse`: `/v1/agent/chat` 流式对话（SSE）+ H5 客户端接入（delta/tool trace/A2UI/citations）
- `conversation-archive`: 会话归档提取 → 审核确认 → 应用到联系人侧沉淀（events/facts/todos）
- `contacts-brief`: 联系人 CRUD + context 聚合 + brief 生成/刷新
- `tool-confirmation`: 写/发类工具强确认（requires_confirmation → confirm/reject → execute）

### Modified Capabilities

- （无；`openspec/specs/` 当前为空，属于全新能力集）

## Impact

- `packages/server-nestjs`: 新增/重构模块（auth/agent/ai/tools/archives/contacts/messages/migrations）
- `packages/client`: 对话与归档相关页面与 hooks 重构；H5 流式客户端实现调整
- 根目录脚本与环境：`project.sh`、`package.json`、docker-compose/DB 初始化与 `.env` 约定更新
