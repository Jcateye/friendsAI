# FriendsAI Agent V1 可执行闭环 - 部署文档

## 📋 目录

1. [系统概述](#系统概述)
2. [环境准备](#环境准备)
3. [数据库配置](#数据库配置)
4. [环境变量配置](#环境变量配置)
5. [部署步骤](#部署步骤)
6. [API 端点](#api-端点)
7. [验证测试](#验证测试)
8. [故障排查](#故障排查)

---

## 系统概述

FriendsAI Agent V1 实现了"建议生成 → 用户确认 → 执行 → 结果追踪"的完整闭环，包括：

- **增强的 Agent 能力**：`contact_insight` 和 `network_action` 输出优先级、原因标签、时机解释
- **事件追踪系统**：记录建议展示、采纳、发送、回复、跟进完成等行为
- **飞书集成**：完整的 OAuth 授权和消息发送功能
- **每周简报**：行动完成率、回复率、推进率统计

---

## 环境准备

### 系统要求

- Node.js >= 18
- PostgreSQL >= 14
- Bun (可选，用于 monorepo 管理)

### 依赖安装

```bash
# 安装依赖
bun install
# 或
npm install
```

---

## 数据库配置

### V3 数据库创建

V3 功能使用独立的数据库 `friendsai_v3_gpt`，不影响原有的 `friendsai_v2` 数据库。

#### 方式 1: 使用迁移脚本

```bash
cd packages/server-nestjs

# 运行初始表迁移
node scripts/run-v3-migration.js

# 运行飞书 Token 表迁移
node scripts/run-v3-feishu-migration.js
```

#### 方式 2: 手动执行 SQL

```bash
psql -h localhost -U friendsai -d postgres -f migrations/v3_create_initial_tables.sql
psql -h localhost -U friendsai -d postgres -f migrations/v3_create_feishu_tokens.sql
```

### 数据库表结构

| 表名 | 用途 |
|------|------|
| `relationship_health_snapshot` | 关系健康快照 |
| `relationship_debt_item` | 关系债务项 |
| `action_outcome_log` | 行动结果日志 |
| `weekly_report_cache` | 每周简报缓存 |
| `feishu_tokens` | 飞书 OAuth Token |

---

## 环境变量配置

### 创建环境文件

```bash
cp packages/server-nestjs/.env.v3.example packages/server-nestjs/.env
```

### 必需配置项

```bash
# ===== 主数据库（V2，原有数据）=====
DATABASE_URL="postgres://friendsai:friendsai@localhost:5434/friendsai_v2"

# ===== V3 数据库（新增功能）=====
DATABASE_URL_V3="postgres://friendsai:friendsai@localhost:5434/friendsai_v3_gpt"

# ===== AI 服务 =====
OPENAI_API_KEY="sk-xxx"
OPENAI_BASE_URL="https://api.openai.com/v1"

# ===== 飞书开放平台（可选）=====
FEISHU_APP_ID="cli_xxxxx"
FEISHU_APP_SECRET="xxxxxxxxxxxx"
FEISHU_OAUTH_REDIRECT_URI="http://localhost:3000/v1/connectors/feishu/oauth/callback"

# ===== 功能开关 =====
ACTION_TRACKING_ENABLED=true
V1_AGENTS_ENABLED=true
```

---

## 部署步骤

### 1. 构建

```bash
cd packages/server-nestjs
npm run build
```

### 2. 启动服务

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run start:prod
```

### 3. 验证服务

```bash
# 健康检查
curl http://localhost:3000/v1/health

# 查看 Agent 列表
curl http://localhost:3000/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## API 端点

### 事件追踪

| 端点 | 方法 | 描述 |
|------|------|------|
| `/v1/actions/track` | POST | 记录事件 |
| `/v1/metrics/weekly` | GET | 每周指标 |
| `/v1/metrics/events` | GET | 事件列表 |

### 飞书集成

| 端点 | 方法 | 描述 |
|------|------|------|
| `/v1/connectors/feishu/oauth/authorize/me` | GET | 获取授权 URL |
| `/v1/connectors/feishu/oauth/callback` | GET | OAuth 回调 |
| `/v1/connectors/feishu/oauth/token/me` | GET | 获取用户 Token |

### Agent 运行

| 端点 | 方法 | 描述 |
|------|------|------|
| `/v1/agents/run` | POST | 运行 Agent |

---

## 验证测试

### 运行单元测试

```bash
cd packages/server-nestjs
npm test
```

### 运行特定测试

```bash
# 事件追踪测试
npm test -- action-tracking

# 飞书 OAuth 测试
npm test -- feishu-oauth
```

---

## 故障排查

### 问题：数据库连接失败

```bash
# 检查数据库是否运行
psql -h localhost -U friendsai -d friendsai_v3_gpt -c "SELECT 1"

# 检查连接字符串
echo $DATABASE_URL_V3
```

### 问题：Agent 运行失败

```bash
# 检查 AI 服务配置
echo $OPENAI_API_KEY

# 查看日志
tail -f logs/combined.log
```

### 问题：飞书消息发送失败

1. 检查 Token 是否有效：`GET /v1/connectors/feishu/oauth/token/me/valid`
2. 检查应用权限：确保应用有发送消息权限
3. 检查用户 Open ID 是否正确

---

## 回滚方案

### 数据库回滚

V3 数据库完全独立，可以直接删除：

```bash
psql -h localhost -U friendsai -d postgres -c "DROP DATABASE IF EXISTS friendsai_v3_gpt"
```

### 代码回滚

```bash
git revert <commit-hash>
npm run build
npm run start:prod
```

---

## 监控指标

### 关键指标

- **建议采纳率**：`actionCompletionRate = accepted / shown * 100`
- **消息回复率**：`replyRate = replied / sent * 100`
- **跟进完成率**：`followupRate = followupCompleted / accepted * 100`

### 日志位置

- 应用日志：`logs/combined.log`
- 错误日志：`logs/error.log`

---

## 联系方式

- 技术支持：参见项目 README.md
- 问题反馈：GitHub Issues
