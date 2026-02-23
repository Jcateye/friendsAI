## MODIFIED Requirements

### Requirement: Tool confirmation remains mandatory under dual-engine runtime
系统 MUST 在双栈运行时继续强制写/发类工具走确认流，不允许 engine 绕过确认闸门。

#### Scenario: Write tool cannot bypass confirmation
- **GIVEN** 请求命中 openclaw 引擎并触发写工具
- **WHEN** 工具执行前进入审批阶段
- **THEN** 若用户未确认，写工具 MUST 不执行
