## ADDED Requirements

### Requirement: TSA-010 System SHALL generate conversation title and summary
系统 SHALL 生成会话标题与概要。

#### Scenario: Generate title summary
- **GIVEN** 有效 conversationId
- **WHEN** 运行 `agentId=title_summary`
- **THEN** 返回非空 `title` 与 `summary`

### Requirement: TSA-020 Output SHALL be writeback-ready
系统 SHALL 返回可直接回写 conversation 的字段。

#### Scenario: Writeback-ready output
- **GIVEN** 输出生成成功
- **WHEN** API 返回结果
- **THEN** 包含 `conversationId`、`title`、`summary`

### Requirement: TSA-030 Default cache window SHALL be 24h
系统 SHALL 使用 24h 默认缓存窗口。

#### Scenario: Cache hit for same sourceHash
- **GIVEN** 同 sourceHash 在 24h 内重复请求
- **WHEN** 读取快照
- **THEN** 返回 cached 结果
