# Feature: Agent V1 可执行闭环

## Summary

基于现有 Agent Runtime 基座，升级 `contact_insight` 和 `network_action` 两个核心能力，实现"建议生成 -> 用户确认 -> 执行 -> 结果回写"的完整闭环。

## Motivation

当前问题：
1. `contact_insight` 和 `network_action` 输出缺少优先级排序和可解释性
2. 缺少"建议->确认->执行->追踪"的数据流闭环
3. 工具确认执行链路部分仍是 mock，需要真实执行能力

产品目标：
- 把"弱关系转化为有效行动"的关系经营操作系统
- 每天给出少量高价值建议，追踪行动转化率

## Scope

### In Scope
1. **输出增强**：为 `contact_insight` 添加优先级评分、关系风险等级、原因标签
2. **输出增强**：为 `network_action` 添加时机原因、先给价值点、后续计划
3. **行为事件埋点**：新增 `agent_suggestion_*` 系列事件追踪
4. **数据实体**（新数据库 `friendsai_v3_gpt`）：
   - `relationship_health_snapshot`
   - `relationship_debt_item`
   - `action_outcome_log`
5. **飞书工具真实执行**：补全 `feishu.send_message` 真实执行逻辑
6. **每周简报**：行动完成率、回复率、推进率汇总

### Out of Scope
- V2 差异化能力（Timing Agent、Bridge Agent、Trust Maintenance Agent）
- 旧数据迁移（不触碰 `friendsai_v2`）
- 前端 UI 改造（本变更聚焦后端能力）

## Owner & Dependencies
- Owner: Backend Team
- Dependencies:
  - `agent-runtime-core-contracts`（已完成）
  - `agent-runtime-storage-cache`（已完成）
  - `agent-capability-contact-insight`（已完成）
  - `agent-capability-network-action`（已完成）

## Timeline
- 2026-02-10 ~ 2026-02-24（2周）

## Acceptance Criteria

1. **输出可解释性**
   - `contact_insight` 返回 `priority_score`、`reason_tags[]`、`relationship_risk_level`
   - `network_action` 返回 `timing_reason`、`value_first_suggestion`、`followup_plan`

2. **行为事件可追踪**
   - `agent_suggestion_shown`、`agent_suggestion_accepted`、`agent_message_sent`、`agent_message_replied`、`agent_followup_completed` 全部记录

3. **数据闭环**
   - 新数据库 `friendsai_v3_gpt` 创建成功
   - 三个新表结构正确并能读写

4. **工具真实执行**
   - `feishu.send_message` 可真实发送并记录状态

5. **每周简报**
   - 可查询用户近7天行动完成率、回复率、推进率

## Risks

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 提醒过多导致疲劳 | 用户体验下降 | 严格限量（每天≤3条）+ 价值排序 |
| 建议泛化像"鸡汤" | 采纳率低 | 每条建议绑定可验证信号 |
| 数据库变更影响主库 | 生产事故 | 严格使用 `friendsai_v3_gpt`，不碰 `friendsai_v2` |
| 飞书 API 变化 | 执行失败 | 做好降级（记录失败状态） |

## Rollback

1. 数据库回滚：删除 `friendsai_v3_gpt` 数据库（不影响 `friendsai_v2`）
2. 代码回滚：通过 Git revert 能力回退变更
3. 特性开关：通过环境变量控制新能力启用

## Non-Goals

- 不做关系图谱可视化
- 不做实时通知推送（仅 API 查询）
- 不做多租户/工作区隔离
- 不做旧数据迁移
