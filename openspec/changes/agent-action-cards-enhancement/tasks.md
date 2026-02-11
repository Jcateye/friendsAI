# Tasks: Agent Action Cards Enhancement

## 阶段一：契约与数据层（Week 1-2）

### 1.1 扩展 contact_insight 输出 schema

- [ ] **1.1.1** 定义 `relationshipState` 和 `relationshipType` 字段
  Done When: 类型定义添加到 `contact-insight.types.ts`，包含 `warming|stable|cooling|at_risk` 和 `business|friend|mixed`

- [ ] **1.1.2** 定义 `momentSignals[]` 结构
  Done When: 包含 `type`、`score`、`whyNow`、`expiresAtMs` 字段的接口定义完成

- [ ] **1.1.3** 定义 `actionCards[]` 结构
  Done When: 包含 `actionId`、`goal`、`actionType`、`draftMessage`、`effortMinutes`、`confidence`、`riskLevel`、`requiresConfirmation` 的接口定义完成

- [ ] **1.1.4** 更新 `ContactInsightOutput` 接口
  Done When: 新字段添加到输出接口，保持向后兼容（所有新字段可选）

### 1.2 扩展 network_action 输出 schema

- [ ] **1.2.1** 定义 `queues` 结构
  Done When: 包含 `urgentRepairs`、`opportunityBridges`、`lightTouches` 的接口定义完成

- [ ] **1.2.2** 定义 `weeklyPlan[]` 结构
  Done When: 包含 `day`、`maxMinutes`、`actions` 的接口定义完成

- [ ] **1.2.3** 更新 `NetworkActionOutput` 接口
  Done When: 新字段添加到输出接口，保持向后兼容

### 1.3 新增反馈接口

- [ ] **1.3.1** 创建 `agent-feedback` DTO
  Done When: `AgentFeedbackDto` 包含 `runId`、`agentId`、`actionId`、`status`、`reasonCode`、`editDistance`、`executedAtMs`

- [ ] **1.3.2** 创建 `agent-feedback` Controller
  Done When: `POST /v1/agent/feedback` 端点创建，包含验证和错误处理

- [ ] **1.3.3** 创建 `agent-feedback` Service
  Done When: 反馈存储逻辑完成，支持写入数据库或日志

- [ ] **1.3.4** 创建 `agent_feedback` 数据库表
  Done When: Entity 和 Migration 完成，表结构支持所有反馈字段

### 1.4 扩展 /v1/agent/run 输入

- [ ] **1.4.1** 扩展 `AgentRunRequest` 类型
  Done When: 新增 `intent`、`relationshipMix`、`timeBudgetMinutes` 可选字段

- [ ] **1.4.2** 更新 runtime 执行器
  Done When: 新字段传递到 agent context builder

## 阶段二：决策与生成层（Week 3-4）

### 2.1 评分函数实现

- [ ] **2.1.1** 创建 `action-priority.service.ts`
  Done When: 评分函数 `calculatePriority()` 实现，权重可配置

- [ ] **2.1.2** 实现分桶逻辑
  Done When: `categorizeActionQueue()` 函数根据分数分到三个队列

- [ ] **2.1.3** 边界值测试
  Done When: 44/45/74/75 边界值单元测试通过

### 2.2 Action Cards 生成器

- [ ] **2.2.1** 创建 `action-card-generator.service.ts`
  Done When: 生成器支持 `whyNow`、`effort`、`risk` 计算

- [ ] **2.2.2** 集成到 contact_insight
  Done When: `contact_insight` 能力调用 action card 生成器

- [ ] **2.2.3** 集成到 network_action
  Done When: `network_action` 能力使用评分和分桶逻辑

### 2.3 Prompt 约束升级

- [ ] **2.3.1** 更新 contact_insight 模板
  Done When: 模板强制包含 `whyNow` 和 `evidence` 要求

- [ ] **2.3.2** 更新 network_action 模板
  Done When: 模板强制包含 `whyNow` 和 `evidence` 要求

- [ ] **2.3.3** 添加低数据量 fallback 策略
  Done When: 数据稀疏时不输出高置信度动作的测试通过

## 阶段三：前端体验层（Week 5）

### 3.1 联系人页 Action Cards 区块

- [ ] **3.1.1** 创建 `ActionCard` 组件
  Done When: 组件显示 goal、whyNow、draftMessage、effortMinutes，支持接受/编辑/忽略

- [ ] **3.1.2** 集成到联系人详情页
  Done When: action cards 显示在洞察区域下方

### 3.2 行动页三队列视图

- [ ] **3.2.1** 创建 `ActionQueue` 组件
  Done When: 支持三个队列切换显示

- [ ] **3.2.2** 创建 `WeeklyPlan` 组件
  Done When: 显示每周计划时间线视图

### 3.3 反馈交互

- [ ] **3.3.1** 实现反馈 API 调用
  Done When: 用户操作触发反馈请求

- [ ] **3.3.2** 添加编辑距离计算
  Done When: 用户编辑草稿时计算 editDistance

## 阶段四：实验与优化（Week 6）

### 4.1 测试和验证

- [ ] **4.1.1** 契约兼容测试
  Done When: 旧调用方不崩溃的集成测试通过

- [ ] **4.1.2** 闭环测试
  Done When: `run -> action -> feedback` E2E 测试通过

- [ ] **4.1.3** 确认策略测试
  Done When: `requiresConfirmation=true` 的动作不能自动执行的测试通过

### 4.2 监控和分析

- [ ] **4.2.1** 添加跟进完成率指标
  Done When: `执行完成的建议行动数 / 生成的建议行动数` 指标可观测

- [ ] **4.2.2** 添加 dismiss 原因分布指标
  Done When: dismiss 原因分类和占比可观测
