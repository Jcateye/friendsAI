## Context

系统已具备关系健康相关底层表，但未形成统一服务层和查询 API。

## Goals / Non-Goals

**Goals**
- 提供可查询的健康分与风险队列。
- 评分采用 `rule + llm` 混合，默认 `0.7/0.3`。
- 支持用户级阈值覆盖。

**Non-Goals**
- 不提供实时流式刷新。
- 不做跨用户比较榜单。

## Decisions

### Decision 1: 混合评分模型
- `finalScore = ruleScore * ruleWeight + llmScore * llmWeight`。
- 当 LLM 不可用时：`finalScore = ruleScore`。

### Decision 2: 风险等级
- `high`: score < 40
- `medium`: 40 <= score < 70
- `low`: score >= 70
- 用户可自定义阈值，缺省采用默认值。

### Decision 3: 接口语义
- `GET /v1/relationships/health`: 返回聚合统计 + top factors。
- `GET /v1/relationships/risk-queue`: 返回联系人级列表与建议。

## Contracts

`RelationshipHealthView`:
```ts
{
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: Array<{ key: string; weight: number; value: number; reason: string }>;
}
```

## Edge Cases

- 联系人无历史互动：score 下探但需标注 `insufficient_data`。
- 用户阈值配置缺失：使用默认阈值。
- snapshot 写入失败：不影响本次 API 返回（日志告警）。

## Security

- 严格按 `userId` 查询。
- 返回内容不含完整原始消息。

## Rollout / Rollback

1. 先上线只读查询。
2. 再启用 `forceRecompute` 写入。
3. 通过 flag 灰度开关。
