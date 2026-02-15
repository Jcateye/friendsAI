# Walkthrough: E2E 全链路测试 & V3 数据库 Schema 修复

> 日期: 2026-02-14
> 分支: Assistant-codex-5.3

## 背景

`db8631e` commit 引入了 V3 数据库架构（Agent V1 闭环功能），在独立的 `friendsai_v3_gpt` 数据库中新建了 5 张表。
但 **TypeORM Entity 定义与迁移脚本严重不一致**，导致运行时列不存在错误。

本次工作包含两部分：
1. 实现 30 步全链路 E2E 测试
2. 修复 V3 Entity/DB schema 不匹配问题

---

## 一、V3 数据库 Schema 不匹配问题

### 根因

`db8631e` 中的 v3 迁移脚本创建了精简版的表，但 TypeORM Entity 定义了远超迁移脚本的列。
两者之间的差异导致：
- 查询时 `column xxx does not exist` 错误
- 插入时 `null value violates not-null constraint` 错误

### 具体差异

#### `action_outcome_log`
- **迁移脚本**: 7 列 (`id`, `user_id`, `agent_id`, `suggestion_id`, `event_type`, `event_data`, `created_at`)
- **Entity 定义**: 18 列 (额外 11 列: `contact_id`, `agent_name`, `action_type`, `action_metadata`, `outcome_type`, `outcome_reason`, `action_timestamp`, `response_time_seconds`, `platform`, `message_id`, `conversation_id`, `followup_required`, `followup_deadline`, `conversion_score`, `metadata`)
- **NOT NULL 冲突**: 迁移脚本的 `agent_id`, `suggestion_id`, `event_type` 是 NOT NULL，但 Entity 不管理这些列

#### `weekly_report_cache`
- **迁移脚本**: 10 列 (使用 `week_start`)
- **Entity 定义**: 21 列 (使用 `week_start_date`，另有 `week_end_date`, `report_data`, `accepted_suggestions` 等 11 列)
- **列名冲突**: DB 用 `week_start` (NOT NULL)，Entity 用 `week_start_date`

#### `relationship_health_snapshot`
- **迁移脚本**: 9 列
- **Entity 额外**: `interaction_frequency_days` (vs DB 的 `interaction_frequency`), `total_interactions`, `insight_tags`, `priority_score`, `relationship_risk_level`, `metadata`
- **类型不匹配**: `user_id`/`contact_id` Entity 定义为 `uuid`，DB 为 `varchar(255)`

#### `relationship_debt_item`
- **迁移脚本**: 10 列
- **Entity 额外**: `status`, `days_overdue`, `suggested_message_template`, `original_event_id`, `original_conversation_id`, `metadata`, `updated_at`
- DB 有 `is_resolved` 但 Entity 没有

#### 所有 4 个 Entity 的通用问题
- `created_at`/`updated_at`: Entity 定义为 `bigint` + `timestampMsTransformer`，DB 实际是 `timestamp`
- `user_id`: Entity 定义为 `uuid` 类型，DB 实际是 `varchar(255)`

### 修复方案

**策略**: 让 DB 向 Entity 对齐（添加缺失列），同时修复 Entity 中的类型不匹配。

#### 1. 新增迁移脚本 `20260214_align_v3_entities.sql`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 添加所有缺失列（幂等，可重复执行）
- `ALTER TABLE ... ALTER COLUMN ... DROP NOT NULL` 放宽旧列约束
- 数据回填: `week_start` → `week_start_date`, `is_resolved` → `status`

#### 2. 修复 Entity 类型
- `user_id`, `contact_id`: `uuid` → `varchar(255)` (匹配 DB)
- `created_at`, `updated_at`: `bigint` + transformer → `timestamp` (匹配 DB)
- `action_outcome_log.created_at`: `bigint` → `timestamp`
- 移除各 Entity 中未使用的 `timestampMsTransformer` import

---

## 二、E2E 全链路测试

### 测试概述

文件: `test/main-flow.e2e-spec.ts`
框架: Jest + Supertest
执行方式: 顺序执行，步骤间共享状态
AI 服务: Mock（streamChat, callAgent, generateEmbedding）

### 30 步测试流程

| # | 方法 | 端点 | 测试内容 |
|---|------|------|---------|
| 01 | GET | `/v1/health` | 服务健康检查 |
| 02 | POST | `/v1/auth/register` | 用户注册 |
| 03 | POST | `/v1/auth/login` | 用户登录 |
| 04 | POST | `/v1/auth/refresh` | Token 刷新 |
| 05 | POST | `/v1/contacts` | 创建联系人 |
| 06 | GET | `/v1/contacts` | 联系人列表 |
| 07 | GET | `/v1/contacts/:id` | 联系人详情 |
| 08 | PATCH | `/v1/contacts/:id` | 更新联系人 |
| 09 | GET | `/v1/contacts/:id/context` | 联系人上下文 |
| 10 | POST | `/v1/conversations` | 创建会话 |
| 11 | GET | `/v1/conversations` | 会话列表 |
| 12 | GET | `/v1/conversations/:id` | 会话详情 |
| 13 | POST | `/v1/agent/chat` | AI 聊天 SSE 流式 |
| 14 | GET | `/v1/conversations/:id/messages` | 消息持久化验证 |
| 15 | POST | `/v1/events` | 创建事件 |
| 16 | GET | `/v1/events/contact/:contactId` | 事件列表 |
| 17 | POST | `/v1/conversations/:id/archive` | 会话归档 |
| 18 | POST | `/v1/conversation-archives/:id/apply` | 应用归档 |
| 19 | GET | `/v1/action-panel/dashboard` | 行动面板 |
| 20 | GET | `/v1/contacts/:id/brief` | 联系人简报 |
| 21 | GET | `/v1/agent/list` | Agent 列表 |
| 22 | GET | `/v1/agent/messages` | Agent 消息查询 |
| 23 | POST | `/v1/tool-confirmations` | 创建工具确认 |
| 24 | GET | `/v1/tool-confirmations` | 工具确认列表 |
| 25 | POST | `/v1/tool-confirmations/:id/confirm` | 工具确认执行 |
| 26 | POST | `/v1/actions/track` | 行为追踪 |
| 27 | GET | `/v1/metrics/weekly` | 周报指标 |
| 28 | GET | `/v1/connectors/feishu/oauth/authorize` | 飞书 OAuth |
| 29 | DELETE | `/v1/contacts/:id` | 删除联系人 |
| 30 | POST | `/v1/auth/logout` | 用户注销 |

### 测试基础设施

- **测试数据库**: Docker PostgreSQL `friendsai_test` (localhost:5434)
- **环境配置**: `.env.test` 指向测试库
- **Jest 配置**: `jest-e2e.json` 增加 `main-flow` 匹配
- **数据库清理**: `test/db-cleanup.ts` 在 `beforeAll` 中清理旧数据
- **运行命令**: `npx jest --config ./test/jest-e2e.json --testPathPatterns main-flow --runInBand --verbose --forceExit`

### 已发现且修复的 Bug

1. **Archive apply 返回 404/500**: Mock AI 下归档直接完成，apply 时已无需操作
2. **Agent list 返回格式**: 返回 `{agents: [], total: N}` 而非数组
3. **weekly_report_cache 列名不匹配**: Entity `week_start_date` vs DB `week_start` (本次核心修复)
4. **afterAll 清理报错**: V3 DataSource 提前销毁导致 close 失败

### 测试结果

```
Tests:       30 passed, 30 total
Time:        2.583 s
```

---

## 变更文件清单

### 新增
- `migrations/20260214_align_v3_entities.sql` — V3 表对齐迁移脚本
- `test/main-flow.e2e-spec.ts` — 30 步全链路 E2E 测试
- `docs/walkthrough-e2e-and-v3-schema-fix.md` — 本文档

### 修改
- `src/v3-entities/action-outcome-log.entity.ts` — 修复 user_id 类型, created_at 类型
- `src/v3-entities/weekly-report-cache.entity.ts` — 修复 user_id 类型, created_at/updated_at 类型
- `src/v3-entities/relationship-health-snapshot.entity.ts` — 修复 user_id/contact_id 类型, created_at 类型
- `src/v3-entities/relationship-debt-item.entity.ts` — 修复 user_id/contact_id 类型, created_at/updated_at 类型
- `test/jest-e2e.json` — 增加 main-flow 测试路径
- `.env.test` — 配置测试数据库连接
