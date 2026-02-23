## ADDED Requirements

### Requirement: ABR-010 archive_brief MUST support archive_extract
系统 SHALL 支持按 `conversationId` 输出归档结构化结果。

#### Scenario: Archive extract success
- **GIVEN** 有效 conversationId
- **WHEN** 运行 `archive_brief` 且 `operation=archive_extract`
- **THEN** 返回包含 `summary` 与 `payload` 的结构化结果

### Requirement: ABR-020 archive_brief MUST support brief_generate
系统 SHALL 支持按 `contactId` 输出会前简报。

#### Scenario: Brief generate success
- **GIVEN** 有效 contactId
- **WHEN** 运行 `archive_brief` 且 `operation=brief_generate`
- **THEN** 返回 `content`、`generated_at`、`source_hash`

### Requirement: ABR-030 Output MUST be validated per operation schema
系统 MUST 按 operation 的 schema 校验输出。

#### Scenario: Operation schema mismatch
- **GIVEN** LLM 输出不满足当前 operation schema
- **WHEN** 执行输出校验
- **THEN** 返回错误并停止后续流程
