# Feature: Agent Action Cards Enhancement - Relationship-Driven Actions

## Summary

增强 Agent 输出结构，从「信息型洞察」升级为「可执行行动卡」：
- `contact_insight` 新增 `relationshipState`、`momentSignals`、`actionCards`
- `network_action` 新增三队列分桶（`urgentRepairs`、`opportunityBridges`、`lightTouches`）+ `weeklyPlan`
- 新增 `POST /v1/agent/feedback` 反馈接口，形成行为学习闭环

## Motivation

当前 Agent 能力主要是「生成洞察」，尚未形成强行为闭环。关键问题：

1. **缺少行为反馈学习环**：建议被接受/编辑/忽略后，无系统化回写用于策略优化
2. **建议结构偏"信息型"**：缺少 `why now`（为什么此刻）与 `低心理负担下一步`
3. **缺少关系动量判断层**：主要用最后交互和概览聚合，难判断真实关系状态变化
4. **可执行深度不足**：有建议列表，但没有强约束的 action card（成本/风险/收益/置信度）

## Proposed Solution

### 阶段一：契约与数据层（Week 1-2）

1. 扩展 `contact_insight` 输出 schema：
   - `relationshipState`: `warming|stable|cooling|at_risk`
   - `relationshipType`: `business|friend|mixed`
   - `momentSignals[]`: 包含 `type`、`score`、`whyNow`、`expiresAtMs`
   - `actionCards[]`: 包含 `goal`、`actionType`、`draftMessage`、`effortMinutes`、`confidence`、`riskLevel`、`requiresConfirmation`

2. 扩展 `network_action` 输出 schema：
   - `queues`: `urgentRepairs`、`opportunityBridges`、`lightTouches`
   - `weeklyPlan[]`: 每日计划视图

3. 新增 `POST /v1/agent/feedback` 接口：
   - 接收 `runId`、`agentId`、`actionId`、`status`、`reasonCode`、`editDistance`、`executedAtMs`

4. `/v1/agent/run` 输入新增可选字段：
   - `intent`: `maintain|grow|repair`
   - `relationshipMix`: `business|friend|mixed`
   - `timeBudgetMinutes`: 时间预算

### 阶段二：决策与生成层（Week 3-4）

1. 实现评分函数（0-100）：
   ```
   priority = 0.35*recencyGap + 0.25*reciprocityGap + 0.20*importance + 0.10*momentWindow + 0.10*replyLikelihood
   ```

2. 分桶策略：
   - `>=75`: `urgentRepairs`
   - `45~74`: `opportunityBridges`
   - `<45`: `lightTouches`

3. 构建 `actionCards` 生成器（含 `whyNow` / `effort` / `risk`）

4. 引入低数据量 fallback 策略（避免模型"编故事"）

### 阶段三：前端体验层（Week 5）

1. 联系人页新增 action cards 区块
2. 行动页新增三队列 + 每周计划视图
3. 增加"接受/编辑/忽略/执行"反馈交互

### 阶段四：实验与优化（Week 6）

1. A/B：旧洞察模式 vs action-card 模式
2. 统计跟进完成率与 dismiss 原因分布
3. 调整 prompt 与评分权重

## Alternatives Considered

1. **全自动化外发**：被否决，信任与自然感风险高
2. **纯提醒模式**：被否决，无法解决"认知负担外包"核心需求
3. **复杂配置系统**：被否决，增加用户学习成本

## Impact

- [x] API changes（向后兼容扩展）
- [ ] Database migrations（需新增 `agent_feedback` 表）
- [ ] Breaking changes（无，新增字段均为可选）

## Owner & Dependencies

- Owner: Backend Team + Frontend Team
- Dependencies:
  - `agent-capability-contact-insight`（已完成）
  - `agent-capability-network-action`（已完成）
  - `agent-runtime-core-contracts`

## Timeline

- Week 1-2: 契约与数据层
- Week 3-4: 决策与生成层
- Week 5: 前端体验层
- Week 6: 实验与优化

## Acceptance Criteria

1. **契约兼容**：新字段新增后，旧调用方不崩溃
2. **评分逻辑**：分桶边界值（44/45/74/75）行为正确
3. **回退策略**：数据稀疏场景不输出高置信度动作
4. **闭环测试**：`run -> action -> feedback` 全链路可追踪
5. **确认策略**：`requiresConfirmation=true` 的动作不能被自动执行
6. **验收门槛**：
   - 跟进完成率较基线提升 >= 20%
   - dismiss 原因中 `too_generic + tone_off` 占比 < 15%
   - `edited -> executed` 转化率连续两周上升

## Risks & Mitigations

| 风险 | 应对 |
|------|------|
| 过度自动化导致信任下滑 | 保持默认"建议 + 确认" |
| 提醒疲劳 | 引入 `timeBudgetMinutes`，限制每周动作总量 |
| 建议模板化、人格感弱 | 强制个性化证据锚点 + 可编辑草稿 |
| 偏商务导致朋友场景体验下降 | `relationshipMix` 默认 mixed，语气策略分流 |
