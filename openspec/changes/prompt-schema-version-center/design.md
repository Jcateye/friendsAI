## Context

`AgentDefinitionRegistry` 当前以文件系统为主，已支持 `watch|memory` 缓存模式，但不支持版本治理与灰度。

## Goals / Non-Goals

**Goals**
- 提供 DB 版本中心。
- 提供发布前 validate 与 publish 审计。
- 支持灰度规则和导出。

**Non-Goals**
- 不下沉到可视化配置平台。
- 不移除现有文件定义读取能力。

## Decisions

### Decision 1: 双源设计
- 默认仍使用文件系统。
- 当 `AGENT_DEFINITION_CENTER_ENABLED=true` 时，优先读取 DB active 版本。

### Decision 2: 生命周期
- `draft`：可编辑不可路由。
- `active`：可路由。
- `deprecated`：保留查询不可新路由。

### Decision 3: 灰度路由
- 按 `userId` 稳定哈希命中百分比。
- 发布规则可配置 `rolloutPercent`。

## Contracts

- `GET /v1/agent/definitions/:agentId/versions`
- `POST /v1/agent/definitions/:agentId/versions`
- `POST /v1/agent/definitions/:agentId/versions/:version/publish`
- `POST /v1/agent/definitions/:agentId/validate`

## Edge Cases

- schema 非法：validate 返回结构化错误，不允许 publish。
- publish 并发冲突：采用事务 + 唯一 active 约束。
- 灰度百分比调整：路由即时生效并审计。

## Security

- 版本变更记录操作人（userId）。
- 不在日志输出完整 prompt 原文（可截断）。

## Rollout / Rollback

1. 先上线 API 与 DB 表。
2. 灰度开 `AGENT_DEFINITION_CENTER_ENABLED`。
3. 回滚时关闭 flag，保留数据不删。
