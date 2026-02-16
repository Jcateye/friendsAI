# Design: Storage & Cache

## 1. Goals

- 支持分析型 Agent 的可复用缓存
- 支持 title_summary 的会话摘要回写
- 提供统一快照审计基础

## 2. Boundaries

### 2.1 独占路径
- `packages/server-nestjs/src/entities/agent-snapshot.entity.ts`
- `packages/server-nestjs/src/agent/snapshots/**`
- `packages/server-nestjs/migrations/*AgentSnapshots*`
- `packages/server-nestjs/src/entities/conversation.entity.ts`（summary 字段）

### 2.2 不在本模块
- controller/service 桥接
- capability prompt/逻辑

## 3. Data Model

### 3.1 conversations.summary
- 类型：`text null`
- 语义：最近一次 title_summary 生成的会话概要

### 3.2 agent_snapshots
- `id uuid pk`
- `agentId text`
- `operation text null`
- `scopeType text` (`conversation|contact|user|global`)
- `scopeId uuid null`
- `userId uuid null`
- `sourceHash text`
- `promptVersion text`
- `model text null`
- `input jsonb`
- `output jsonb`
- `expiresAt bigint`
- `createdAt bigint`
- `updatedAt bigint`

Indexes:
- `(agentId, operation, userId, scopeType, scopeId, sourceHash, promptVersion)`
- `(expiresAt)`

## 4. Cache Policy

- 优先 sourceHash 命中
- TTL 作为陈旧兜底
- `forceRefresh=true` 必须绕过缓存

## 5. Failure Modes

1. sourceHash 构建失败 -> `snapshot_hash_build_failed`
2. snapshot 反序列化失败 -> `snapshot_deserialize_failed`
3. 过期字段异常 -> `snapshot_expiry_invalid`

## 6. Test Plan

- 命中/未命中/强制刷新
- 过期行为
- summary 字段读写语义
