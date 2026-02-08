# program-governance

## Purpose

定义 Agent 模板引擎化 Program 的并行治理与交付门禁。

## Requirements

### Requirement: GOV-010 Program MUST split into modular OpenSpec changes
Program SHALL 将模板引擎化改造拆分为总览 + 模块化 changes，以支持多人并行开发。

#### Scenario: Modular changes are present
- **GIVEN** Program 进入文档阶段
- **WHEN** 检查 `openspec/changes/`
- **THEN** 至少存在 1 个总览 change 与 7 个实现 change

### Requirement: GOV-020 Shared files MUST be modified by bridge module only
Program MUST 限制共享入口与 legacy bridge 文件的修改归属，避免并行冲突。

#### Scenario: Ownership audit
- **GIVEN** 多个 change 并行推进
- **WHEN** 审计 tasks 与 design 的路径边界
- **THEN** 共享入口文件仅在 `agent-api-run-legacy-bridge` change 中声明修改

### Requirement: GOV-030 Program MUST freeze docs before implementation
Program MUST 在实现前完成 proposal/design/specs/tasks 四类文档并冻结。

#### Scenario: Go/No-Go for implementation
- **GIVEN** 时间到达 2026-02-12
- **WHEN** 进行文档评审
- **THEN** 所有 change 文档完整且通过评审后，才允许开始实现
