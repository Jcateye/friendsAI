# Feature: Agent Runtime Storage & Cache

## Summary

定义 Agent 运行结果持久化与缓存策略：
- 新增 `agent_snapshots` 数据模型
- 新增 `conversations.summary` 字段
- 统一 sourceHash + TTL 命中策略

## Motivation

没有统一快照层会导致：
- 分析型 Agent 重复计算，成本高；
- 无法追踪输出版本与缓存命中；
- title/summary 缺少结构化落库路径。

## Scope

### In Scope
- `agent_snapshots` 表结构、索引设计
- `conversations.summary` 字段设计
- snapshot 查询/写入/过期规则

### Out of Scope
- runtime 渲染逻辑
- API 路由改造

## Owner & Dependencies
- Owner: 数据与后端工程师
- Dependencies: 可与 runtime core 并行（契约对齐即可）

## Timeline
- 2026-02-10 ~ 2026-02-12

## Acceptance Criteria
1. snapshot 数据模型字段完整且可支持 sourceHash 命中。
2. TTL 与过期索引策略明确。
3. conversation summary 字段语义与回写规则明确。
