## Why

当前行动建议分散在多个入口（行动页、联系人页、Agent 返回），用户很难稳定获取“今天最值得做的 3 件事”。同时洞察可解释性不足，缺少证据链与置信度展示，影响用户信任与执行率。

## Intent

实现 `Daily Action Digest`（in-app）与 `Contact Insight Traceability`（证据摘要+置信度+来源类型），将建议消费路径收敛为每日高价值行动清单，并增强洞察可追溯性。

## Scope

- 新增 `GET /v1/action-digest/today` 与 `POST /v1/action-digest/refresh`。
- 聚合 `network_action + contact_insight`，每日输出 top-3。
- 扩展 `ContactInsightOutput`：`evidenceChains[]`, `confidence`, `sourceRefs[]`。
- 前端联系人洞察面板展示证据摘要与来源。

## Non-Goals

- 不做 Feishu 推送版 digest。
- 不返回完整原始消息文本。
- 不改动 `POST /v1/agent/chat` 与 `POST /v1/agent/run` 边界。

## What Changes

- 新增实体：`daily_action_digests`, `daily_action_digest_items`。
- 新增模块：`action-digest`。
- 扩展 `contact_insight` 输出 schema 与前端类型。

## Risks

- top-3 评分策略初期可能与用户主观优先级不一致。
- 证据摘要生成不稳定会影响可解释性体验。

## Rollback

- 关闭 `DAILY_DIGEST_ENABLED` 与 `INSIGHT_TRACEABILITY_ENABLED` 即可回退。
- 保留旧版洞察渲染（无 evidence 字段时不报错）。

## Acceptance

- 同一用户同一天重复生成 digest 幂等（同 date 唯一）。
- `contact_insight` 响应中每条机会/风险/行动可映射至少一个 sourceRef。
- 前端可展示“证据摘要 + 置信度 + 来源类型”。
