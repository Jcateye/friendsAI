# Tasks: Agent V1 可执行闭环

## 任务说明

本文档将任务拆分为可并行的 PR-sized 任务，每个任务映射到具体 Requirement ID，并指定负责角色。

## 角色定义

| 角色 | 职责 | 典型任务 |
|------|------|----------|
| **DBA** | 数据库设计与迁移 | 新库建表、索引优化 |
| **Schema Engineer** | 类型定义与契约 | TypeScript 类型、Zod Schema |
| **Capability Dev** | Agent 能力开发 | Prompt 模板、Context Builder |
| **Service Dev** | 业务服务开发 | 事件追踪、统计服务 |
| **Integration Dev** | 外部集成 | 飞书 API 真实执行 |
| **Test Engineer** | 测试用例编写 | 单元测试、集成测试 |

---

## Phase 1: 数据库与类型层 (Day 1-2)

### Task 1.1: 创建新数据库与基础表 [DBA]
**映射**: [AT-070] 数据库隔离

**Description**: 在 `localhost:5434` 创建 `friendsai_v3_gpt` 数据库及核心表

**Done When**:
```bash
# 验证数据库存在
psql -h localhost -p 5434 -U friendsai -d postgres -c "\l" | grep friendsai_v3_gpt

# 验证表存在
psql -h localhost -p 5434 -U friendsai -d friendsai_v3_gpt -c "\dt"

# 验证表结构
psql -h localhost -p 5434 -U friendsai -d friendsai_v3_gpt -c "\d relationship_health_snapshot"
psql -h localhost -p 5434 -U friendsai -d friendsai_v3_gpt -c "\d relationship_debt_item"
psql -h localhost -p 5434 -U friendsai -d friendsai_v3_gpt -c "\d action_outcome_log"
psql -h localhost -p 5434 -U friendsai -d friendsai_v3_gpt -c "\d weekly_report_cache"
```

**文件**: `packages/server-nestjs/migrations/v3_create_initial_tables.sql`

---

### Task 1.2: 创建 TypeORM 实体定义 [Schema Engineer]
**映射**: [AT-010] ~ [AT-070]

**Description**: 为新表创建 TypeORM Entity 类

**Done When**:
- 文件存在且可被 `TypeormModule.forFeature()` 导入
- 每个实体有正确的 `@Entity()`、`@Column()`、`@Index()` 装饰器

**文件**:
- `packages/server-nestjs/src/v3-entities/relationship-health-snapshot.entity.ts`
- `packages/server-nestjs/src/v3-entities/relationship-debt-item.entity.ts`
- `packages/server-nestjs/src/v3-entities/action-outcome-log.entity.ts`
- `packages/server-nestjs/src/v3-entities/weekly-report-cache.entity.ts`
- `packages/server-nestjs/src/v3-entities/index.ts`

---

### Task 1.3: 创建新数据源配置 [Schema Engineer]
**映射**: [AT-070] 数据库隔离

**Description**: 配置 `friendsai_v3_gpt` 为独立数据源

**Done When**:
- `app.module.ts` 中存在 `TypeOrmModule.forRoot()` 配置指向 `friendsai_v3_gpt`
- 可通过环境变量 `DATABASE_V3_URL` 配置

**文件**: `packages/server-nestjs/src/app.module.ts` (修改)

---

## Phase 2: 类型与契约层 (Day 2-3)

### Task 2.1: 扩展 ContactInsightOutput 类型 [Schema Engineer]
**映射**: [ECI-010] ~ [ECI-050]

**Description**: 为 `contact_insight` 添加新字段类型

**Done When**:
- `ContactInsightOutput` 接口包含新字段
- `z.outputSchema` 更新（或创建新的）
- 现有字段保持不变

**文件**: `packages/server-nestjs/src/agent/capabilities/contact_insight/contact-insight.types.ts`

**新增字段**:
```typescript
priority_score: number;
reason_tags: string[];
relationship_risk_level: 'low' | 'medium' | 'high';
```

---

### Task 2.2: 扩展 NetworkActionOutput 类型 [Schema Engineer]
**映射**: [ENA-010] ~ [ENA-050]

**Description**: 为 `network_action` 添加新字段类型

**Done When**:
- `NetworkActionOutput` 接口包含新字段
- 现有字段保持不变

**文件**: `packages/server-nestjs/src/agent/capabilities/network_action/network-action.types.ts`

---

### Task 2.3: 创建事件追踪类型 [Schema Engineer]
**映射**: [AT-010] ~ [AT-050]

**Description**: 定义事件追踪相关的 DTO 和类型

**Done When**:
- `ActionTrackingEvents` 类型定义完整
- `WeeklyMetrics` 类型定义完整

**文件**:
- `packages/server-nestjs/src/action-tracking/action-tracking.types.ts`
- `packages/server-nestjs/src/action-tracking/dto/action-tracking.dto.ts`

---

## Phase 3: Agent 能力增强 (Day 3-5)

### Task 3.1: 更新 contact_insight Prompt 模板 [Capability Dev]
**映射**: [ECI-010] ~ [ECI-040]

**Description**: 更新 prompt 模板以输出新增字段

**Done When**:
- `system.prompt.md` 包含优先级评分说明
- `output.schema.json` 包含新字段定义
- 模板明确要求输出 `priority_score`、`reason_tags`、`relationship_risk_level`

**文件**:
- `packages/server-nestjs/src/agent/definitions/contact_insight/system.prompt.md`
- `packages/server-nestjs/src/agent/definitions/contact_insight/output.schema.json`

---

### Task 3.2: 更新 network_action Prompt 模板 [Capability Dev]
**映射**: [ENA-010] ~ [ENA-040]

**Description**: 更新 prompt 模板以输出时机原因、价值点、后续计划

**Done When**:
- `system.prompt.md` 包含"时机原因"说明
- `output.schema.json` 包含新字段定义

**文件**:
- `packages/server-nestjs/src/agent/definitions/network_action/system.prompt.md`
- `packages/server-nestjs/src/agent/definitions/network_action/output.schema.json`

---

### Task 3.3: 实现优先级计算逻辑 [Capability Dev]
**映射**: [ECI-010], [ECI-040]

**Description**: 实现确定性的优先级评分算法

**Done When**:
- `calculatePriorityScore()` 函数存在且可测试
- 相同输入产生相同输出

**文件**: `packages/server-nestjs/src/agent/capabilities/contact_insight/priority-calculator.service.ts`

---

### Task 3.4: 更新 Context Builder 增加风险信号 [Capability Dev]
**映射**: [ECI-020]

**Description**: 为 `contact_insight` context builder 添加风险信号聚合

**Done When**:
- Context 包含 `riskSignals` 字段
- 基于关系债务、未完成承诺计算风险

**文件**: `packages/server-nestjs/src/agent/capabilities/contact_insight/contact-insight-context-builder.service.ts`

---

## Phase 4: 事件追踪服务 (Day 5-7)

### Task 4.1: 实现事件追踪 Service [Service Dev]
**映射**: [AT-010] ~ [AT-050]

**Description**: 创建事件追踪服务，写入 `friendsai_v3_gpt`

**Done When**:
- `ActionTrackingService` 实现 5 个事件写入方法
- 事件写入失败不影响主流程

**文件**: `packages/server-nestjs/src/action-tracking/action-tracking.service.ts`

**方法**:
```typescript
recordSuggestionShown(input: SuggestionShownInput): Promise<void>
recordSuggestionAccepted(input: SuggestionAcceptedInput): Promise<void>
recordMessageSent(input: MessageSentInput): Promise<void>
recordMessageReplied(input: MessageRepliedInput): Promise<void>
recordFollowupCompleted(input: FollowupCompletedInput): Promise<void>
```

---

### Task 4.2: 实现每周统计 Service [Service Dev]
**映射**: [AT-060]

**Description**: 实现每周转化指标查询

**Done When**:
- `WeeklyReportService.getMetrics(userId, days)` 返回正确指标
- 支持缓存（写入 `weekly_report_cache`）

**文件**: `packages/server-nestjs/src/action-tracking/weekly-report.service.ts`

---

### Task 4.3: 创建事件追踪 Controller [Service Dev]
**映射**: [AT-060]

**Description**: 暴露事件追踪和统计 API

**Done When**:
- `POST /v1/actions/track` - 接收事件
- `GET /v1/metrics/weekly` - 查询每周指标

**文件**: `packages/server-nestjs/src/action-tracking/action-tracking.controller.ts`

---

### Task 4.4: 集成事件追踪到 Agent Runtime [Service Dev]
**映射**: [AT-010]

**Description**: 在 Agent 返回建议时自动记录 `suggestion_shown` 事件

**Done When**:
- `AgentRuntimeExecutor` 调用 `ActionTrackingService.recordSuggestionShown()`
- 通过 Feature Flag 控制启用

**文件**: `packages/server-nestjs/src/agent/runtime/agent-runtime-executor.service.ts`

---

## Phase 5: 飞书集成 (Day 7-9)

### Task 5.1: 实现飞书 OAuth 完整流程 [Integration Dev]
**映射**: Proposal - 飞书工具真实执行

**Description**: 实现飞书 OAuth 授权、token 交换、刷新

**Done When**:
- `POST /v1/connectors/feishu/callback` 接收授权回调
- Token 存储到数据库
- 支持自动刷新

**文件**:
- `packages/server-nestjs/src/connectors/feishu-oauth.service.ts`
- `packages/server-nestjs/src/connectors/connectors.controller.ts` (修改)

---

### Task 5.2: 实现真实飞书消息发送 [Integration Dev]
**映射**: Proposal - 飞书工具真实执行

**Description**: 替换 mock 的 `feishu.send_message` 为真实 API 调用

**Done When**:
- 调用飞书开放 API `/open-apis/im/v1/messages`
- 记录发送结果到 `action_outcome_log`

**文件**: `packages/server-nestjs/src/connectors/feishu-message.service.ts`

---

### Task 5.3: 更新 ToolConfirmation 执行逻辑 [Integration Dev]
**映射**: Proposal - 飞书工具真实执行

**Description**: 在 `ToolConfirmationsService` 中集成真实飞书发送

**Done When**:
- `executeTool()` 方法调用真实 `FeishuMessageService`
- 失败时记录错误状态

**文件**: `packages/server-nestjs/src/tool-confirmations/tool-confirmations.service.ts` (修改)

---

## Phase 6: 测试与验证 (Day 9-10)

### Task 6.1: 编写单元测试 [Test Engineer]
**映射**: All Requirements

**Description**: 为新功能编写单元测试，覆盖率达到 80%+

**Done When**:
```bash
cd packages/server-nestjs
npm test -- --coverage --testPathPattern="(v3|action-tracking|enhanced)"
# Coverage > 80%
```

---

### Task 6.2: 编写集成测试 [Test Engineer]
**映射**: All Requirements

**Description**: 编写端到端集成测试

**Done When**:
```bash
npm test -- e2e
# 所有测试通过
```

**文件**: `packages/server-nestjs/test/v1-agents.e2e-spec.ts`

---

### Task 6.3: 验证向后兼容性 [Test Engineer]
**映射**: [ECI-050], [ENA-050]

**Description**: 确保现有调用方不受影响

**Done When**:
- 运行现有 `contact_insight` 调用，原有字段正常返回
- 运行现有 `network_action` 调用，原有字段正常返回

---

## 并行执行矩阵

| Phase | DBA | Schema Engineer | Capability Dev | Service Dev | Integration Dev | Test Engineer |
|-------|-----|-----------------|----------------|-------------|-----------------|---------------|
| 1 | 1.1 | 1.2, 1.3 | - | - | - | - |
| 2 | - | 2.1, 2.2, 2.3 | - | - | - | - |
| 3 | - | - | 3.1, 3.2, 3.3, 3.4 | - | - | - |
| 4 | - | - | - | 4.1, 4.2, 4.3, 4.4 | - | - |
| 5 | - | - | - | - | 5.1, 5.2, 5.3 | - |
| 6 | - | - | - | - | - | 6.1, 6.2, 6.3 |

**关键路径**: 1.1 → 1.2 → 2.1 → 3.1 → 4.1 → 5.2 → 6.2

**可并行任务**:
- Phase 1 内: 1.2 和 1.3 可并行
- Phase 2 内: 2.1, 2.2, 2.3 可并行
- Phase 3 内: 3.1, 3.2, 3.3 可部分并行
- Phase 4 内: 4.1, 4.2, 4.3 可并行
- Phase 5 内: 5.1 和 5.2 的准备阶段可并行
