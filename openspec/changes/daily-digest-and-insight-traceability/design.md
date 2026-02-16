## Context

现有 `network_action` 与 `contact_insight` 已可通过 `/v1/agent/run` 获取结构化输出，但缺乏“日视角聚合层”和“证据摘要合同”。

## Goals / Non-Goals

**Goals**
- 以 in-app 方式提供每日 top-3 行动。
- 为 contact insight 输出增加可追溯元数据。
- 保持 API 入口边界不变。

**Non-Goals**
- 不引入推送系统。
- 不返回消息原文长文本。

## Decisions

### Decision 1: Digest 按“每天每用户”落库
- `daily_action_digests(userId, digestDate)` 唯一。
- `refresh` 支持强制重算并覆写 items。

### Decision 2: 评分融合
- 初版评分：`networkActionPriority + contactInsightPriority + recencyBoost`。
- 保底只返回 1~3 条，不补噪声建议。

### Decision 3: Evidence 摘要合同
- 每条 insight item 增加：
  - `confidence: number(0~1)`
  - `sourceRefs: [{type, reference}]`
  - `evidenceChains: [{summary, sourceType, sourceRef}]`

## Contracts

- `GET /v1/action-digest/today`
  - response: `{ date, generatedAt, items: DigestItem[] }`
- `POST /v1/action-digest/refresh`
  - response: 同上，强制重算

## Edge Cases

- 无可用建议：返回空 `items`，但保留 digest 记录。
- 上游 Agent 失败：降级为已有缓存 digest。
- insight 无 citations：允许 `sourceRefs=[]` 且 `confidence` 降低。

## Security

- `evidenceChains.summary` 严格截断，禁止回传完整原始聊天内容。
- 所有 digest 数据按 `userId` 隔离。

## Rollout / Rollback

1. 后端先上线 API 与实体。
2. 前端在有 evidence 字段时渐进展示。
3. 关闭 flags 可回退到旧行为。
