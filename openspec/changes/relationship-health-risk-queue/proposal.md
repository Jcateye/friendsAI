## Why

虽然系统已有 `relationship_health_snapshot` 与 `relationship_debt_item` 实体，但缺少可用的“评分 + 风险队列”产品接口，无法支撑主动关系运营场景。

## Intent

落地 `Health Score + Risk Queue` 能力：以规则信号和 LLM 信号混合评分，输出可解释的高风险联系人队列与行动建议。

## Scope

- 新增 `GET /v1/relationships/health`。
- 新增 `GET /v1/relationships/risk-queue`。
- 支持 `forceRecompute` 触发重算并写入 snapshot。
- 支持用户级阈值与权重配置。

## Non-Goals

- 不做复杂图谱可视化。
- 不在本阶段做自动消息推送。

## What Changes

- 新增 `RelationshipHealthService` 负责混合评分。
- 复用 `relationship_health_snapshot` 与 `relationship_debt_item`。
- 增加 API 合同与前端类型扩展。

## Risks

- 评分公式初版可能不稳定，需持续校准。
- LLM 信号不可用时要有规则分降级。

## Rollback

- 关闭 `RELATIONSHIP_HEALTH_ENABLED`，保留现有 action 建议能力。

## Acceptance

- 同输入数据在同配置下评分稳定。
- 风险队列输出包含 `factors[]` 可解释字段。
- `forceRecompute=true` 能写入新 snapshot 并可查询。
