# Feature: Capability - archive_brief

## Summary

定义 `archive_brief` Agent 能力，统一承载两类 operation：
- `archive_extract`
- `brief_generate`

通过模板资产 + schema + policy 实现能力可配置化。

## Motivation

归档与简报目前分散在不同服务，缺少统一 Agent 能力描述与执行策略。

## Scope

### In Scope
- `archive_brief` 能力定义资产结构
- 两种 operation 的输入/输出契约
- memory、tools、cache 策略定义

### Out of Scope
- API bridge 层改造
- 数据模型迁移（由 storage change 定义）

## Owner & Dependencies
- Owner: 业务工程师 A
- Dependencies: `agent-runtime-core-contracts`, `agent-runtime-storage-cache`

## Timeline
- 2026-02-13 ~ 2026-02-17

## Acceptance Criteria
1. `archive_extract` 输入输出契约清晰。
2. `brief_generate` 输入输出契约清晰。
3. ability 具备可配置模板与 schema 校验设计。
