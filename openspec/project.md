# Project Context

## Purpose
FriendsAI 是一个 **AI 原生的人脉/关系情报管理** 应用：以“对话”承载工作流，把会话中的信息沉淀为联系人画像、时间轴事件、事实要点与待办，并支持会前一键简报与连接器工具（如飞书）协作。

## Tech Stack
- Monorepo: Bun workspaces
- Web (packages/web): Vite 5 + React 18 + TypeScript + React Router v6
  - 聊天 UI：Assistant-UI（React 组件库，集成 Vercel AI SDK）
  - AI 流式：Vercel AI SDK（前端 hooks + stream protocol）
  - 状态：React Context + hooks（复杂场景可上 Zustand）
  - 样式：Tailwind CSS
  - 校验：zod（A2UI/ToolTrace schema 运行时校验）
  - 测试：Vitest + Testing Library（E2E 可选 Playwright）
  - 产品形态：Web-first 移动端（优先手机浏览器；可选 PWA/Capacitor 打包）
- Server (mainline): NestJS 11 + TypeScript + TypeORM
- DB: PostgreSQL + pgvector
- AI: OpenAI-compatible（模型/供应商可替换；以接口/适配器隔离）
- Optional: Redis（限流/短期状态/缓存）

## Project Conventions

### Code Style
- TypeScript 优先：类型清晰、避免 any 扩散；边界层使用 DTO/schema 校验。
- 目录与命名：按模块分层（controller/service/repository），命名与业务一致（conversation/message/archive/tool_confirmation 等）。
- 文档与规范：正文中文；保留英文技术标识（API 路径、字段名、错误码、Requirement IDs、命令、文件路径）。

### Architecture Patterns
- Conversation-first：conversation + message 是第一公民（像 ChatGPT 多轮多消息）。
- Agent Orchestrator：负责上下文构建 + LLM 调用 + tool_calls 编排；业务写入走 Domain services。
- 强确认：写/发/改状态类工具必须 requires_confirmation → 用户确认后执行。
- 可追溯：所有 AI 提取/归档结果尽量带 citations（来源 message span 或引用 ID）。
- API 统一前缀：/v1；流式输出使用 SSE（或明确替代方案）。

### API Documentation & Swagger
- 所有对前端或外部可见的 HTTP 接口（尤其是 `/v1/**`）必须接入 NestJS Swagger：
  - 在 controller 上配置 tag（如 `@ApiTags('agent')`），在接口方法上添加 summary/description。
  - 请求/响应 DTO 使用 `@nestjs/swagger` 装饰器暴露 schema，保证 OpenAPI JSON 可被前端/工具消费。
- Swagger/OpenAPI 文档出口：
  - Swagger UI：`/api`
  - OpenAPI JSON：`/api/openapi.json`（作为单一 API 契约源，供 Postman/前端代码生成/调试使用）。
- 新增或变更接口时：
  - 必须同时更新 Swagger 描述与 openspec 规范（如在 `openspec/specs/**/spec.md` 中补充对应小节）。
  - 接口行为、字段语义、错误码等文字说明以 openspec 为准，Swagger 主要承载结构与示例。

### Testing Strategy
- Server: Jest（单元测试优先覆盖 orchestrator、tool 策略、归档提取/应用）
- Client: 以 H5 为主；关键 hook/解析逻辑可用单测（已有 vitest 示例）。
- 每个变更必须给出可验证的 Acceptance（命令或可观察检查点）。

### Git Workflow
- 小步提交、PR-sized、单目标（与 Requirement ID 对齐）。
- 允许激进重构，但每个阶段必须保持可运行（至少 H5 + 核心闭环 smoke）。

## Domain Context
核心领域对象（目标形态，详见 `designs/tech_design.md`）：
- Conversations/Messages：对话与消息流（含 tool_trace、tool_result、a2ui、error 等 contentType）
- Contacts：联系人（画像/标签/热度/lastInteractionAt）
- Archive：会话归档提取（events/facts/todos/contactLinks）→ 用户审核确认 → 应用到联系人侧
- Brief：会前简报（聚合联系人信息 + 最近交互 + 待办 → 生成简报）
- Tools/Connectors：工具调用与连接器（飞书）；执行过程在聊天中可见，写操作强确认

## Important Constraints
- H5-first：优先保证 H5 可用；SSE 设计需考虑 EventSource 限制（GET/无自定义 header），若采用 fetch stream/WS 必须在 design/proposal 里明确。
- 允许前后端契约重写（激进模式），但必须持续可验收（端到端闭环优先）。
- 使用全新数据库（例如 friendsai_v2），旧库保留用于回滚对照；不做旧数据迁移。
- 不引入新的跨端框架（继续使用 Taro）。
- 时间字段策略：数据库中的业务时间字段（`*At` / `*Date`）统一使用 epoch milliseconds（`bigint`）存储；新增表/字段默认禁止使用 `timestamp` / `timestamptz`，例外必须在 proposal 中说明理由与兼容方案。
- API 时间契约：后端响应需提供 `*Ms` 数值字段用于排序与计算；ISO 字符串字段可保留用于兼容与可读性。
- 前端时间处理：排序、比较、去重统一优先读取 `*Ms`；仅在展示层将时间戳转换为用户当前时区字符串。
- Agent 执行约束：涉及时间字段的设计/改动必须检查“存储层无时区歧义（epoch ms）+ 展示层本地化转换”两条，并在验收里加入跨时区排序验证。
- 删除规则：涉及外键链路的数据删除必须在 service 层按“子表 → 父表”顺序编排，并放在单个事务中执行；禁止直接依赖 `TRUNCATE` 或无序批量删除。
- 外键策略：数据库外键必须保留，作为最终一致性防线；当 service 删除顺序不合理时，应暴露清晰错误而不是移除 FK 约束。
- 测试清理：e2e 数据清理同样遵循“子到父”顺序；共享数据库的 e2e 套件使用单 worker 串行执行，避免并发清理互相污染。

## External Dependencies
- PostgreSQL + pgvector（本地 dev 端口通常为 5434，具体以 docker-compose 配置为准）
- LLM Provider（OpenAI-compatible）：OPENAI_API_KEY 等配置（具体变量以 server 主线实现为准）
- Feishu Open Platform（OAuth + 消息/通讯录等 API；写操作需强确认与审计）
