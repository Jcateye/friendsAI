## Context

`/v1/agent/run` 负责结构化输出与业务流程下游消费，稳定性要求高于 chat。run 迁移必须先能力灰度，再逐步扩展，且每一步都可回滚。

## Goals / Non-Goals

**Goals:**
- 支持 capability 级引擎策略。
- 先完成 `title_summary`、`contact_insight` 迁移。
- 保持 schema、缓存、写入语义一致。

**Non-Goals:**
- 本阶段不迁移所有 capability。
- 不变更 API 合同。

## Decisions

### Decision 1: Capability-first rollout
- 顺序：`title_summary` -> `contact_insight` -> 其他候选。
- 理由：两者风险可控、依赖链相对清晰。

### Decision 2: fallback 默认开启
- run 命中 openclaw 失败时默认 fallback 到 local。
- 理由：结构化能力优先保障可用性。

### Decision 3: 一致性优先于性能
- 迁移期间优先满足输出与落库合同一致。
- 性能优化（如首包延迟）延后到治理阶段。

## Contracts

- `POST /v1/agent/run` request/response 不变。
- 输出 validation 继续由现有 schema 校验。
- fallback 场景需记录 `engine` 与 `fallbackReason`。

## Edge Cases

1. openclaw 返回非 JSON：必须进入校验失败或 fallback。
2. fallback 后 cached 标记必须正确。
3. 同一 runId 不应重复写入关键业务实体。

## Security

1. 写操作闸门仍由 FriendsAI 侧控制，不下放 OpenClaw。
2. 不透出内部网关敏感错误细节给客户端。

## Risks / Trade-offs

- [Risk] 双栈行为分歧造成难排障 → Mitigation: 增加 local/openclaw 对照测试。
- [Risk] fallback 增加延迟 → Mitigation: 仅在必要错误触发，保留超时上限。

## Rollout-Rollback

### Rollout
1. capability 策略配置接入 router。
2. `title_summary` 小流量灰度。
3. `contact_insight` 小流量灰度。

### Rollback
1. capability 策略回退 local。
2. 保留代码但关闭 openclaw run 路由。

## Open Questions

1. `archive_brief/network_action` 的迁移门槛指标定义（失败率/一致性阈值）。
