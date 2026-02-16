# FriendsAI Project Status（2026-02-16）

## 0. 文档说明
- 生成时间：2026-02-16
- 评估范围：`/Users/haoqi/OnePersonCompany/friendsAI` 当前代码与配置
- 评估方式：代码结构盘点 + 关键文档核对 + 本地构建/测试验证

## 1. 系统现状总览

### 1.1 技术与架构现状
- Monorepo：根目录 workspace 管理，前后端分离但同仓协作。
- 前端：`/Users/haoqi/OnePersonCompany/friendsAI/packages/web`（React + Vite + TypeScript + Assistant-UI + Vercel AI SDK）。
- 后端：`/Users/haoqi/OnePersonCompany/friendsAI/packages/server-nestjs`（NestJS + TypeORM + PostgreSQL + OpenAI SDK + Mustache）。
- API 前缀：`/v1`，并提供 Swagger 与 OpenAPI 文档（`/api`、`/api/openapi.json`）。
- 数据层：
  - 主数据源（v2）用于用户/联系人/会话/Agent 运行。
  - v3 数据源用于 action tracking 与 weekly report 等增强能力。

### 1.2 当前可验证运行状态（本次检查）
- 后端构建通过：`bun run server:build`
- 前端构建通过：`bun run web:build`
- 关键测试通过（Agent 相关）：
  - `agent-runtime-executor.service.spec.ts`
  - `prompt-template-renderer.service.spec.ts`
  - `contact-insight-context-builder.service.spec.ts`
  - `contact-insight.service.spec.ts`
  - `output-validator.service.spec.ts`

## 2. 已具备的核心功能

### 2.1 用户与基础业务
- 认证：登录/注册（验证码流）、refresh、logout。
- 联系人：列表、详情、创建、编辑、删除、上下文查询。
- 会话：会话列表、会话详情、消息历史、创建新会话。
- 会前简报：联系人维度 brief 获取/刷新。

### 2.2 Agent Runtime 与智能能力
- 统一执行入口：`POST /v1/agent/run`
- 流式聊天入口：`POST /v1/agent/chat?format=vercel-ai|sse`
- 已接入 Agent 能力：
  - `title_summary`：对话标题与摘要
  - `contact_insight`：联系人洞察
  - `archive_brief`：归档提取 / 简报生成（双 operation）
  - `network_action`：行动建议与关系网络建议
- Runtime 核心组件齐全：定义加载、模板渲染、输出校验、缓存快照、能力路由。

### 2.3 工具与外部集成
- 工具确认流：`tool-confirmations` 创建、查询、确认、拒绝。
- 飞书集成：OAuth 授权流程接口、token 管理、Webhook 按钮回调、消息发送客户端能力。
- 行为追踪：`actions/track` 与 `metrics/weekly`、`metrics/events`。

### 2.4 前端体验层
- 页面路由闭环：`/chat`、`/conversation/:id`、`/contacts`、`/contacts/:id`、`/actions`、`/settings`。
- Chat 端具备：
  - 流式消息渲染
  - 工具确认 Overlay
  - Composer 上下文（tools、feishu 开关、附件）
  - 技能触发（archive_extract / brief_generate / contact_insight）
- Actions 页面已消费 `network_action` 输出并渲染建议。

## 3. 最近完成的关键修复（2月16日批次）
- 迁移幂等化：`20260205184500`、`20260207223000`、`20260207231000`、`20260214_align_v3_entities` 已增强重复执行兼容。
- `agent_snapshots.scopeId`：从 `uuid` 改为 `text`，并补迁移 `20260215220000-AlterAgentSnapshotsScopeIdToText.sql`。
- `determineScopeId` 逻辑修复：避免错误把无关字符串写入 scopeId。
- Mustache 模板缺失变量误报修复：增加基于 token 的作用域感知检查，并补 `mustache.parse` 类型声明。
- `contact_insight` 稳定性修复：
  - 移除硬编码 `gpt-4`（改走全局模型配置）
  - 补齐 `contactId/index` 上下文字段
  - 放宽中文短标题/短动作的输出校验阈值
- 前端 `network_action` 请求去除无效 `conversationId` 注入。

## 4. 现有功能可优化项（按优先级）

### P0（建议优先处理）
1. 输出校验器能力不完整
- 现状：`OutputValidator` 的 JSON Schema -> Zod 转换是简化版，未完整覆盖 `enum`、`minItems/maxItems` 等规则。
- 风险：部分 schema 约束“看似定义了，实际未严格执行”。
- 建议：引入成熟 JSON Schema 校验器（如 Ajv）或完善转换器，并添加契约回归测试。

2. 错误码/HTTP 语义一致性
- 现状：部分运行错误被统一包装为 `NotFoundException` 或通用错误。
- 风险：前端无法准确区分 400/401/404/500，重试策略困难。
- 建议：建立统一错误映射层（validation、ai_service、snapshot、permission 分层）。

3. Agent 定义热更新体验
- 现状：`AgentDefinitionRegistry` 内存缓存定义后，模板/schema 变更通常需要重启进程才能生效。
- 风险：开发调试效率低，线上动态策略调整困难。
- 建议：开发环境加文件变更失效机制，生产加版本化配置刷新策略。

### P1（短期可落地）
1. ActionPanel 与 Agent 逻辑收敛
- 现状：`ActionPanelService` 仍有较早期“直接 AI 调用”的简化路径，与 `network_action` 有能力重叠。
- 建议：统一由 Agent Runtime 产出推荐，ActionPanel 做聚合与展示。

2. 观测与审计增强
- 现状：已有 HTTP 日志与部分 warning，但缺少统一 runId 追踪看板。
- 建议：沉淀 agent 级指标（成功率、缓存命中率、验证失败率、平均耗时）。

3. 前端体积与加载优化
- 现状：当前构建产物主 JS 较大（约 457KB）。
- 建议：按页面/能力拆分 chunk，重组件懒加载，降低移动端首屏压力。

### P2（中期优化）
1. 迁移体系治理
- 现状：SQL 迁移脚本较多，历史兼容分支复杂。
- 建议：增加迁移 smoke 校验脚本（空库/半旧库/最新库三类路径）。

2. 安全与会话策略
- 现状：前端 token 主要存于 localStorage。
- 建议：评估 HttpOnly Cookie 方案，降低 XSS 影响面。

## 5. 可新增功能建议（面向产品增长）

### 5.1 近期（2-4周）
1. 每日主动行动简报（Daily Action Digest）
- 自动聚合 `network_action + contact_insight`，每天推送“今日3个高价值行动”。
- 价值：提高日活与建议执行率。

2. 洞察解释与可追溯面板
- 在联系人洞察中展示“证据来源链路”（消息/事件/事实）及置信度。
- 价值：提升用户信任与可执行性。

3. Tool Confirmation 批量处理
- 支持批量确认/拒绝与模板化理由。
- 价值：降低高频工具操作成本。

### 5.2 中期（1-2个月）
1. 关系健康分层运营（Health Score + Risk Queue）
- 基于互动衰减、承诺未完成、关键事件临近构建风险队列。
- 价值：从“被动记录”升级到“主动运营关系”。

2. 飞书闭环增强
- 从 OAuth + 发送能力扩展到模板管理、发送结果回流、会话归档自动关联。
- 价值：连接真实沟通场景，形成数据闭环。

3. Prompt/Schema 版本中心
- 后台化管理 Agent 模板、schema、缓存策略版本，并支持灰度发布。
- 价值：减少线上改 prompt 的发布成本与风险。

### 5.3 长期（季度级）
1. 多渠道连接器（邮件/日历/IM）统一编排
- 用统一 Tool 抽象接入更多消息与日程来源。
- 价值：提升数据完整度与推荐质量。

2. 工作空间协作能力
- 成员视图、共享联系人、团队行动看板、权限控制。
- 价值：从个人工具向小团队协作产品扩展。

## 6. 建议的下一阶段执行顺序
1. 先做 Runtime 稳定性（P0 三项）：校验器、错误映射、定义热更新。
2. 再做体验优化（P1）：ActionPanel 收敛 + 观测指标 + 前端体积优化。
3. 并行推进一个“可见增长功能”：每日主动行动简报（5.1.1）。
4. 飞书能力以“发送回流 + 模板管理”作为中期主线（5.2.2）。

---

## 附：关键目录参考
- 后端主线：`/Users/haoqi/OnePersonCompany/friendsAI/packages/server-nestjs`
- 前端主线：`/Users/haoqi/OnePersonCompany/friendsAI/packages/web`
- 迁移目录：`/Users/haoqi/OnePersonCompany/friendsAI/packages/server-nestjs/migrations`
- Agent 定义：`/Users/haoqi/OnePersonCompany/friendsAI/packages/server-nestjs/src/agent/definitions`
- OpenSpec 变更：`/Users/haoqi/OnePersonCompany/friendsAI/openspec/changes`
