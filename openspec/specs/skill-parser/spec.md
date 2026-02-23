# skill-parser Specification

## Purpose
TBD - created by archiving change skill-invocation-input-adapter. Update Purpose after archive.
## Requirements
### Requirement: SIA-010 Parser MUST output canonical SkillInvocationIntent
系统 MUST 将输入解析为统一 `SkillInvocationIntent` 类型。

#### Scenario: Canonical output
- **GIVEN** 任意受支持输入
- **WHEN** 执行 parser
- **THEN** 返回带 source/confidence/warnings 的标准 intent

### Requirement: SIA-020 Parser MUST support four input forms
系统 MUST 支持 composer action、slash 命令、skill codeblock、自然语言四类输入。

#### Scenario: Parse slash command
- **GIVEN** `/skill archive_brief:archive_extract {"conversationId":"x"}`
- **WHEN** parser 执行
- **THEN** 返回 matched=true 且解析出 skillKey/operation/args

### Requirement: SIA-030 Parser MUST protect ambiguous intents
系统 MUST 对高相近置信度候选返回 awaiting_selection。

#### Scenario: Ambiguous natural language
- **GIVEN** 输入同时匹配多个 skill 且分差 < 0.10
- **WHEN** parser 执行
- **THEN** 返回 matched=false 且 status=awaiting_selection

### Requirement: SIA-040 Parser integration MUST not break chat protocol
系统 MUST 在 chat 前置 parser 后保持现有流协议兼容。

#### Scenario: Chat protocol compatibility
- **GIVEN** 解析启用
- **WHEN** 调用 `/v1/agent/chat?format=vercel-ai`
- **THEN** `conversation.created` 与 `tool.awaiting_input` 事件不回归

### Requirement: SIA-050 Parse debug MUST return parse errors as 400
系统 MUST 以结构化 400 返回 parser 错误，而非 500。

#### Scenario: Invalid debug payload
- **GIVEN** 非法 parse debug 输入
- **WHEN** 调用 `POST /v1/skills/parse:debug`
- **THEN** 返回 `400 skill_parse_failed`

### Requirement: SIA-060 Parser results MUST be auditable
系统 MUST 记录 parser 结果用于回溯误判。

#### Scenario: Audit parse result
- **GIVEN** 任一 chat 输入触发 parser
- **WHEN** parser 返回 intent
- **THEN** 在 `skill_invocation_logs` 可查询到 traceId 与匹配结果

