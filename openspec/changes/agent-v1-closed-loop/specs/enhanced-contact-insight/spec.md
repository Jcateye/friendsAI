# enhanced-contact-insight

## Purpose

定义增强版 `contact_insight` capability 行为，添加优先级评分、风险等级和可解释性标签。

## Requirements

### Requirement: ECI-010 System SHALL output priority score for each contact
系统 SHALL 为每个联系人输出优先级评分（0-100），用于排序。

#### Scenario: Calculate priority score
- **GIVEN** 用户请求联系人洞察
- **WHEN** 运行 `agentId=contact_insight`
- **THEN** 输出包含 `priority_score` 字段（数字 0-100）

### Requirement: ECI-020 Output MUST include relationship risk level
系统必须输出关系风险等级。

#### Scenario: Risk level classification
- **GIVEN** 洞察生成成功
- **WHEN** 返回输出
- **THEN** 包含 `relationship_risk_level`，值为 `low`/`medium`/`high` 之一

### Requirement: ECI-030 Output SHOULD include explainable reason tags
系统应输出可解释的原因标签数组。

#### Scenario: Reason tags present
- **GIVEN** 洞察生成成功
- **WHEN** 返回输出
- **THEN** `reason_tags` 非空，包含如 `long_time_no_contact`/`upcoming_event`/`stale_commitment` 等标签

### Requirement: ECI-040 Priority score calculation MUST be deterministic
系统优先级计算必须是确定性的（相同输入产生相同分数）。

#### Scenario: Deterministic scoring
- **GIVEN** 相同的联系人数据和输入参数
- **WHEN** 两次调用 `contact_insight`
- **THEN** `priority_score` 值相同

### Requirement: ECI-050 Output schema MUST be backward compatible
输出 schema 必须向后兼容现有字段。

#### Scenario: Backward compatibility
- **GIVEN** 现有 `contact_insight` 调用方
- **WHEN** 调用增强版接口
- **THEN** 原有字段（`profileSummary`/`opportunities`/`risks`/`suggestedActions`/`openingLines`/`citations`）仍然存在且格式不变
