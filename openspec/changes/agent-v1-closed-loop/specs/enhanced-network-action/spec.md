# enhanced-network-action

## Purpose

定义增强版 `network_action` capability 行为，添加时机原因、先给价值点和后续计划。

## Requirements

### Requirement: ENA-010 System SHALL output timing reason for each follow-up
系统 SHALL 为每个跟进建议输出时机原因。

#### Scenario: Timing reason present
- **GIVEN** 用户请求网络行动建议
- **WHEN** 运行 `agentId=network_action`
- **THEN** `followUps` 中每项包含 `timing_reason` 字段

### Requirement: ENA-020 Output MUST include value-first suggestion
系统必须输出"先给价值点"建议（降低索取感）。

#### Scenario: Value-first approach
- **GIVEN** 生成跟进建议
- **WHEN** 返回输出
- **THEN** 包含 `value_first_suggestion` 字段，描述可以先提供的价值

### Requirement: ENA-030 Output SHOULD include follow-up plan
系统应输出后续跟进计划。

#### Scenario: Follow-up plan present
- **GIVEN** 生成行动建议
- **WHEN** 返回输出
- **THEN** 包含 `followup_plan` 字段，描述建议的后续步骤

### Requirement: ENA-040 Recommendations MUST be explainable
系统推荐必须是可解释的。

#### Scenario: Explainable recommendations
- **GIVEN** 返回推荐结果
- **WHEN** 检查 `recommendations` 数组
- **THEN** 每项包含 `reason` 字段解释推荐原因

### Requirement: ENA-050 Output schema MUST be backward compatible
输出 schema 必须向后兼容。

#### Scenario: Backward compatibility
- **GIVEN** 现有 `network_action` 调用方
- **WHEN** 调用增强版接口
- **THEN** 原有字段（`followUps`/`recommendations`/`synthesis`/`nextActions`/`metadata`）仍然存在
