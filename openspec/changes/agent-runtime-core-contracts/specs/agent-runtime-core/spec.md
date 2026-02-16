# agent-runtime-core

## Purpose

定义 Agent Runtime 核心契约与执行骨架。

## Requirements

### Requirement: CORE-010 Runtime MUST load agent definitions from filesystem
系统 SHALL 从代码库中的 Agent 定义目录加载 JSON、模板和 schema 资产。

#### Scenario: Load definition bundle
- **GIVEN** `agentId=contact_insight`
- **WHEN** 调用 definition registry
- **THEN** 返回包含 `agent.json`、templates、schemas 的完整 bundle

### Requirement: CORE-020 Runtime MUST render templates with defaults and warnings
系统 MUST 在模板变量缺失时记录 warning，并使用 defaults.json 进行注入。

#### Scenario: Missing variable fallback
- **GIVEN** 模板变量 `{{contact.company}}` 缺失
- **WHEN** 执行 prompt 渲染
- **THEN** 结果包含 default 值，且 warnings 包含缺失变量路径

### Requirement: CORE-030 Runtime MUST enforce output validation
系统 MUST 对 LLM 输出执行 schema 校验，失败时返回错误并中止。

#### Scenario: Output schema validation failure
- **GIVEN** 输出不满足 `output.schema.json`
- **WHEN** 执行 validator
- **THEN** 返回 `output_validation_failed` 并附错误详情
