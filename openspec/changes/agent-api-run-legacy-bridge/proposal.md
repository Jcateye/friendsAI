# Feature: Unified /agent/run API and Legacy Bridge

## Summary

实现统一执行入口与兼容桥接策略（文档层）：
- 新增 `POST /v1/agent/run`
- 保留 `POST /v1/agent/chat`
- 旧 endpoint（brief/archive/action-panel）对内委托新 runtime

## Motivation

需要在不破坏现有调用方的前提下，引入新运行时架构。

## Scope

### In Scope
- `/agent/run` 请求/响应契约
- `/agent/chat` 与 run 的职责边界
- legacy endpoint 映射关系
- 共享文件修改归属声明

### Out of Scope
- capability 具体逻辑定义（由 capability changes 负责）
- storage 迁移细节（由 storage change 负责）

## Owner & Dependencies
- Owner: 集成负责人
- Dependencies:
  - `agent-runtime-core-contracts`
  - `agent-runtime-storage-cache`
  - 4 capability changes

## Timeline
- 2026-02-18 ~ 2026-02-23

## Acceptance Criteria
1. `/agent/run` 契约稳定且覆盖 5 个 agentId。
2. `/agent/chat` 保持流式兼容。
3. 旧 endpoint 输出契约不变且映射关系明确。
4. 共享路径修改权责在文档中明确。
