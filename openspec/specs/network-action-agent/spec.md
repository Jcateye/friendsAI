# network-action-agent Specification

## Purpose
TBD - created by archiving change openspec-spec-sync-backfill-20260219. Update Purpose after archive.
## Requirements
### Requirement: NWA-010 System SHALL produce network-level action suggestions
系统 SHALL 生成全体联系人级别的跟进建议与行动清单。

#### Scenario: Generate recommendations
- **GIVEN** 用户存在联系人数据
- **WHEN** 运行 `agentId=network_action`
- **THEN** 返回 `followUps` 与 `recommendations`

### Requirement: NWA-020 Output MUST include explainable synthesis
系统 MUST 返回可读的汇总解释字段 `synthesis`。

#### Scenario: Explainable output
- **GIVEN** 推荐结果已生成
- **WHEN** 返回输出
- **THEN** 包含 `synthesis` 与可执行 `nextActions`

### Requirement: NWA-030 Cache policy SHALL default to 12h ttl
系统 SHALL 采用 12 小时 TTL 作为默认缓存窗口。

#### Scenario: Cache hit within ttl
- **GIVEN** 同 sourceHash 请求在 12h 内重复
- **WHEN** 读取快照
- **THEN** 命中缓存并返回 `cached=true`

