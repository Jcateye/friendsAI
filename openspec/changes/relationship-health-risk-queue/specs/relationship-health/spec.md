# relationship-health

## ADDED Requirements

### Requirement: RHR-010 System MUST compute hybrid health score
系统 MUST 计算混合健康分（rule + llm）。

#### Scenario: Hybrid score calculation
- **GIVEN** 存在规则评分与 LLM 评分
- **WHEN** 计算关系健康分
- **THEN** 按配置权重输出稳定 final score

### Requirement: RHR-020 System MUST provide explainable risk factors
系统 MUST 提供可解释的风险因素。

#### Scenario: Risk factors in queue item
- **GIVEN** 联系人进入风险队列
- **WHEN** 返回队列数据
- **THEN** 包含 `factors[]` 与原因说明

### Requirement: RHR-030 System MUST support recompute and snapshot persistence
系统 MUST 支持重算并持久化快照。

#### Scenario: Force recompute
- **GIVEN** 请求 `forceRecompute=true`
- **WHEN** 调用关系健康 API
- **THEN** 写入新的 snapshot 记录

### Requirement: RHR-040 System MUST expose risk queue retrieval API
系统 MUST 暴露风险队列查询 API。

#### Scenario: Fetch risk queue
- **GIVEN** 用户已登录
- **WHEN** 调用 `GET /v1/relationships/risk-queue`
- **THEN** 返回按风险优先级排序的联系人列表

### Requirement: RHR-050 System MUST support user-scoped thresholds
系统 MUST 支持用户级阈值配置。

#### Scenario: User threshold override
- **GIVEN** 用户提供阈值覆盖配置
- **WHEN** 计算风险等级
- **THEN** 按用户配置分层而非全局默认值
