# Feature: Capability - network_action

## Summary

定义 `network_action` Agent 能力：
面向全体联系人做关系归纳与行动建议输出。

## Motivation

当前 action panel 能力与 AI 推荐逻辑分散，缺少统一 Agent 资产定义与缓存策略。

## Scope

### In Scope
- `network_action` 输入输出契约
- 模板与策略资产定义
- 缓存 TTL（12h）

### Out of Scope
- action-panel endpoint 桥接（由 bridge change 定义）

## Owner & Dependencies
- Owner: 业务工程师 B
- Dependencies: `agent-runtime-core-contracts`, `agent-runtime-storage-cache`

## Timeline
- 2026-02-13 ~ 2026-02-17

## Acceptance Criteria
1. 输出包含 followUps/recommendations/synthesis/nextActions。
2. 输出 schema 与错误策略明确。
3. 缓存命中与强制刷新策略明确。
