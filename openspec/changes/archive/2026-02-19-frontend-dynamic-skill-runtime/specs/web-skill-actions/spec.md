# web-skill-actions

## ADDED Requirements

### Requirement: FDS-010 Web MUST support dynamic skill catalog
前端 MUST 支持从后端拉取动态 skills catalog。

#### Scenario: Render dynamic actions
- **GIVEN** `/v1/skills/catalog` 返回可用 skills
- **WHEN** 会话页加载
- **THEN** skill actions 由服务端数据构建

### Requirement: FDS-020 Composer MUST send skill action metadata
前端 MUST 在 composer context 中透传 skillActionId 与 rawInputs。

#### Scenario: Send skill action metadata
- **GIVEN** 用户点击动态 skill action
- **WHEN** 发起 chat 请求
- **THEN** 请求体 `context.composer` 包含 `skillActionId`

### Requirement: FDS-030 Web MUST preserve fallback path
前端 MUST 在 catalog 不可用时回退硬编码技能列表。

#### Scenario: Catalog fetch failed
- **GIVEN** `/v1/skills/catalog` 请求失败
- **WHEN** 会话页渲染
- **THEN** 继续显示并可使用硬编码 skill actions

### Requirement: FDS-040 Dynamic skills MUST not break stream protocol
动态 skill 接入 MUST 不破坏现有流协议解析与工具确认。

#### Scenario: Stream compatibility
- **GIVEN** 启用动态技能
- **WHEN** 进行聊天与工具确认
- **THEN** `conversation.created` 与 `tool.awaiting_input` 行为保持一致

### Requirement: FDS-050 Runtime MUST remain single path
Web 聊天 runtime MUST 继续使用 `useAgentChat` 单路径。

#### Scenario: Single runtime path
- **GIVEN** 动态技能启用
- **WHEN** 检查聊天调用路径
- **THEN** 不引入第二套 chat runtime
