# agent-runtime-storage

## Purpose

定义 Agent 快照与会话 summary 的持久化规范。

## Requirements

### Requirement: STORE-010 System MUST persist agent snapshots with hash and ttl
系统 MUST 将 Agent 输出按 sourceHash + TTL 存储到 `agent_snapshots`。

#### Scenario: Cache hit by sourceHash
- **GIVEN** 同一 agentId、scope、sourceHash 请求再次到达
- **WHEN** 快照未过期
- **THEN** 返回命中结果，标记 `cached=true`

### Requirement: STORE-020 System MUST support force refresh
系统 SHALL 在 `forceRefresh=true` 时绕过快照并写入新记录。

#### Scenario: Force refresh bypasses cache
- **GIVEN** 已存在可命中快照
- **WHEN** 调用带 `forceRefresh=true`
- **THEN** 系统重新计算并持久化新快照

### Requirement: STORE-030 System MUST store conversation summary field
系统 SHALL 在会话模型中提供 `summary` 字段以承接 title_summary 输出。

#### Scenario: Title summary writeback target exists
- **GIVEN** title_summary 产生摘要
- **WHEN** 执行回写
- **THEN** `conversations.summary` 可被更新并读取
