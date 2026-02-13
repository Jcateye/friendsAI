# 飞书按钮 Webhook 集成方案

## 需求概述

friendsAI 需要通过飞书多维表格（Bitable）的按钮触发外部动作，实现流程：

```
用户在飞书 Bitable 点按钮
        ↓
触发飞书 Automation
        ↓
调用预设的 Webhook
        ↓
friendsAI 收到请求 → 调用飞书 API 拉取数据
        ↓
处理数据后执行后续操作（发消息/更新记录）
```

**关键简化：**
- 不需要完整的 MCP 服务器
- 只需 2 个飞书 API：**查询记录** + **更新记录/发消息**
- 按钮触发通过飞书 Automation + Webhook 实现

---

## 架构设计

### 1. 整体流程图

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                         │
│  飞书侧                          friendsAI 侧             │
│  ┌────────────────────────────────────────────────┐         │
│  │ Bitable 表格                              │         │
│  │                                          │         │
│  │  [按钮字段] ← 用户点击               │         │
│  │         │                                │         │
│  └───────→ Automation 触发                     │         │
│              │                                │         │
│              ↓                                │         │
│         ┌────────────────────┐               │         │
│         │ Webhook 回调       │               │         │
│         │ 请求 payload:      │               │         │
│         │  - record_id        │               │         │
│         │  - button_id        │               │         │
│         │  - user_id          │               │         │
│         └────────────────────┘               │         │
│                   │                           │         │
│                   ↓                           │         │
│         friendsAI Webhook Endpoint           │         │
│              │                              │         │
│              ↓                              │         │
│         ┌────────────────────────────┐       │         │
│         │ 1. 验证请求签名              │       │         │
│         │ 2. 调用飞书 API 拉数据       │       │         │
│         │ 3. 执行业务逻辑              │       │         │
│         │ 4. 可选：更新记录状态        │       │         │
│         │ 5. 可选：发飞书消息通知用户     │       │
│         └────────────────────────────┘       │         │
│                                           │         │
└───────────────────────────────────────────────────────────┘
```

### 2. 飞书侧配置（用户操作）

#### 2.1 创建按钮字段

在 Bitable 表格中添加「按钮」类型字段：

| 配置项 | 说明 |
|---------|------|
| 按钮文本 | 如「同步到 friendsAI」 |
| 按钮颜色 | 建议色 |
| 执行动作 | 选择「调用 Webhook」 |
| Webhook URL | friendsAI 提供的回调地址 |

#### 2.2 配置 Automation

1. 触发条件：**「当按钮被点击时」**
2. 执行动作：**「调用 Webhook」**
3. 配置 Webhook URL（见下文）

### 3. friendsAI 侧实现

#### 3.1 Webhook 接口

**路径：** `POST /v1/webhooks/feishu/button`**

**请求格式：**
```json
{
  "timestamp": 17393568000000,
  "token": "验证签名字符串",
  "app_token": "bascnxxxxxxxxxxxxx",
  "table_id": "tblxxxxxxxxxxxxx",
  "record_id": "recxxxxxxxxxxxxx",
  "button_id": "btnxxxxxxxxxxxxx",
  "user_id": "ou_xxxxxxxxxxxxxx",
  "view_id": "vewxxxxxxxxxxxxx"  // 可选
}
```

**安全：** 验证飞书签名（`X-Lark-Request-Id` + `X-Lark-Signature`）

#### 3.2 核心服务逻辑

```typescript
// packages/server-nestjs/src/feishu/feishu-webhook.service.ts

@Injectable()
export class FeishuWebhookService {
  constructor(
    private config: ConfigService,
    private http: HttpService,
  ) {}

  async handleButtonClick(dto: ButtonClickDto) {
    // 1. 验证签名
    this.verifySignature(dto);

    // 2. 调用飞书 API 获取记录数据
    const record = await this.getBitableRecord(dto);
    const relatedData = await this.fetchRelatedData(dto);

    // 3. 执行业务逻辑
    const result = await this.processBusinessLogic(record, relatedData);

    // 4. 可选：更新记录状态
    if (result.success) {
      await this.updateRecordStatus(dto.record_id, {
        status: 'processed',
        result: result.summary
      });
    }

    // 5. 可选：发飞书消息通知用户
    await this.sendFeishuNotification(dto.user_id, {
      msg_type: 'interactive',
      card: this.buildResultCard(result)
    });

    return { success: true, data: result };
  }

  private async getBitableRecord(dto: ButtonClickDto) {
    // 调用飞书 API: app_token + table_id + record_id
    // 使用已存储的 tenant_access_token
  }

  private async fetchRelatedData(dto: ButtonClickDto) {
    // 根据 record 内容，调用飞书 API 拉取关联数据
    // 如关联的其他表格记录、用户信息等
  }

  private async sendFeishuNotification(userId: string, card: Card) {
    // 调用飞书 API 发送卡片消息
    // 使用已存储的 user_access_token
  }
}
```

#### 3.3 需要的飞书 API

| API | 用途 | 权限 |
|-----|------|--------|
| `Search records` | 查询 Bitable 记录 | `bitable:app` |
| `Get record` | 获取单条记录详情 | `bitable:app` |
| `Update record` | 更新记录状态 | `bitable:app` |
| `Send message` | 发卡片消息通知用户 | `im:message` |
| `Get user info` | 获取用户信息 | `contact:user.base:readonly` |

---

## 数据模型

### 4.1 新增实体

```typescript
// packages/server-nestjs/src/entities/feishu-config.entity.ts

@Entity({ name: 'feishu_configs' })
export class FeishuConfig {
  @PrimaryGeneratedColumn('uuid', { uuidVersion: '7' })
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar', { length: 255 })
  appToken: string | null;        // Bitable app_token

  @Column('varchar', { length: 255 })
  tableId: string | null;       // Bitable table_id

  @Column('varchar', { length: 255, nullable: true })
  webhookUrl: string | null;      // 用户自定义 webhook URL

  @Column('boolean', { default: true })
  enabled: boolean;

  @Column('timestamp with time zone', { default: () => 'NOW()' })
  createdAt: Date;
}

@Entity({ name: 'feishu_webhook_logs' })
export class FeishuWebhookLog {
  @PrimaryGeneratedColumn('uuid', { uuidVersion: '7' })
  id: string;

  @Column('varchar', { length: 255 })
  appToken: string;

  @Column('varchar', { length: 255 })
  tableId: string;

  @Column('varchar', { length: 255 })
  recordId: string;

  @Column('varchar', { length: 255, nullable: true })
  buttonId: string | null;

  @Column('varchar', { length: 255 })
  userId: string;

  @Column('jsonb', { nullable: true })
  payload: Record<string, unknown>;

  @Column('smallint', { default: 0 })
  status: number;  // 0=received, 1=processing, 2=completed, 3=failed

  @Column('text', { nullable: true })
  errorMessage: string | null;

  @Column('timestamp with time zone', { default: () => 'NOW()' })
  receivedAt: Date;

  @Column('timestamp with time zone', { nullable: true })
  processedAt: Date | null;
}
```

### 4.2 DTO

```typescript
// packages/server-nestjs/src/feishu/dto/button-click.dto.ts

export class ButtonClickDto {
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  appToken: string;

  @IsString()
  tableId: string;

  @IsString()
  recordId: string;

  @IsString()
  buttonId: string;

  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  viewId?: string;
}
```

---

## API 接口

### 5.1 Webhook 接收接口

```typescript
// packages/server-nestjs/src/feishu/feishu-webhook.controller.ts

@Controller('feishu/webhooks')
@ApiTags('feishu')
export class FeishuWebhookController {
  constructor(private service: FeishuWebhookService) {}

  @Post('button')
  @ApiOperation({ summary: '接收飞书按钮点击回调' })
  @ApiResponse({ status: 200, description: '处理成功' })
  async handleButtonClick(@Body() dto: ButtonClickDto) {
    return this.service.handleButtonClick(dto);
  }
}
```

### 5.2 配置管理接口

```typescript
// packages/server-nestjs/src/feishu/feishu-config.controller.ts

@Controller('v1/feishu/config')
@ApiTags('feishu')
export class FeishuConfigController {
  constructor(private service: FeishuConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取用户飞书配置' })
  async getConfig(@RequestUser() userId: string) {
    return this.service.getConfig(userId);
  }

  @Post()
  @ApiOperation({ summary: '保存飞书配置' })
  async saveConfig(@RequestUser() userId: string, @Body() dto: SaveConfigDto) {
    return this.service.saveConfig(userId, dto);
  }
}
```

---

## OAuth 与 Token 管理

### 6.1 Token 类型

| Token 类型 | 用途 | 获取方式 |
|------------|------|-----------|
| `tenant_access_token` | 服务端调用飞书 API | 应用凭证（app_id + app_secret） |
| `user_access_token` | 代表用户操作 | 用户 OAuth 授权 |

### 6.2 Token 存储策略

```typescript
// packages/server-nestjs/src/entities/connector-token.entity.ts (已存在)

@Entity({ name: 'connector_tokens' })
export class ConnectorToken {
  @PrimaryGeneratedColumn('uuid', { uuidVersion: '7' })
  id: string;

  @Column('varchar', { length: 100 })
  provider: string;  // 'feishu'

  @Column('uuid')
  userId: string;

  @Column('text')
  accessToken: string;

  @Column('timestamp with time zone', { nullable: true })
  expiresAt: Date | null;
}
```

---

## 安全考虑

### 7.1 Webhook 签名验证

飞书 Webhook 请求头包含签名信息：

```typescript
private verifySignature(dto: ButtonClickDto) {
  const signature = dto.headers['x-lark-signature'];
  const requestId = dto.headers['x-lark-request-id'];

  // 根据飞书加密 Secret 验证签名
  const expectedSign = this.generateSignature(
    JSON.stringify(dto.payload),
    this.config.get('FEISHU_ENCRYPT_KEY'),
  );

  if (signature !== expectedSign) {
    throw new UnauthorizedException('Invalid signature');
  }
}
```

### 7.2 其他安全措施

| 措施 | 说明 |
|-------|------|
| HTTPS | Webhook 必须使用 HTTPS |
| 速率限制 | 限制单用户/单 IP 请求频率 |
| 幂等性 | 使用 `timestamp` + `record_id` 去重 |
| 日志审计 | 记录所有 webhook 调用用于排查 |

---

## 飞书侧配置指南（用户端）

### 8.1 步骤

1. **在 Bitable 中添加按钮字段**
   - 字段类型选择「按钮」
   - 设置按钮文本和颜色

2. **配置 Automation**
   - 进入「自动化」
   - 新建 Automation，触发条件选择「当按钮被点击时」
   - 执行动作选择「调用 Webhook」
   - 输入 friendsAI 提供的 Webhook URL

3. **测试**
   - 点击按钮，验证 friendsAI 是否收到请求
   - 查看日志确认处理结果

### 8.2 Webhook URL 配置

```
环境          Webhook URL 示例
─────────────────────────────────────────────────────────────
开发          https://dev.friendsai.com/v1/webhooks/feishu/button
测试          https://test.friendsai.com/v1/webhooks/feishu/button
生产          https://api.friendsai.com/v1/webhooks/feishu/button
```

---

## 实施里程碑

### Phase 1: 基础设施（2-3 天）
- [ ] 创建 FeishuConfig、FeishuWebhookLog 实体
- [ ] 实现 Webhook 签名验证
- [ ] 搭建 Webhook 接口框架
- [ ] OAuth 基础（复用现有 connectors 模块）

### Phase 2: Webhook 核心逻辑（3-4 天）
- [ ] 实现按钮点击处理 service
- [ ] 集成飞书 API 调用（查询/更新记录）
- [ ] 实现飞书消息发送（通知用户结果）
- [ ] 添加错误处理和重试机制

### Phase 3: 配置管理（2-3 天）
- [ ] 实现配置保存/查询接口
- [ ] 前端配置页面（输入 Webhook URL）
- [ ] 多租户隔离（不同用户独立配置）

### Phase 4: 测试与上线（1-2 天）
- [ ] 单元测试（service 层逻辑）
- [ ] 集成测试（Webhook 端到端）
- [ ] 飞书端联调（真实按钮点击）
- [ ] 文档更新

---

## 附录

### A.1 参考文档

- [飞书 Bitable 按钮 Automation](https://www.feishu.cn/hc/en-US/articles/339066898695-use-button-fields-in-base)
- [飞书 Automation 触发条件](https://open.feishu.cn/document/common-c3xc3r/automation/trigger-condition)
- [查询记录 API](https://open.feishu.cn/document/docs/bitable-v1/app-table-record/search)

### A.2 飞书 API 权限

```json
{
  "bitable:app": "查看和管理多维表格及其数据表",
  "bitable:app:readonly": "查看多维表格及其数据表",
  "contact:user.base:readonly": "读取用户基础信息",
  "im:message": "发送飞书消息"
}
```

---

**文档版本：** v1.0
**创建日期：** 2026-02-12
**分支：** Assistant-dog-5.3
