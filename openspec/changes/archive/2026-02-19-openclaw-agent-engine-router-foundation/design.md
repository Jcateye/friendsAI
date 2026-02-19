## Context

当前 `agent.controller` 直接依赖 `AgentOrchestrator` 与 `AgentRuntimeExecutor`。这使得执行链路与引擎策略耦合，无法满足 OpenClaw 分阶段接入所需的“可切换、可回退、可观测”要求。现有 Skills 层已支持 `engine=local|openclaw`，但 Agent 主链路尚无对应抽象。

## Goals / Non-Goals

**Goals:**
- 引入统一的引擎接口与路由决策，支持未来 local/openclaw 多引擎。
- 默认行为保持 local，不改变外部 API 和协议语义。
- 让 chat/run 都走同一 router 决策入口。

**Non-Goals:**
- 本阶段不启用 OpenClawEngine 流量。
- 不引入新的外部依赖或持久化模型。

## Decisions

### Decision 1: 新增 `agent/engines` 层并定义统一契约
- 方案：新增 `engine.interface.ts` 与 `engine.types.ts`，定义 `IAgentEngine`、`AgentEngineRequest`、`AgentEngineRunResult`、`RuntimeRouterDecision`。
- 备选：继续在 controller 层用条件分支调用旧服务。
- 结论：采用统一契约，避免 controller 演化为条件分发中心。

### Decision 2: 引入 `EnginePolicyResolver` + `EngineRouter`
- 方案：policy 解析与执行分离。
- 备选：在 router 内直接读取环境变量。
- 结论：分离后更利于后续引入 user/agent/capability 覆盖。

### Decision 3: `LocalEngine` 仅做包装，不改业务逻辑
- 方案：`LocalEngine.streamChat()` 调用 `AgentOrchestrator.streamChat()`，`LocalEngine.run()` 调用 `AgentRuntimeExecutor.execute()`。
- 备选：重写 local 执行链路。
- 结论：先保证无行为变化，降低回归风险。

### Decision 4: 兼容策略保持不变
- 保持 API 不变：`POST /v1/agent/chat`、`POST /v1/agent/run`。
- 保持协议不变：`conversation.created`、`tool.awaiting_input`、`agent.end` 事件语义不变。

## Contracts

### Internal Types
- `AgentEngineRequest`
- `AgentEngineRunResult`
- `RuntimeRouterDecision`
- `IAgentEngine`

### Config
- `AGENT_ENGINE_DEFAULT=local|openclaw`（默认 `local`）
- `AGENT_ENGINE_FALLBACK=local|none`（默认 `local`）

### API Compatibility
- 外部请求/响应 DTO 不变。
- router 决策仅影响内部调用路径。

## Edge Cases

1. 配置非法值：fallback 到 `local` 并记录 warning。
2. engine 解析为 openclaw 但实例不可用：按 fallback policy 回到 local。
3. chat 中断：仍需发送 `agent.end`（失败）保证前端状态机闭环。

## Security

1. router 不接收客户端任意 engine 参数（避免越权切引擎）。
2. 引擎选择策略仅来自可信配置/服务端策略。

## Risks / Trade-offs

- [Risk] controller 改造影响既有测试桩 → Mitigation: 增加 router 层单测，并保持 LocalEngine 直透行为。
- [Risk] 新抽象增加一次调用层级 → Mitigation: 本层仅内存路由，开销可忽略。

## Rollout-Rollback

### Rollout
1. 增加 engines 目录与 LocalEngine。
2. 注入 router，但默认决策 local。
3. 控制器切到 router。
4. 跑回归测试并观测指标。

### Rollback
1. 回滚 controller 到旧直连路径。
2. 保留 engines 文件不启用，不影响线上行为。

## Open Questions

1. user/agent/capability 覆盖策略落库存储位置（env vs DB）将在下一 change 决策。
2. OpenClawEngine 的错误分类是否复用 skills 现有 taxonomy 待统一。
