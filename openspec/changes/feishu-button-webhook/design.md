# Design: feishu-button-webhook

## 系统架构

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                    │
│                        飞书 (Feishu)                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │ Bitable 多维表格                                              │  │
│  │ ┌────────────────────────────────────────────────────────────────────┐ │  │
│  │ │                                                             │  │
│  │ │  [按钮字段] userBtn                                        │  │
│  │ │    ↓                                                    │  │
│  │ │  ┌────────────────────┐                                   │  │
│  │ │  飞书 Automation    │ ┌───────────────────────┐ │  │
│  │ │  └────────→ HTTP POST      │                   │         │ │  │
│  │ │          ↓                          │                   │ ↓       │ │
│  │ └─────────────────────────────────────────────────┘        │  friendsAI      │         │
│  │                                                       │  │  │
│  │                                                       │  │  │
│  │                                                       │  │  │
│  │                                                       │  │  │
│  │                                                       │  │  │
│  │                                                       │  │
│  │                                                       │  │
│  │                                                       │  │
│  │                                                       │  │
│  │                                                       │  │
│  │                                                       │  │
│  │                                                       │  │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 模块划分

### 后端模块 (packages/server-nestjs/src/feishu/)

| 模块 | 文件 | 职责 |
|-------|------|------|
| `webhook/` | `controller.ts` | Webhook 接收入口，路由定义 |
| `webhook/` | `service.ts` | 核心业务逻辑，签名验证，API 调用编排 |
| `webhook/` | `dto/` | 请求数据传输对象定义 |
| `api/` | `service.ts` | 飞书 OpenAPI 客户端封装 |
| `api/` | `dto/` | 飞书 API 请求/响应类型定义 |
| `config/` | `controller.ts` | 配置管理接口 |
| `config/` | `service.ts` | 配置存储与查询逻辑 |
| `config/` | `dto/` | 配置数据传输对象 |

### 数据模型

```
feishu_configs (用户配置)
    ├── userId: uuid           ───┐
    ├── appToken: string        │   ┌───┐
    ├── tableId: string │    │ 验证: │
    ├── webhookUrl: string  │   │   ↓   │
    └── enabled: boolean     │   │      │

feishu_webhook_logs (调用日志)
    ├── timestamp: string              │    │
    ├── token: string (签名)       │    │
    ├── appToken: string            │ 处理 ─┼───→
    ├── tableId: string              │   │      │
    ├── recordId: string            │   ↓      │
    ├── buttonId: string │          │   │
    ├── userId: string               │   │      │
    ├── payload: json              │   │      │
    ├── status: smallint           │   │      │
    ├── receivedAt: timestamptz   │   │      │
    ├── processedAt: timestamptz   │   │      │
    └── errorMessage: text │              │      │
                                       │      │
                                       │      │
                                       │      │
                                       ↓      │
                                       │   飞书 API Service
                                       │   ┌───────────────────────────┐
                                       │   │ Search records      │
                                       │   │ Get record          │
                                       │   │ Update record       │
                                       │   │ Send message        │
                                       │   └───────────────────────────┘
```

## API 接口设计

### 1. Webhook 接收接口

```
POST /v1/webhooks/feishu/button
Content-Type: application/json
```

**请求头：**
```typescript
X-Lark-Request-Id: {uuid}
X-Lark-Signature: {HMAC-SHA256签名}
Content-Type: application/json
```

**请求体：**
```typescript
interface ButtonClickRequest {
  // 飞书标准字段
  timestamp: string;        // 请求时间戳（毫秒）
  token: string;           // 签名字符串
  app_token: string;       // Bitable 应用 token
  table_id: string;        // 数据表 ID
  record_id: string;        // 记录 ID
  button_id: string;        // 按钮 ID
  user_id: string;          // 用户 ID

  // 自定义字段（Automation 可传递）
  view_id?: string;         // 视图 ID（可选）
  [key: string]: any;      // 其他键值对
}
```

**响应：**
```typescript
interface ButtonClickResponse {
  success: boolean;
  message: string;
  data?: {
    record_id: string;    // 回传记录 ID，用于确认
    status: 'processed' | 'processing' | 'failed';
    result?: any;         // 处理结果（可选返回）
  };
}
```

**错误响应：**
```typescript
interface ErrorResponse {
  success: false;
  message: string;          // "签名验证失败" | "记录不存在" 等
  error?: string;           // 错误码
}
```

### 2. 配置管理接口

```
GET /v1/feishu/config
```

**响应：**
```typescript
interface FeishuConfigResponse {
  success: boolean;
  data?: {
    app_token: string | null;     // 用户配置的 Bitable app_token
    table_id: string | null;       // 用户配置的 table_id
    webhook_url: string | null;       // 用户配置的 webhook URL
    enabled: boolean;               // 是否启用
  };
}
```

```
POST /v1/feishu/config
```

**请求体：**
```typescript
interface SaveConfigDto {
  app_token: string;
  table_id: string;
  webhook_url: string;  // 外部接收 URL
  enabled?: boolean;        // 默认 true
}
```

### 3. Webhook 状态查询接口（可选）

```
GET /v1/feishu/webhook/logs?record_id={recordId}
```

用于调试和追踪按钮调用历史。

---

## 飞书 API 封装设计

### FeishuApiService 结构

```typescript
@Injectable()
export class FeishuApiService {
  constructor(
    private http: HttpService,
    private config: ConfigService,
  ) {}

  // 使用 tenant_access_token（应用级 token）
  private async getTenantToken(): Promise<string> {
    // 从环境变量或配置获取
    // 或使用已存储的 tenant_access_token
  }

  /**
   * 查询 Bitable 记录
   */
  async searchRecords(params: {
    appToken: string;
    tableId: string;
    filter?: Record<string, any>;
    pageSize?: number;
    pageToken?: string;
  }): Promise<{
    records: any[];
    hasMore: boolean;
    pageToken: string;
  }> {
    // 调用飞书 Search records API
    // https://open.feishu.cn/document/docs/bitable-v1/app-table-record/search
  }

  /**
   * 获取单条记录详情
   */
  async getRecord(appToken: string, tableId: string, recordId: string): Promise<any> {
    // 调用飞书 Get record API
  }

  /**
   * 更新记录状态
   */
  async updateRecord(
    appToken: string,
    tableId: string,
    recordId: string,
    fields: Record<string, any>,
  ): Promise<any> {
    // 调用飞书 Update record API
  }

  /**
   * 发送卡片消息通知用户
   */
  async sendCardMessage(
    userAccessToken: string,
    userId: string,
    card: any,
  ): Promise<any> {
    // 调用飞书 Send message API
    // 使用 interactive_card 类型
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userAccessToken: string, userId: string): Promise<any> {
    // 调用飞书 Get user info API
  }
}
```

---

## 安全设计

### 签名验证算法

```typescript
// feishu/webhook.service.ts

private verifySignature(request: ButtonClickRequest): boolean {
  const signature = request.headers['x-lark-signature'];
  const requestId = request.headers['x-lark-request-id'];

  // 1. 获取加密密钥（从环境变量或用户配置）
  const encryptKey = this.configService.get('FEISHU_ENCRYPT_KEY');

  // 2. 构造待签名字符串
  // 按 timestamp 升序排列所有参数
  const sortedKeys = Object.keys(request.payload || {})
    .sort()
    .filter(k => k !== 'token'); // token 不参与签名

  const signStr = sortedKeys.join('');

  // 3. 使用 HMAC-SHA256 计算签名
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', encryptKey)
    .update(signStr, 'utf8')
    .digest('base64');

  // 4. 对比签名
  return signature === hmac;
}
```

### 安全措施

| 措施 | 说明 |
|-------|------|
| HTTPS | Webhook 必须 HTTPS 传输 |
| 时间戳验证 | 检查请求时间戳，防止重放攻击 |
| IP 白名单 | 限制可调用来源 IP |
| 速率限制 | 单用户/单 IP 请求频率限制 |

---

## 时序设计

```
用户点击按钮          飞书 Automation        friendsAI Webhook         飞书 API
     │                        │                        │                        │
     │                        │                        │                        │
     │  HTTP POST              │                        │  │                        │
     │  ─────────────────────   │  ┌──────────────────┐   │   ┌──────────────────┐
     │                        │  │  │ 验证签名                │  │ 调用飞书 API   │  │
     │                        │  └────────────────────┘  │  └────────────────────┘   │
     │                        │                        │                        │
     t₁                        t₂                        t₃                        t₄
     │                        │                        │                        │
     │                        │                        │                        │
```

**时间说明：**
- **t₁** 按钮点击时刻
- **t₂** Webhook 收到请求时刻（延迟通常 < 1s）
- **t₃** 验证签名完成 + 发起飞书 API 调用开始（延迟通常 < 500ms）
- **t₄** 飞书 API 响应返回（网络延迟，通常 < 1s）

---

## 错误处理

### 错误码定义

```typescript
enum FeishuWebhookError {
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',      // 签名验证失败
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',    // 记录不存在
  API_CALL_FAILED = 'API_CALL_FAILED',        // 飞书 API 调用失败
  UNAUTHORIZED = 'UNAUTHORIZED',              // 用户未授权
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED', // 速率限制
}
```

### 重试策略

| 场景 | 重试策略 |
|-------|---------|
| 网络超时 | 指数退避重试，最多 3 次 |
| API 限流 | 等待后重试，使用指数退避 |
| 签名失败 | 直接返回错误，不重试 |

---

## 数据库迁移

```sql
-- 创建用户配置表
CREATE TABLE feishu_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id UUID NOT NULL,
  app_token VARCHAR(255),
  table_id VARCHAR(255),
  webhook_url VARCHAR(255),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 Webhook 日志表
CREATE TABLE feishu_webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  app_token VARCHAR(255) NOT NULL,
  table_id VARCHAR(255) NOT NULL,
  record_id VARCHAR(255) NOT NULL,
  button_id VARCHAR(255),
  user_id VARCHAR(255) NOT NULL,
  payload JSONB,
  status SMALLINT DEFAULT 0,  -- 0: received, 1: processing, 2: completed, 3: failed
  error_message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_feishu_configs_user_id ON feishu_configs(user_id);
CREATE INDEX idx_feishu_webhook_logs_record ON feishu_webhook_logs(record_id);
CREATE INDEX idx_feishu_webhook_logs_status ON feishu_webhook_logs(status, created_at);
```

---

## 与现有模块集成

### 复用 connectors 模块

```typescript
// packages/server-nestjs/src/feishu/feishu-api.service.ts

import { HttpService } from '@nestjs/axios';
import { ConnectorTokenService } from '../../connectors/connectors.service';

@Injectable()
export class FeishuApiService {
  constructor(
    private http: HttpService,
    private connectors: ConnectorTokenService,
  ) {}

  /**
   * 获取飞书 tenant_access_token
   * 复用现有 connectors 模块的 token 存储和刷新逻辑
   */
  private async getTenantToken(): Promise<string> {
    // 从 connector_tokens 表获取 'feishu' provider 的 token
    const tokenRecord = await this.connectors.getValidToken('feishu');

    if (!tokenRecord) {
      throw new UnauthorizedException('飞书应用凭证未配置');
    }

    // 检查是否即将过期，如果需要则刷新
    // 这里可以复用现有的 token 刷新逻辑

    return tokenRecord.accessToken;
  }
}
```

---

## 部署配置

### 环境变量

```bash
# 飞书应用凭证（用于获取 tenant_access_token）
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxx

# Webhook 签名验证密钥
FEISHU_ENCRYPT_KEY=your-encrypt-key

# 或从数据库配置表中读取
```

### Docker Compose

```yaml
services:
  server:
    environment:
      - FEISHU_APP_ID=${FEISHU_APP_ID}
      - FEISHU_APP_SECRET=${FEISHU_APP_SECRET}
      - FEISHU_ENCRYPT_KEY=${FEISHU_ENCRYPT_KEY}
      - DATABASE_URL=postgresql://postgres:5432/friendsai
```
