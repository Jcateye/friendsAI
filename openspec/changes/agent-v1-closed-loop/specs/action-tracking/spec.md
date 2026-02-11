# action-tracking

## Purpose

定义 Agent 建议和行动追踪的行为契约，用于度量"建议->执行->结果"闭环。

## Requirements

### Requirement: AT-010 System SHALL record suggestion shown event
系统必须记录建议展示事件。

#### Scenario: Record suggestion shown
- **GIVEN** Agent 生成建议并返回给用户
- **WHEN** 建议被展示给用户
- **THEN** 创建 `agent_suggestion_shown` 事件记录，包含 `suggestion_id`/`agent_id`/`user_id`/`timestamp`

### Requirement: AT-020 System SHALL record suggestion accepted event
系统必须记录建议采纳事件。

#### Scenario: Record suggestion accepted
- **GIVEN** 用户点击接受某条建议
- **WHEN** 采纳操作发生
- **THEN** 创建 `agent_suggestion_accepted` 事件记录，关联 `suggestion_id`

### Requirement: AT-030 System SHALL record message sent event
系统必须记录消息发送事件。

#### Scenario: Record message sent
- **GIVEN** 用户确认发送消息
- **WHEN** 消息通过工具执行
- **THEN** 创建 `agent_message_sent` 事件记录，包含 `message_id`/`recipient_id`/`channel`

### Requirement: AT-040 System SHALL record message replied event
系统必须记录消息回复事件（通过外部回调）。

#### Scenario: Record message replied
- **GIVEN** 已发送的消息收到回复
- **WHEN** 外部系统回调通知
- **THEN** 更新 `agent_message_replied` 事件，记录 `replied_at` 时间戳

### Requirement: AT-050 System SHALL record follow-up completed event
系统必须记录后续跟进完成事件。

#### Scenario: Record follow-up completed
- **GIVEN** 建议的后续行动被标记为完成
- **WHEN** 用户手动标记或系统自动检测
- **THEN** 创建 `agent_followup_completed` 事件记录

### Requirement: AT-060 System SHALL provide weekly conversion metrics
系统必须提供每周转化指标查询。

#### Scenario: Query weekly metrics
- **GIVEN** 用户查询过去7天数据
- **WHEN** 调用统计 API
- **THEN** 返回 `action_completion_rate`/`reply_rate`/`followup_rate`

### Requirement: AT-070 Event tracking MUST NOT affect main database
事件追踪不得影响主数据库 `friendsai_v2`。

#### Scenario: Database isolation
- **GIVEN** 事件追踪系统运行
- **WHEN** 写入任何事件数据
- **THEN** 仅写入 `friendsai_v3_gpt` 数据库，不触碰 `friendsai_v2`
