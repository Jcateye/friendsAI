## ADDED Requirements

### Requirement: CONT-010 User can create and manage contacts
系统 SHALL 支持联系人 CRUD（最小字段：`displayName`；可选字段：`alias`, `tags`, `note`）。

#### Scenario: Create contact
- **GIVEN** 用户已登录
- **WHEN** 调用 `POST /v1/contacts`，提交 `{ displayName, tags?, note? }`
- **THEN** 响应 `200` 且返回 contact（含 `id`）

#### Scenario: List contacts
- **GIVEN** 用户已登录且存在多个 contact
- **WHEN** 调用 `GET /v1/contacts`
- **THEN** 响应 `200` 且返回 contacts 列表

#### Scenario: Update contact
- **GIVEN** 用户已登录且拥有 `contactId`
- **WHEN** 调用 `PATCH /v1/contacts/:contactId`
- **THEN** 响应 `200` 且返回更新后的 contact

### Requirement: CONT-020 Contact context aggregates recent items
系统 SHALL 提供联系人上下文聚合接口，返回最近相关的 events/facts/todos（以及可选的引用）。

#### Scenario: Fetch contact context
- **GIVEN** 用户已登录且拥有 `contactId`
- **WHEN** 调用 `GET /v1/contacts/:contactId/context`
- **THEN** 响应 `200` 且返回 `{ events, facts, todos, ... }`

### Requirement: CONT-030 System can generate a brief for a contact
系统 SHALL 支持生成/获取联系人 brief（会前简报），并可包含 citations 指向来源。

#### Scenario: Get existing brief
- **GIVEN** 该 contact 已生成过 brief
- **WHEN** 调用 `GET /v1/contacts/:contactId/brief`
- **THEN** 响应 `200` 且返回 brief 文本与 `generatedAt`

#### Scenario: Brief is missing
- **GIVEN** 该 contact 从未生成过 brief
- **WHEN** 调用 `GET /v1/contacts/:contactId/brief`
- **THEN** 响应 `200` 且返回 `null`（或明确的空结构）

### Requirement: CONT-040 User can refresh brief
系统 SHALL 支持强制刷新 brief，生成的新 brief 应基于最新的联系人沉淀与近期交互。

#### Scenario: Refresh brief updates content
- **GIVEN** 用户已登录且拥有 `contactId`
- **WHEN** 调用 `POST /v1/contacts/:contactId/brief/refresh`
- **THEN** 响应 `200` 且返回新的 brief（`generatedAt` 更新）
