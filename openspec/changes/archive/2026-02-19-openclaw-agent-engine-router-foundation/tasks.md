## 1. Contracts 与路由骨架

- [x] 1.1 [AER-010] 新增 `agent/engines/engine.interface.ts` 与 `engine.types.ts`（Done When: `IAgentEngine`/`RuntimeRouterDecision` 可被编译引用）。
- [x] 1.2 [AER-010][AER-020] 新增 `LocalEngine`、`EnginePolicyResolver`、`EngineRouter`（Done When: router 可返回 local 决策并调用 LocalEngine）。

## 2. Controller 接线与兼容

- [x] 2.1 [AER-020] `agent.controller` 的 chat/run 改为通过 router 调用（Done When: 外部 API 输入输出结构无变更）。
- [x] 2.2 [AER-030] 增加 fallback 到 local 的路由行为（Done When: openclaw 不可用时仍返回完整终态）。

## 3. 测试与验收

- [x] 3.1 [AER-020] 更新/新增单测覆盖 router 路径（Done When: `agent.controller.spec.ts` 通过）。
- [x] 3.2 [AER-030] 增加 fallback 场景测试（Done When: 非 local 引擎失败时 fallback 用例通过）。
- [x] 3.3 [AER-010][AER-020][AER-030] 运行 OpenSpec 严格校验（Done When: `openspec validate openclaw-agent-engine-router-foundation --type change --strict --json` 通过）。
