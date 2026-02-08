# contact-insight-agent

## Purpose

定义 contact_insight capability 行为。

## Requirements

### Requirement: CIA-010 System SHALL generate deep contact insight
系统 SHALL 按单联系人输出结构化洞察。

#### Scenario: Generate contact insight
- **GIVEN** 有效 userId 与 contactId
- **WHEN** 运行 `agentId=contact_insight`
- **THEN** 返回 summary/opportunities/risks/actions

### Requirement: CIA-020 Output SHOULD contain actionable suggestions and opening lines
系统 SHOULD 提供可执行建议与沟通开场话术。

#### Scenario: Actionability
- **GIVEN** 洞察生成成功
- **WHEN** 返回输出
- **THEN** `suggestedActions` 与 `openingLines` 非空（在有足够数据时）

### Requirement: CIA-030 Output MUST be traceable with citations
系统 MUST 支持引用字段，便于追溯来源。

#### Scenario: Citation present
- **GIVEN** 生成结果包含事实判断
- **WHEN** 返回输出
- **THEN** 至少一条 insight 项可关联 citations
