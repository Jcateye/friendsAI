
# FriendsAI Agent 市场调查、产品设计与实现计划（2026-02-10）

## 0. 文档目的

本文件用于沉淀当前阶段对 FriendsAI「人脉管理 / 朋友关系维护」Agent 的三部分内容：

1. **市场调查结论**（为什么这个方向成立）
2. **产品与能力设计**（Agent 怎么贴合人性与真实行为）
3. **实现计划**（后续可直接执行的工程计划）

定位：先做决策完整（decision-complete）文档，后续再进入编码阶段。

---

## 1. 范围与默认前提（本次已确认）

### 1.1 市场切入

- 优先路线：**专业人脉 B2C**（高关系密度个人用户）
- 关系范围：**商务 + 朋友混合**（不是纯商务 CRM，也不是纯情感陪伴）
- 执行方式：**建议 + 一键确认**（默认不全自动外发）

### 1.2 成功定义

- 主指标（North Star）：**跟进完成率**
  - 定义：`执行完成的建议行动数 / 生成的建议行动数`
- 副指标：
  - `D7 / D30 活跃留存`
  - `dismiss 原因中“太泛/不自然/时机不对”占比`

---

## 2. 当前系统现状（基于仓库事实）

当前 Agent 能力已经具备可用基础，但主要是「生成洞察」，尚未形成强行为闭环。

### 2.1 已有能力

- `contact_insight`: 单联系人洞察（机会/风险/建议/开场）
- `network_action`: 全联系人层面的跟进与行动清单
- `archive_brief`: 会话归档提取与会前简报
- `title_summary`: 对话标题摘要

### 2.2 现状优势

- 架构上已支持统一入口（`/v1/agent/run`）
- 已有缓存、schema 校验、模板化 prompt、snapshot 能力
- 前端已有洞察卡片与行动页的基础承载位

### 2.3 关键缺口

1. **缺少行为反馈学习环**
   - 当前建议被用户接受/编辑/忽略后，没有系统化回写用于策略优化。
2. **建议结构偏“信息型”**
   - 缺少 `why now`（为什么此刻）与 `低心理负担下一步`。
3. **缺少关系动量判断层**
   - 目前主要用最后交互和概览聚合，难判断真实关系状态变化。
4. **可执行深度不足**
   - 有建议列表，但没有强约束的 action card（成本/风险/收益/置信度）。

---

## 3. 市场调查结论（为什么有机会）

> 重点不是“大家有没有通讯录”，而是“大家有没有持续完成高质量关系动作”。

### 3.1 需求端

- 现代用户普遍处于“关系负债”状态：知道该联系谁，但无法稳定执行。
- 用户真正愿意付费的，不是记录工具，而是：
  - 帮我判断时机
  - 帮我降低开口成本
  - 帮我用更少时间完成更高质量跟进

### 3.2 竞争端

关系管理赛道已有玩家，说明需求存在；但大多在两端：

1. **管理工具型**：信息整理强、行为改变弱
2. **自动化工具型**：效率高、信任与自然感风险高

FriendsAI 可走中间路径：

- **行为洞察 + 人在回路确认 + 低打扰执行**

### 3.3 可验证的市场命题（当前阶段）

如果 Agent 能把建议改造成高质量行动卡（时机 + 证据 + 草稿 + 一键确认），则：

- 跟进完成率会上升
- 用户主观“社交负担”会下降
- 产品的持续使用和付费意愿会更稳

---

## 4. 人性洞察与隐秘联系（核心价值点）

### 4.1 隐秘点 A：关系衰减并非“忘记”，而是“错过自然窗口”

- 表象：很久没联系
- 本质：缺少“现在联系合理吗”的确定性
- 产品转化：建议必须输出 `whyNow + windowTTL`

### 4.2 隐秘点 B：弱关系是机会入口，强关系是信任底盘

- 弱关系：更可能带来新信息、新机会
- 强关系：更可能在关键时刻提供支持
- 产品转化：行动池要分层，而不是单一“久未联系排序”

### 4.3 隐秘点 C：用户追求效率，但反感“社交机械化”

- 表象：想要 AI 帮忙发
- 本质：害怕失去真实感、边界感
- 产品转化：默认可编辑草稿、保留个体语气、强确认外发

### 4.4 隐秘点 D：真正高价值不是提醒本身，而是认知负担外包

- 表象：提醒很多
- 本质：我依然不知道先做什么、怎么开口
- 产品转化：输出必须是“可做”的下一步，而不是“可看”的分析

---

## 5. Agent 产品设计（目标形态）

### 5.1 设计原则

1. **Action-first**：建议必须落地为可执行动作
2. **Why-now**：每条建议必须回答“为什么现在做”
3. **Low-friction**：一步确认可执行，执行前可编辑
4. **Traceable**：每条建议可追溯证据来源
5. **Human-in-the-loop**：外发动作默认确认

### 5.2 三类行动能力（MVP v1）

#### A. Keep Warm（保温）

- 目标：防止关系自然降温
- 典型动作：轻触达、节日/事件型问候、低成本互动

#### B. Unlock Opportunity（机会放大）

- 目标：把潜在合作/引荐机会从“知道”变“行动”
- 典型动作：桥接建议、资源交换建议、会前精准话题

#### C. Repair Drift（关系修复）

- 目标：修复已经变冷但价值高的关系
- 典型动作：体面复联脚本、背景承接、风险规避话术

### 5.3 输出结构升级（以 action card 为核心）

每条卡片至少包含：

- `goal`: maintain / grow / repair
- `whyNow`: 当前触发理由
- `evidence`: 关联数据点（事件/事实/最近对话）
- `draftMessage`: 可编辑草稿
- `effortMinutes`: 预估耗时
- `riskLevel`: low / medium / high
- `confidence`: 0-1
- `requiresConfirmation`: 默认 true

---

## 6. 技术设计（在当前架构上的增量改造）

## 6.1 API 与类型变更（向后兼容）

### A) `contact_insight` 输出新增字段

```json
{
  "relationshipState": "warming|stable|cooling|at_risk",
  "relationshipType": "business|friend|mixed",
  "momentSignals": [
    {
      "type": "event_window|recency_gap|reciprocity_gap",
      "score": 0,
      "whyNow": "string",
      "expiresAtMs": 0
    }
  ],
  "actionCards": [
    {
      "actionId": "string",
      "goal": "maintain|grow|repair",
      "actionType": "message|invite|intro|note",
      "draftMessage": "string",
      "effortMinutes": 10,
      "confidence": 0.78,
      "riskLevel": "low|medium|high",
      "requiresConfirmation": true
    }
  ]
}
```

### B) `network_action` 输出新增字段

```json
{
  "queues": {
    "urgentRepairs": [],
    "opportunityBridges": [],
    "lightTouches": []
  },
  "weeklyPlan": [
    {
      "day": "Mon",
      "maxMinutes": 30,
      "actions": []
    }
  ]
}
```

### C) `/v1/agent/run` 输入新增可选字段

```json
{
  "intent": "maintain|grow|repair",
  "relationshipMix": "business|friend|mixed",
  "timeBudgetMinutes": 30
}
```

### D) 新增反馈接口（学习闭环）

`POST /v1/agent/feedback`

```json
{
  "runId": "string",
  "agentId": "contact_insight|network_action",
  "actionId": "string",
  "status": "accepted|edited|dismissed|executed",
  "reasonCode": "not_relevant|too_generic|tone_off|timing_bad|other",
  "editDistance": 0.35,
  "executedAtMs": 1739160000000
}
```

## 6.2 决策分层与优先级评分

初始优先级公式（0-100）：

`priority = 0.35*recencyGap + 0.25*reciprocityGap + 0.20*importance + 0.10*momentWindow + 0.10*replyLikelihood`

分桶策略：

- `>=75`: `urgentRepairs`
- `45~74`: `opportunityBridges`
- `<45`: `lightTouches`

## 6.3 Prompt 约束升级

系统模板硬约束：

1. 每条建议必须给 `whyNow`
2. 每条建议必须附 `evidence`（至少一条 citation）
3. 默认提供可编辑草稿，不直接自动外发
4. 朋友场景默认轻语气；商务场景默认目标导向

---

## 7. 实施计划（6 周）

## Week 1-2：契约与数据层

- 扩展 `contact_insight` 与 `network_action` output schema
- 新增 `agent-feedback` DTO / Controller / Service
- 前端类型同步（兼容旧字段）
- 增加反馈事件埋点基础结构

## Week 3-4：决策与生成层

- 实现评分函数和三队列分桶
- 构建 `actionCards` 生成器（含 whyNow / effort / risk）
- 引入低数据量 fallback 策略（避免模型“编故事”）

## Week 5：前端体验层

- 联系人页新增 action cards 区块
- 行动页新增三队列 + 每周计划视图
- 增加“接受/编辑/忽略/执行”反馈交互

## Week 6：实验与优化

- A/B：旧洞察模式 vs action-card 模式
- 统计跟进完成率与 dismiss 原因分布
- 调整 prompt 与评分权重

---

## 8. 测试计划与验收标准

## 8.1 测试用例

1. **契约兼容测试**
   - 新字段新增后，旧调用方不崩溃
2. **评分逻辑测试**
   - 分桶边界值（44/45/74/75）行为正确
3. **回退策略测试**
   - 数据稀疏场景不输出高置信度动作
4. **闭环测试**
   - `run -> action -> feedback` 全链路可追踪
5. **确认策略测试**
   - `requiresConfirmation=true` 的动作不能被自动执行

## 8.2 验收门槛

- 跟进完成率较基线提升 **>= 20%**
- dismiss 原因中 `too_generic + tone_off` 占比 **< 15%**
- `edited -> executed` 转化率连续两周上升

---

## 9. 风险与应对

### 风险 1：过度自动化导致信任下滑

- 应对：保持默认“建议 + 确认”

### 风险 2：提醒疲劳

- 应对：引入 `timeBudgetMinutes`，限制每周动作总量

### 风险 3：建议模板化、人格感弱

- 应对：强制个性化证据锚点 + 可编辑草稿

### 风险 4：偏商务导致朋友场景体验下降

- 应对：`relationshipMix` 默认 mixed，语气策略分流

---

## 10. 后续执行建议（进入开发前）

1. 先做最小闭环：`actionCards + feedback`，不要先做复杂 UI。
2. 先在 1~2 个细分人群上灰度（如创始人/投资人），快速拿行为数据。
3. 评估“被执行的建议”而不是“被展示的建议”。
4. 每周固定复盘 3 类被忽略建议，反推 prompt 约束。

---

## 11. 外部参考（用于后续持续更新）

- [Americans Are Spending Less Time with Friends](https://www.americansurveycenter.org/research/americans-are-spending-less-time-with-friends/)
- [The State of American Friendship](https://www.americansurveycenter.org/research/the-state-of-american-friendship-change-challenges-and-loss/)
- [A Causal Test of the Strength of Weak Ties](https://pubmed.ncbi.nlm.nih.gov/36108051/)
- [U.S. Surgeon General Advisory on Social Connection](https://www.hhs.gov/sites/default/files/surgeon-general-social-connection-advisory.pdf)
- [Pew: What Americans Think About AI](https://www.pewresearch.org/short-reads/2025/05/06/what-americans-think-about-ai/)
- [Dex Pricing](https://getdex.com/pricing)
- [Clay Pricing](https://www.clay.earth/pricing)
- [Monica Pricing](https://monica.im/pricing)
- [Affinity Relationship Manager](https://www.affinity.co/relationship-manager)

