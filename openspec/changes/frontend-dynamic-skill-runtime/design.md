## Context

前端现有 `ConversationDetailPage` 与 `SkillPanel` 的技能入口为固定列表，不能响应后端版本/绑定变化。

## Decisions

### Decision 1: 双轨兼容
- 动态 catalog 优先。
- 拉取失败或为空时使用硬编码 fallback。

### Decision 2: Composer 上报
- `useAgentChat` 支持 `composer.skillActionId` 与 `rawInputs`。
- 服务端 parser 读取该字段做高优先级解析。

### Decision 3: 最小侵入
- 保持 `useAgentChat` 单 runtime。
- 保持 `parseVercelAgentStream` 兼容，避免协议层改动。

## Contracts

- 新增前端 API：`GET /v1/skills/catalog`
- 新增类型：`SkillCatalogItem`、`SkillActionOptionV2`

## Rollout

- `SKILL_DYNAMIC_ACTIONS_ENABLED=true|false`
