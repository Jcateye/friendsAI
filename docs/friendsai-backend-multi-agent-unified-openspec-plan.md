# FriendsAI 后端 Multi-Agent 统一方案（OpenSpec 多模块并行版，模板引擎化为主线）

## 文档定位

- 类型：架构/交付设计文档（OpenSpec 文档提交版）
- 范围：仅文档提交，不实施代码
- 主线：Agent 模板引擎化方案（Mustache + JSON 定义 + 声明式 Memory/Tools + 统一 Runtime）

## 目标

将 FriendsAI 后端 AI 能力收敛到统一 Agent Runtime，同时通过 OpenSpec 模块拆分支持多人并行开发，减少共享文件冲突。

## 关键约束（冻结）

1. 模板语法使用 Mustache（无逻辑模板）
2. 模板来源为代码库文件（Git 管理）
3. 缺变量策略：告警 + defaults 注入
4. 每个 Agent 定义使用 JSON
5. Memory 策略采用声明式定义，由 Runtime 执行
6. Tool 使用白名单 + 最小权限
7. 输出 schema 校验失败直接报错并记录
8. 保留 `/v1/agent/chat`，新增统一入口 `/v1/agent/run`

## OpenSpec 拆分结构（8 个 change）

### Program（总览，不承载具体实现）

- `openspec/changes/agent-template-runtime/`

### 模块化实现 change

- `openspec/changes/agent-runtime-core-contracts/`
- `openspec/changes/agent-runtime-storage-cache/`
- `openspec/changes/agent-capability-archive-brief/`
- `openspec/changes/agent-capability-network-action/`
- `openspec/changes/agent-capability-contact-insight/`
- `openspec/changes/agent-capability-title-summary/`
- `openspec/changes/agent-api-run-legacy-bridge/`

## 每个实现模块需包含的文档

每个实现 change 均包含：

- `proposal.md`
- `design.md`
- `specs/<capability>/spec.md`
- `tasks.md`

总览 change 包含：

- `proposal.md`
- `design.md`
- `specs/program-governance/spec.md`
- `tasks.md`（跨模块门禁）

## 统一架构（逻辑层）

```text
API Layer
  - POST /v1/agent/run (统一执行)
  - POST /v1/agent/chat (流式兼容)

Runtime Layer
  - AgentDefinitionRegistry
  - TemplateContextBuilder
  - PromptTemplateRenderer
  - MemoryRuntime
  - ToolRuntime
  - OutputValidator
  - SnapshotService

Capability Layer
  - chat_conversation
  - archive_brief (archive_extract | brief_generate)
  - title_summary
  - network_action
  - contact_insight
```

## 公共接口与类型（文档约束）

- 新增 API：`POST /v1/agent/run`
- 保留 API：`POST /v1/agent/chat`
- 类型新增：
  - `AgentId`
  - `AgentRunRequest`
  - `AgentRunResponse`
  - `AgentDefinition`
- 数据模型新增：
  - `conversations.summary`
  - `agent_snapshots`（sourceHash + TTL）

## 并行冲突治理

1. 路径独占：每个 capability change 只改各自目录
2. 共享入口文件仅 `agent-api-run-legacy-bridge` 可改
3. 合并顺序：
   - `runtime-core` + `storage-cache`
   - 四个 capability 并行
   - `api-run-legacy-bridge` 最后集成

## 时间计划（文档层，绝对日期）

- 2026-02-09：完成 8 个 change 的 proposal/design 初稿
- 2026-02-10：完成 specs 文档
- 2026-02-11：完成 tasks 文档
- 2026-02-12：文档评审冻结（Go/No-Go for implementation）

## 验收标准（仅文档）

1. 8 个 change 文档结构完整（proposal/design/specs/tasks）
2. 模块边界、依赖、时间计划可直接分配给不同开发者
3. 接口契约一致，无跨模块冲突字段
4. 明确“本轮不实施代码”

## 备注

- 当前仓库中 `openspec/changes/*` 已存在对应文档草案。
- 本文档用于给项目管理和多人协作提供一个可快速对齐的总入口。
