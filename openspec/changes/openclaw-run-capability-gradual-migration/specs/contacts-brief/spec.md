## MODIFIED Requirements

### Requirement: Contacts brief structured output remains stable during engine migration
系统 MUST 在 run 引擎迁移过程中维持联系人相关结构化输出与业务写入语义稳定。

#### Scenario: Brief-related downstream remains unchanged
- **GIVEN** brief 相关下游仍消费既有结构字段
- **WHEN** run capability 局部迁移到 openclaw
- **THEN** 下游不需要修改字段映射即可持续工作
