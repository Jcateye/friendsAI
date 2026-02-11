# V3 功能使用文档

## 概述

V3 版本引入了全新的数据库架构和飞书集成功能，支持更智能的代理行为追踪和联系人洞察增强。

## 环境配置

### 1. 环境变量配置

复制示例配置文件并填入实际值：

```bash
cp .env.v3.example .env.v3
```

编辑 `.env.v3` 文件，填入以下配置：

#### 数据库配置

```bash
DATABASE_URL_V3="postgres://friendsai:friendsai@localhost:5434/friendsai_v3_gpt"
```

**说明**：
- 默认使用 PostgreSQL 15+
- 数据库名称：`friendsai_v3_gpt`
- 端口：`5434`

#### 飞书开放平台配置

```bash
FEISHU_APP_ID="your_feishu_app_id"
FEISHU_APP_SECRET="your_feishu_app_secret"
FEISHU_OAUTH_REDIRECT_URI="http://localhost:3000/v1/connectors/feishu/oauth/callback"
FEISHU_BASE_URL="https://open.feishu.cn"
```

**获取方式**：
1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 在应用凭证中获取 App ID 和 App Secret
4. 配置 OAuth 重定向 URI

#### Action Tracking 配置

```bash
ACTION_TRACKING_ENABLED=true
ACTION_TRACKING_CACHE_TTL=3600000
```

**说明**：
- `ACTION_TRACKING_ENABLED`: 是否启用行为追踪
- `ACTION_TRACKING_CACHE_TTL`: 缓存过期时间（毫秒），默认 1 小时

#### 特性开关

```bash
V1_AGENTS_ENABLED=true
V1_CONTACT_INSIGHT_ENHANCED=true
V1_NETWORK_ACTION_ENHANCED=true
```

**说明**：
- `V1_AGENTS_ENABLED`: 启用 V1 版本的代理功能
- `V1_CONTACT_INSIGHT_ENHANCED`: 启用联系人洞察增强功能
- `V1_NETWORK_ACTION_ENHANCED`: 启用网络行为增强功能

### 2. 数据库初始化

启动 PostgreSQL 数据库：

```bash
# 使用 Docker
docker run -d \
  --name friendsai-v3-db \
  -e POSTGRES_USER=friendsai \
  -e POSTGRES_PASSWORD=friendsai \
  -e POSTGRES_DB=friendsai_v3_gpt \
  -p 5434:5432 \
  postgres:15-alpine
```

运行数据库迁移：

```bash
npm run migration:run
```

或使用 Docker Compose：

```bash
docker-compose -f docker-compose.v3.yml up -d
```

## 功能模块

### 飞书集成

#### OAuth 认证流程

1. **发起授权**

```typescript
GET /v1/connectors/feishu/oauth/authorize
```

用户点击授权后，跳转到飞书授权页面。

2. **处理回调**

```typescript
GET /v1/connectors/feishu/oauth/callback
```

飞书授权成功后回调，获取用户访问令牌。

3. **API 调用**

使用访问令牌调用飞书 API：

```typescript
import { FeishuConnectorService } from '@/modules/connectors/feishu/feishu-connector.service'

const service = new FeishuConnectorService()
const messages = await service.getMessages(accessToken)
```

### Action Tracking

#### 启用追踪

```typescript
import { ActionTrackingService } from '@/modules/action-tracking/action-tracking.service'

const service = new ActionTrackingService()

// 记录用户行为
await service.trackAction({
  userId: 'user-uuid',
  actionType: 'contact_view',
  metadata: {
    contactId: 'contact-uuid',
    source: 'dashboard'
  }
})
```

#### 查询追踪记录

```typescript
// 获取用户行为历史
const actions = await service.getUserActions('user-uuid', {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  limit: 100
})
```

### 联系人洞察增强

#### 启用增强功能

```typescript
import { ContactInsightService } from '@/modules/contacts/contact-insight.service'

const service = new ContactInsightService()

// 生成联系人洞察
const insights = await service.generateInsights('contact-uuid', {
  includeActionHistory: true,
  includeNetworkAnalysis: true,
  includePrediction: true
})
```

#### 洞察类型

1. **行为模式分析**
   - 互动频率
   - 最佳联系时间
   - 沟通偏好

2. **网络关系分析**
   - 共同联系人
   - 关系强度
   - 影响力评估

3. **预测性洞察**
   - 下次联系时间预测
   - 关系发展趋势

## API 端点

### 飞书集成

| 端点 | 方法 | 描述 |
|------|------|------|
| `/v1/connectors/feishu/oauth/authorize` | GET | 发起飞书授权 |
| `/v1/connectors/feishu/oauth/callback` | GET | 飞书授权回调 |
| `/v1/connectors/feishu/messages` | GET | 获取飞书消息 |
| `/v1/connectors/feishu/contacts` | GET | 获取飞书联系人 |

### Action Tracking

| 端点 | 方法 | 描述 |
|------|------|------|
| `/v1/action-tracking/track` | POST | 记录用户行为 |
| `/v1/action-tracking/user/:userId` | GET | 获取用户行为历史 |
| `/v1/action-tracking/stats` | GET | 获取行为统计 |

### 联系人洞察

| 端点 | 方法 | 描述 |
|------|------|------|
| `/v1/contacts/:id/insights` | GET | 获取联系人洞察 |
| `/v1/contacts/:id/insights/generate` | POST | 生成新的洞察 |
| `/v1/contacts/:id/network` | GET | 获取联系人网络关系 |

## 开发指南

### 本地开发

1. 安装依赖：

```bash
npm install
```

2. 配置环境变量：

```bash
cp .env.v3.example .env.v3
```

3. 启动数据库：

```bash
docker-compose -f docker-compose.v3.yml up -d
```

4. 运行迁移：

```bash
npm run migration:run
```

5. 启动开发服务器：

```bash
npm run start:dev
```

### 测试

```bash
# 运行所有测试
npm run test

# 运行 V3 相关测试
npm run test -- packages/server-nestjs/test/v3

# 运行 E2E 测试
npm run test:e2e
```

## 故障排查

### 数据库连接失败

**问题**：无法连接到 PostgreSQL 数据库

**解决方案**：
1. 检查数据库是否运行：`docker ps | grep friendsai`
2. 检查端口是否正确：`lsof -i :5434`
3. 检查连接字符串格式

### 飞书 OAuth 失败

**问题**：OAuth 授权失败或回调错误

**解决方案**：
1. 检查 App ID 和 App Secret 是否正确
2. 检查重定向 URI 是否在飞书后台配置
3. 检查回调 URL 是否可访问

### Action Tracking 不工作

**问题**：行为追踪未记录

**解决方案**：
1. 检查 `ACTION_TRACKING_ENABLED` 是否为 `true`
2. 检查数据库表是否正确创建
3. 查看日志中的错误信息

## 生产部署

### 环境变量检查清单

- [ ] `DATABASE_URL_V3` 指向生产数据库
- [ ] 飞书凭证为生产环境凭证
- [ ] `FEISHU_OAUTH_REDIRECT_URI` 为生产域名
- [ ] 根据需要调整 `ACTION_TRACKING_CACHE_TTL`
- [ ] 特性开关根据业务需求配置

### 安全建议

1. 使用密钥管理服务（如 AWS Secrets Manager）存储敏感信息
2. 定期轮换飞书 App Secret
3. 限制数据库访问 IP 白名单
4. 启用 SSL/TLS 加密数据库连接

## 相关文档

- [飞书开放平台文档](https://open.feishu.cn/document/)
- [V3 数据库架构设计](../../docs/v3-database-architecture.md)
- [API 文档](../../docs/api-reference.md)

## 支持

如有问题，请联系开发团队或提交 Issue。
