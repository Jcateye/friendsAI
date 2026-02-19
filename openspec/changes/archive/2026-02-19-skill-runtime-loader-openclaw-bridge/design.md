## Context

OpenClaw 双栈架构要求 runtime 可按租户和 agentScope 装载技能；本地 engine 也需要统一 desired hash 语义保证行为可预测。

## Decisions

### Decision 1: Desired hash 驱动
- 计算目标技能集序列化后哈希。
- 与 applied hash 相同则 skipped。

### Decision 2: Reconcile 原子流程
- resolve bindings -> build plan -> export snapshot -> reload runtime -> persist mount status。

### Decision 3: 失败策略
- OpenClaw reload 失败返回 failed 状态。
- 若调用方允许 fallback，交由上层 engine policy 回退 local。

## Contracts

- `POST /v1/skills/runtime/reconcile`
- `SkillRuntimePlan { desiredHash, skills, loadActions, unloadActions }`

## Edge Cases

- 绑定禁用后 active 会话不中断，仅在下一次 run 切新 hash。
- 导出目录不存在时自动创建。

## Security

- runtime reconcile 在生产环境默认限制 admin。
- OpenClaw token 不落日志。
