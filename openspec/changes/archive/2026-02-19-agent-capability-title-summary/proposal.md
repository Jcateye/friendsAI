# Feature: Capability - title_summary

## Summary

定义 `title_summary` Agent 能力：
按 conversation 生成标题与概要，并可供后续回写 `conversations.title/summary`。

## Motivation

标题与概要是会话列表核心可读信息，需作为独立 capability 管理。

## Scope

### In Scope
- `title_summary` 输入输出契约
- 模板、memory、cache 策略
- 回写目标字段契约说明

### Out of Scope
- chat 流程异步触发集成（由 bridge change 负责）

## Owner & Dependencies
- Owner: 业务工程师 D
- Dependencies: `agent-runtime-core-contracts`, `agent-runtime-storage-cache`

## Timeline
- 2026-02-13 ~ 2026-02-17

## Acceptance Criteria
1. 输出包含 `title` 和 `summary`。
2. 输出可映射到会话回写字段。
3. 默认 TTL 24h 策略明确。
