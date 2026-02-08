# Feature: Capability - contact_insight

## Summary

定义 `contact_insight` Agent 能力：
围绕单联系人输出深度洞察（机会、风险、建议动作、开场话术、引用）。

## Motivation

联系人深度洞察是核心 AI 价值点，需独立能力边界与稳定输出 schema。

## Scope

### In Scope
- 单联系人洞察输入输出契约
- 模板资产与策略定义
- TTL 6h 缓存策略

### Out of Scope
- 联系人详情页前端展示
- 旧 endpoint 桥接

## Owner & Dependencies
- Owner: 业务工程师 C
- Dependencies: `agent-runtime-core-contracts`, `agent-runtime-storage-cache`

## Timeline
- 2026-02-13 ~ 2026-02-17

## Acceptance Criteria
1. 输出至少包含 profileSummary/opportunities/risks/suggestedActions/openingLines/citations。
2. schema 失败时明确报错。
3. 默认 TTL 6h 策略明确。
