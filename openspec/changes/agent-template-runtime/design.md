# Design: Program 级统一方案与并行治理

## 1. Goals

1. 以模板引擎化为主线，统一后端 Agent 架构；
2. 将一个大变更拆分为多个可并行 change；
3. 通过边界治理减少多人并行冲突；
4. 形成“可直接分配执行”的文档包。

## 2. Architecture Overview

```text
Program Change: agent-template-runtime
  ├─ Runtime Core: agent-runtime-core-contracts
  ├─ Storage Cache: agent-runtime-storage-cache
  ├─ Capability: archive_brief
  ├─ Capability: network_action
  ├─ Capability: contact_insight
  ├─ Capability: title_summary
  └─ API Bridge: agent-api-run-legacy-bridge
```

## 3. Module Ownership & Boundaries

### 3.1 独占原则
- `agent-runtime-core-contracts`：仅改 runtime/contracts。
- `agent-runtime-storage-cache`：仅改 snapshot/entity/migration。
- 各 capability change：仅改各自 capability 目录。
- `agent-api-run-legacy-bridge`：唯一允许改共享入口/controller/module/legacy bridge。

### 3.2 共享文件白名单（仅 bridge change 可改）
- `packages/server-nestjs/src/agent/agent.controller.ts`
- `packages/server-nestjs/src/agent/agent.module.ts`
- `packages/server-nestjs/src/agent/agent.types.ts`
- `packages/server-nestjs/src/agent/agent.orchestrator.ts`
- `packages/server-nestjs/src/briefings/**`
- `packages/server-nestjs/src/conversation-archives/**`
- `packages/server-nestjs/src/action-panel/**`

## 4. Cross-Module Contracts

### 4.1 Runtime Contract
- 输入：`AgentRunRequest`
- 输出：`AgentRunResponse`
- 配置：`AgentDefinition`（JSON + 模板 + schema + policy）

### 4.2 Data Contract
- `agent_snapshots`：sourceHash + TTL
- `conversations.summary`：title_summary 回写字段

### 4.3 API Contract
- `POST /v1/agent/run`：统一非流式执行入口
- `POST /v1/agent/chat`：聊天流式入口（保留）

## 5. Dependency Order

1. Runtime Core + Storage Cache（并行）
2. 四个 Capability（并行）
3. API Bridge（整合）

## 6. Failure Modes (Program-level)

1. **边界冲突**：两个 change 修改同一共享文件。  
   - 处理：强制共享文件仅 bridge change 修改。
2. **契约漂移**：各模块自定义字段导致不兼容。  
   - 处理：Program change 中冻结公共类型。
3. **时间漂移**：上游 change 延迟影响 bridge。  
   - 处理：以依赖检查点作为 gate。

## 7. Test & Verification Strategy (Program-level)

- 文档一致性检查：字段、错误码、路径一致；
- 依赖一致性检查：tasks 中依赖链闭合；
- 冲突审计：每个 change 列出独占路径。

## 8. Rollout / Governance

- 文档冻结日期：2026-02-12
- 冻结后才允许进入实现阶段
- 未通过文档 gate，不进入代码阶段

## 9. Non-Goals

- 本 change 不实现任何业务逻辑
- 本 change 不提交 migration 或接口代码
