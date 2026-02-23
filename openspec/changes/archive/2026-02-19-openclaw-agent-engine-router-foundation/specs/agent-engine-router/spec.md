## ADDED Requirements

### Requirement: AER-010 Agent runtime MUST provide a unified engine interface
系统 MUST 定义统一引擎接口，使 chat 与 run 可以通过同一抽象执行。

#### Scenario: Interface is available for both operations
- **GIVEN** server 启动并加载 agent 模块
- **WHEN** 代码路径调用 chat 或 run
- **THEN** 调用方可通过统一 `IAgentEngine` 契约执行而无需依赖具体实现类

### Requirement: AER-020 Controller MUST route chat and run via engine router
系统 MUST 让 `/v1/agent/chat` 与 `/v1/agent/run` 通过 `EngineRouter` 进行引擎决策。

#### Scenario: Default routing keeps existing behavior
- **GIVEN** `AGENT_ENGINE_DEFAULT=local`
- **WHEN** 调用 `POST /v1/agent/chat` 或 `POST /v1/agent/run`
- **THEN** 请求应命中 LocalEngine 且外部响应语义保持不变

### Requirement: AER-030 Router MUST support fallback to local engine
系统 MUST 在非 local 引擎不可用时支持 fallback 到 local（按策略生效）。

#### Scenario: Non-local route falls back to local
- **GIVEN** 路由决策目标为 `openclaw` 且 fallback policy 允许 `local`
- **WHEN** openclaw 引擎不可用或执行失败
- **THEN** router MUST 回退到 LocalEngine 并返回完整结果/错误终态
