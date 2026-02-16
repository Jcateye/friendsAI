# contact-insight-traceability

## ADDED Requirements

### Requirement: DDI-030 Insight output MUST include summarized evidence chain
系统 MUST 在洞察输出中提供证据链摘要。

#### Scenario: Insight item has evidence chain
- **GIVEN** 洞察输出包含 opportunities/risks/suggestedActions
- **WHEN** 返回 API 响应
- **THEN** 每条洞察项包含 `evidenceChains[]`（摘要级）

### Requirement: DDI-040 Insight output MUST include confidence and source metadata
系统 MUST 提供置信度与来源元数据。

#### Scenario: Insight confidence and source refs
- **GIVEN** 洞察输出完成
- **WHEN** 返回 API 响应
- **THEN** 包含 `confidence` 与 `sourceRefs[]` 字段

### Requirement: DDI-050 System MUST avoid exposing full raw message text by default
系统 MUST 默认避免输出完整原始聊天文本。

#### Scenario: Evidence redaction
- **GIVEN** 证据源来自消息内容
- **WHEN** 输出 `evidenceChains.summary`
- **THEN** summary 仅包含必要摘要且不可恢复原文全文
