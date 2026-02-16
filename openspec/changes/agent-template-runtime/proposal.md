# Feature: FriendsAI 后端 Agent 模板引擎化（Program 总览）

## Summary

本变更作为 **Program 总览变更**，定义 FriendsAI 后端 Multi-Agent 的统一架构与模块拆分策略，
以模板引擎化方案为主线：
- Prompt 模板（Mustache）
- Agent JSON 定义
- 声明式 Memory/Tools Policy
- 统一执行 Runtime
- 统一入口 `POST /v1/agent/run` + 保留 `POST /v1/agent/chat`

本 Program change 不承载代码实现，仅负责：目标、边界、依赖、排期、冲突治理与验收门禁。

## Motivation

当前 AI 能力分散在 `chat/briefing/archive/action-panel` 模块中，存在以下问题：
1. Prompt 与逻辑分散，修改成本高；
2. 缺少“每个 Agent 独立定义”的规范化边界；
3. 新 Agent 接入成本高，容易重复造轮子；
4. 多人并行开发时，易产生共享文件冲突。

## Proposed Solution

采用“总览 + 模块拆分”的 OpenSpec 组织方式：
- `agent-template-runtime`：Program 总览与治理
- 7 个实现 change：
  - `agent-runtime-core-contracts`
  - `agent-runtime-storage-cache`
  - `agent-capability-archive-brief`
  - `agent-capability-network-action`
  - `agent-capability-contact-insight`
  - `agent-capability-title-summary`
  - `agent-api-run-legacy-bridge`

通过模块边界和合并顺序控制冲突：
- 共享入口与桥接文件仅允许 `agent-api-run-legacy-bridge` 修改；
- 能力变更各自独占 `src/agent/capabilities/<agentId>/**`。

## Scope

### In Scope
- Program 级架构与依赖图
- API 契约总览（run/chat/legacy bridge）
- 数据模型总览（`conversations.summary`、`agent_snapshots`）
- 并行开发冲突治理规则
- 里程碑与 Go/No-Go 门禁

### Out of Scope
- 具体代码实现
- 前端大规模改造
- 外部队列系统引入（首版仍为进程内异步设计）

## Public API / Interface Impact (Program-level)

- 新增：`POST /v1/agent/run`
- 保留：`POST /v1/agent/chat`
- 新增类型：
  - `AgentId`
  - `AgentRunRequest`
  - `AgentRunResponse`
  - `AgentDefinition`
- 数据模型：
  - `conversations.summary` 新增
  - `agent_snapshots` 新表

## Timeline

- 2026-02-09：完成 8 个 change proposal/design 初稿
- 2026-02-10：完成各 change specs 文档
- 2026-02-11：完成各 change tasks（含 Done When）
- 2026-02-12：文档评审冻结（Go/No-Go for implementation）

## Acceptance Criteria

1. 8 个 change 文档完整（proposal/design/specs/tasks）。
2. 每个模块职责、边界、依赖与时间计划明确。
3. 接口契约在模块间一致，无冲突字段/冲突责任。
4. 显式声明“本轮仅文档提交，不实施代码”。
