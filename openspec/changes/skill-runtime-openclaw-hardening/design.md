## Context

当前 `friendsAI` skills runtime 已具备 reconcile 主链路与 OpenClaw reload 调用，但存在三个工程风险：
1. 卸载语义缺失：`unloadActions` 固定空数组，无法表达 binding disable 后的目标差异。
2. 网关调用脆弱：单次 `fetch`，无 timeout/retry/error 分类。
3. 运维可观测不足：mount details 缺少 trace、阶段耗时与网关回执摘要。

同时，外部仓 `ClawFriends` 目前不存在 `POST /skills/reload` HTTP 端点，导致 `friendsAI` 的 OpenClaw 同步契约无法稳定联调。

约束：
- 本轮语义锁定为 control-plane-only（校验+回执），不承诺网关执行层强语义卸载。
- OpenSpec 仅在 `friendsAI` 维护；`ClawFriends` 作为外部实现依赖。

## Goals / Non-Goals

**Goals:**
- 在 `friendsAI` 侧实现 SRH-010/020/030/040/050：卸载计划、重试超时、策略化失败、观测字段、v2 契约。
- 在 `ClawFriends` 侧新增 `/skills/reload` 鉴权 HTTP 端点并返回标准控制面回执。
- 通过配置开关支持协议回退（v2 -> v1）与策略切换（strict/fallback）。

**Non-Goals:**
- 不在本轮实现网关运行态 skill 强语义生效（load/unload 对运行时能力的真实拦截）。
- 不新增数据库结构，不修改 `skill_runtime_mounts` 表字段。
- 不重构所有 skills controller 的 `any` body；本轮仅收敛 `runtime/reconcile`。

## Decisions

### Decision 1: 引入 v2 reload 协议并保持 v1 兼容
- `friendsAI` 新增 `SKILL_OPENCLAW_RELOAD_PROTOCOL`（默认 v2），调用 `/skills/reload` 时可发送 v2 结构：
  - `tenantId`, `agentScope`, `desiredHash`, `skills`, `loadActions`, `unloadActions`, `traceId`, `protocolVersion`
- 若配置为 v1，则降级为旧载荷（保留兼容回退路径）。

**Alternatives considered**
- 仅保留 v1：无法承载卸载动作与审计 trace，不满足 SRH-050。
- 直接移除 v1：联调风险高，回滚复杂。

### Decision 2: 卸载计划基于“上次已应用快照 vs 本次 desired”
- 将已应用技能快照写入 `mount.details.appliedSkills`。
- buildPlan 时读取上次 `appliedSkills` 计算差异：
  - previous 存在而 current 不存在 => `unload:<key>@<version>`
- `loadActions` 改为差异增量（新增/版本变化的目标项），`skills` 仍保留完整 desired 集合作为同步上下文。

**Alternatives considered**
- 从其他表实时反推上次状态：实现复杂且易受历史数据不一致影响。
- 始终全量 load/unload：语义噪声大，不利于审计。

### Decision 3: reload 调用使用“超时 + 有限重试 + 错误分类”
- timeout：使用 `AbortController` 控制每次请求超时。
- retry：仅对 timeout/网络异常/5xx 重试；4xx 视为不可重试。
- attempts 记录到 mount details，最终失败保留最后错误摘要。

**Alternatives considered**
- 引入第三方重试库：当前场景简单，内建实现更轻量。
- 无限重试：会放大故障与阻塞。

### Decision 4: engine policy 默认 strict，fallback 仅标记降级
- `strict_openclaw`：reload 失败 => `failed`。
- `fallback_local`：reload 失败 => `applied` + `degraded=true` + `gatewaySummary.fallback=true`。
- 本轮 fallback 为“控制面降级语义”，不触发真实运行时重路由。

### Decision 5: ClawFriends `/skills/reload` 采用控制面确认模式
- 新增受网关鉴权保护的 `POST /skills/reload`。
- 行为：校验请求结构，返回
  - `ok=true`
  - `executionMode="control-plane-only"`
  - `tenantId`/`agentScope`/`desiredHash`/`acceptedAtMs`/`summary`
- 先解决契约稳定与审计闭环，再在后续 change 扩展为强语义执行。

## Contracts

### friendsAI -> ClawFriends（v2）
- Endpoint: `POST {OPENCLAW_GATEWAY_URL}/skills/reload`
- Auth: `Authorization: Bearer ${OPENCLAW_GATEWAY_TOKEN}`（可空）
- Request:
  - `tenantId: string`
  - `agentScope: string`
  - `desiredHash: string`
  - `skills: Array<{key, version, checksum, exportPath}>`
  - `loadActions: string[]`
  - `unloadActions: string[]`
  - `traceId: string`
  - `protocolVersion: "v2"`
- Response:
  - `ok: boolean`
  - `executionMode: "control-plane-only"`
  - `tenantId: string`
  - `agentScope: string`
  - `desiredHash: string`
  - `acceptedAtMs: number`
  - `summary: Record<string, unknown>`

### friendsAI runtime mount details
`skill_runtime_mounts.details` 扩展字段：
- `traceId: string`
- `phaseDurationsMs: { resolve, buildPlan, persistPending, reload, persistFinal }`
- `reloadAttempts: number`
- `gatewaySummary: { statusCode?, executionMode?, acceptedAtMs?, fallback?, responseSnippet? }`
- `appliedSkills: Array<{ key, version, checksum }>`

## Edge Cases

- 目标 hash 未变化时：状态 `skipped`，仍刷新 `traceId` 与阶段耗时（不调用网关）。
- `SKILL_OPENCLAW_SYNC_ENABLED=false`：不调用网关，视为控制面跳过；strict/fallback 不触发。
- `OPENCLAW_GATEWAY_URL` 缺失但需要同步：抛错并按 policy 处理。
- 网关返回 200 但 body 非 JSON：记录 `gatewaySummary.responseSnippet`，仅在 strict 下失败。

## Security

- `OPENCLAW_GATEWAY_TOKEN` 不写日志，不写 mount details。
- `traceId` 为内部追踪标识，不包含 PII。
- `/skills/reload` 仅接受网关既有认证机制授权请求，拒绝匿名调用。

## Risks / Trade-offs

- [Risk] control-plane-only 与运行时真实行为不一致 → Mitigation: 在响应中固定 `executionMode=control-plane-only`，避免误判。
- [Risk] 重试参数配置不当导致延迟放大 → Mitigation: 采用固定上限（默认 3 次）与可观测 attempts。
- [Risk] 旧 mount details 无 `appliedSkills` 导致首次无法计算差异 → Mitigation: 回退为空快照，仅从下一次开始稳定计算。

## Migration Plan

1. 先部署 `ClawFriends`：上线 `/skills/reload` 控制面端点。
2. 再部署 `friendsAI`：默认 `SKILL_OPENCLAW_RELOAD_PROTOCOL=v2`。
3. 观察 `skill_runtime_mounts.details.gatewaySummary.executionMode` 与失败率。
4. 如出现兼容问题：将 `SKILL_OPENCLAW_RELOAD_PROTOCOL` 回切 v1。

## Rollback

- 配置级回滚：`SKILL_OPENCLAW_RELOAD_PROTOCOL=v1`。
- 策略级回滚：保持 `SKILL_RUNTIME_ENGINE_POLICY=strict_openclaw` 避免误报 applied。
- 无 DB migration，回滚不涉及 schema 变更。

## Open Questions

- 强语义执行阶段是否继续沿用 `/skills/reload`，还是拆分 `/skills/apply` 与 `/skills/plan`。
- control-plane-only 响应 `summary` 的字段标准是否需要在后续对外文档固定。
