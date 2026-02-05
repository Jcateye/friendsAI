## ADDED Requirements

### Requirement: ARCH-010 User can request archive extraction for a conversation
系统 SHALL 支持对指定 conversation 发起“归档提取”，生成待审核的结构化结果（archive）。

#### Scenario: Create archive extraction
- **GIVEN** 用户已登录且拥有 `conversationId`
- **WHEN** 调用 `POST /v1/conversations/:conversationId/archive`
- **THEN** 响应 `200` 且返回 archive（包含 `id`, `status`, `summary`, `payload`）

### Requirement: ARCH-020 Archive payload contains structured items with citations
系统 MUST 在 archive payload 中包含结构化条目（contacts/events/facts/todos 等），且每条条目 SHOULD 带 `citations` 指向来源 messages（例如 `{ messageId, start, end }`）。

#### Scenario: Archive includes citations
- **GIVEN** conversation 中存在可提取信息（人名/事件/待办）
- **WHEN** 创建 archive extraction
- **THEN** 返回的 payload 中至少一条条目包含 citations，且 citations 中的 `messageId` 可在 `GET /v1/conversations/:conversationId/messages` 中找到

### Requirement: ARCH-030 User can review and apply archive
系统 SHALL 支持用户对 archive 进行确认应用；应用后应把结构化信息写入联系人侧沉淀（events/facts/todos），并将 archive 状态标记为 `applied`。

#### Scenario: Apply archive succeeds
- **GIVEN** archive `status=ready_for_review`
- **WHEN** 调用 `POST /v1/conversation-archives/:archiveId/apply`
- **THEN** 响应 `200` 且 archive 变为 `status=applied`

#### Scenario: Applied data is visible on contact context
- **GIVEN** archive 已 applied
- **WHEN** 调用 `GET /v1/contacts/:contactId/context`
- **THEN** 返回中可见新增的 events/facts/todos（来源指向该 conversation/archive）

### Requirement: ARCH-040 User can discard archive
系统 SHALL 支持用户丢弃一次 archive（不应用到联系人侧），并将状态标记为 `discarded`。

#### Scenario: Discard archive
- **GIVEN** archive 存在且尚未 applied
- **WHEN** 调用 `POST /v1/conversation-archives/:archiveId/discard`
- **THEN** 响应 `200` 且 archive `status=discarded`

### Requirement: ARCH-050 Apply is idempotent
系统 MUST 保证对同一 `archiveId` 的 apply 操作幂等：重复 apply 不应重复写入事件/事实/待办。

#### Scenario: Re-applying returns consistent result
- **GIVEN** archive 已 applied
- **WHEN** 再次调用 `POST /v1/conversation-archives/:archiveId/apply`
- **THEN** 响应 `200` 且不产生重复条目（可通过数量/唯一约束/返回结果观察）
