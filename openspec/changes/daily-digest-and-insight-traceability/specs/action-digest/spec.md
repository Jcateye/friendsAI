# action-digest

## ADDED Requirements

### Requirement: DDI-010 System MUST aggregate network_action and contact_insight into top-3 daily actions
系统 MUST 将 `network_action` 与 `contact_insight` 聚合为每日 top-3 行动建议。

#### Scenario: Build daily digest
- **GIVEN** 用户存在可执行建议
- **WHEN** 生成当日 digest
- **THEN** 返回最多 3 条按优先级排序的行动项

### Requirement: DDI-020 System MUST provide in-app digest retrieval and refresh API
系统 MUST 提供 in-app 的当日 digest 查询与刷新 API。

#### Scenario: Read today digest
- **GIVEN** 用户已登录
- **WHEN** 调用 `GET /v1/action-digest/today`
- **THEN** 返回 `{date, generatedAt, items[]}`

#### Scenario: Refresh today digest
- **GIVEN** 用户已登录
- **WHEN** 调用 `POST /v1/action-digest/refresh`
- **THEN** 返回刷新后的 digest 并覆盖当日缓存
