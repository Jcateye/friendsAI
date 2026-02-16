# 飞书机器人 + 多维表格集成设计方案

**项目**: friendsAI
**模块**: 飞书集成
**版本**: v1.0
**日期**: 2026-02-10

---

## 1. 概述

### 1.1 设计目标

将 friendsAI 的 AI 分析能力与飞书深度集成，使用户能够在飞书内完成联系人分析、事实提取、待办管理等核心工作流。

### 1.2 核心场景

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户工作流                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 飞书私聊/群聊 → @机器人发送对话内容                           │
│                                                                  │
│  2. AI 分析 → 提取联系人、事实、待办                              │
│                                                                  │
│  3. 卡片展示 → 用户确认/修正                                      │
│                                                                  │
│  4. 保存 → friendsAI 数据库 + 飞书多维表格                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 模块边界

| 边界 | 包含 | 不包含 |
|------|------|--------|
| **功能** | 机器人对话、卡片交互、多维表格同步 | 飞书文档、日历、审批 |
| **数据** | Contact/ContactFact/ContactTodo 双向同步 | 企业全量数据（需企业集成版） |
| **用户** | 第三方应用商店用户 | 企业管理员配置 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              飞书平台                                    │
│  ┌──────────────────┐                    ┌──────────────────────────┐   │
│  │   飞书客户端      │                    │      多维表格            │   │
│  │  ┌────────────┐  │                    │  ┌────────────────────┐ │   │
│  │  │  私聊窗口   │  │                    │  │  联系人表         │ │   │
│  │  └────────────┘  │                    │  └────────────────────┘ │   │
│  │  ┌────────────┐  │                    │  ┌────────────────────┐ │   │
│  │  │  群聊 @    │  │                    │  │  事实表           │ │   │
│  │  └────────────┘  │                    │  └────────────────────┘ │   │
│  │  ┌────────────┐  │                    │  ┌────────────────────┐ │   │
│  │  │  卡片消息   │  │                    │  │  待办表           │ │   │
│  │  └────────────┘  │                    │  └────────────────────┘ │   │
│  └────────┬─────────┘                    └──────────┬───────────────┘   │
└───────────┼──────────────────────────────────────────┼───────────────────┘
            │                                      │
            │ Webhook 事件                          │ OAuth 2.0 API
            │                                      │
┌───────────▼──────────────────────────────────────▼───────────────────────┐
│                          friendsAI 后端 (NestJS)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                         feishu.module                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  │
│  │  │webhook.ctrl  │  │card.service  │  │bitable-sync.service       │ │  │
│  │  │- 事件接收     │  │- 卡片构建     │  │- 双向数据同步             │ │  │
│  │  │- 消息解析     │  │- 卡片更新     │  │- 字段映射                 │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │  │
│  │                                                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  │
│  │  │feishu.client │  │oauth.service │  │event-processor.service    │ │  │
│  │  │- API 调用     │  │- Token 管理   │  │- 消息转 AI Prompt         │ │  │
│  │  │- 请求重试     │  │- 授权流程     │  │- 结果解析                 │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    现有模块 (复用)                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  │
│  │  │agent.module  │  │contacts.module│  │conversations.module      │ │  │
│  │  │- AI Runtime  │  │- Contact CRUD │  │- Conversation CRUD        │ │  │
│  │  │- 工具确认     │  │- 事实/待办    │  │- 消息管理                 │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    数据层                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  │
│  │  │FeishuConfig  │  │ConnectorToken│  │现有实体 (Contact/Fact/..) │ │  │
│  │  │- 表格配置     │  │- OAuth Token  │  │                          │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2.2 模块依赖关系

```
feishu.module
    ├── depends on → agent.module (AI 分析)
    ├── depends on → contacts.module (联系人存储)
    ├── depends on → conversations.module (会话存储)
    ├── depends on → connectors.module (OAuth Token 管理)
    └── exposes → WebhookController (飞书事件入口)
```

---

## 3. 数据模型设计

### 3.1 FeishuConfig 实体

存储用户的多维表格配置映射。

```typescript
@Entity({ name: 'feishu_configs' })
export class FeishuConfig {
  @PrimaryGeneratedColumn('uuid', { uuidVersion: '7' })
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  // 飞书应用配置
  @Column({ nullable: true })
  bitableAppToken: string;      // 飞书多维表格应用 token

  // 表格 ID 映射
  @Column({ nullable: true })
  contactsTableId: string;      // 联系人表 ID

  @Column({ nullable: true })
  factsTableId: string;         // 事实表 ID

  @Column({ nullable: true })
  todosTableId: string;         // 待办表 ID

  @Column({ nullable: true })
  conversationsTableId: string; // 会话表 ID (可选)

  // 同步配置
  @Column({ default: true })
  syncEnabled: boolean;         // 是否启用自动同步

  @Column({ default: 'auto' })
  syncMode: 'auto' | 'manual' | 'disabled';  // 同步模式

  @Column({ nullable: true, type: 'bigint', transformer: timestampMsTransformer })
  lastSyncedAt: Date;           // 最后同步时间

  // 字段映射配置 (灵活映射用户自定义字段)
  @Column({ type: 'jsonb', nullable: true })
  fieldMapping: {
    contacts?: Record<string, string>;  // friendsAI 字段 → 飞书字段
    facts?: Record<string, string>;
    todos?: Record<string, string>;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;
}
```

### 3.2 数据映射关系

| friendsAI 实体 | 飞书多维表格 | 字段映射 |
|----------------|--------------|----------|
| **Contact** | 联系人表 | |
| └─ id | record_id | 外键关联 |
| └─ name | name | 姓名 |
| └─ email | email | 邮箱 |
| └─ phone | phone | 电话 |
| └─ company | company | 公司 |
| └─ position | position | 职位 |
| └─ tags | tags | 多选标签 |
| └─ note | notes | 备注 |
| **ContactFact** | 事实表 | |
| └─ content | content | 事实内容 |
| └─ sourceConversationId | source_conversation | 来源会话 |
| └─ createdAt | extracted_at | 提取时间 |
| **ContactTodo** | 待办表 | |
| └─ content | task | 任务内容 |
| └─ status | status | 状态 |
| └─ dueAt | due_date | 截止日期 |
| **Conversation** | 会话表 | |
| └─ title | title | 标题 |
| └─ content | content | 内容 |
| └─ summary | summary | 摘要 |

---

## 4. API 设计

### 4.1 Webhook 入口

#### POST /feishu/webhook

接收飞书事件推送。

```typescript
// 请求体 (飞书事件)
interface FeishuWebhookEvent {
  token: string;              // 验证令牌
  challenge?: string;         // URL 验证时返回
  type: 'url_verification' | 'event_callback';
  timestamp: string;
  event?: {
    operator_id: string;      // 操作人 open_id
    app_id: string;
    type: string;             // 事件类型
    // 消息事件
    message?: {
      chat_id: string;
      chat_type: 'private' | 'group';
      content: string;        // JSON 消息内容
      message_id: string;
      sender_id: string;
    };
    // 卡片事件
    action?: {
      value: Record<string, any>;
      token: string;
    };
  };
}

// 响应 (URL 验证)
interface WebhookVerificationResponse {
  challenge: string;
}

// 响应 (事件确认)
interface WebhookAckResponse {
  code: 0;
  msg: 'success';
}
```

### 4.2 多维表格同步 API

#### POST /feishu/bitable/sync/:type

手动触发同步到飞书表格。

```typescript
// 路径参数
type SyncType = 'contact' | 'fact' | 'todo' | 'all';

// 请求体
interface BitableSyncRequest {
  entityId?: string;          // 可选：指定同步某个实体
  force?: boolean;             // 是否强制覆盖
}

// 响应
interface BitableSyncResponse {
  success: boolean;
  synced: number;
  failed: number;
  errors?: Array<{
    entity: string;
    error: string;
  }>;
}
```

#### GET /feishu/bitable/config

获取/设置多维表格配置。

```typescript
// 响应
interface BitableConfigResponse {
  configured: boolean;
  config?: {
    bitableAppToken: string;
    contactsTableId?: string;
    factsTableId?: string;
    todosTableId?: string;
    syncEnabled: boolean;
    syncMode: 'auto' | 'manual' | 'disabled';
    lastSyncedAt?: string;
  };
}
```

#### POST /feishu/bitable/config

设置多维表格配置。

```typescript
// 请求体
interface BitableConfigUpdateRequest {
  bitableAppToken: string;
  contactsTableId?: string;
  factsTableId?: string;
  todosTableId?: string;
  syncEnabled?: boolean;
  syncMode?: 'auto' | 'manual' | 'disabled';
  fieldMapping?: {
    contacts?: Record<string, string>;
    facts?: Record<string, string>;
    todos?: Record<string, string>;
  };
}
```

### 4.3 OAuth 相关 API

扩展现有 `connectors` 模块：

#### POST /connectors/feishu/token

实现 OAuth token 交换（目前是占位）。

```typescript
// 请求体
interface FeishuTokenExchangeRequest {
  code: string;
  redirectUri: string;
}

// 响应
interface FeishuTokenExchangeResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  error?: string;
}
```

---

## 5. 交互流程设计

### 5.1 机器人对话分析流程

```
用户                           friendsAI 后端                    AI Agent
 │                                  │                              │
 │ @机器人 "今天和张三聊了..."      │                              │
 ├─────────────────────────────────►│                              │
 │                                  │ 1. 解析消息                   │
 │                                  │ 2. 构建 AI Prompt            │
 │                                  ├─────────────────────────────►│
 │                                  │                              │ 3. AI 分析
 │                                  │                              │ - 提取联系人
 │                                  │                              │ - 提取事实
 │                                  │                              │ - 生成待办
 │                                  │◄─────────────────────────────┤
 │                                  │ 4. 分析结果                   │
 │ 卡片消息 (分析结果)              │                              │
 │◄─────────────────────────────────┤                              │
 │ ┌────────────────────────────┐   │                              │
 │ │ 📊 联系人：张三              │   │                              │
 │ │ 🏢 公司：ABC科技             │   │                              │
 │ │ ──────────────────────────  │   │                              │
 │ │ 📝 事实：                   │   │                              │
 │ │ • 主导过云平台迁移项目       │   │                              │
 │ │ • 关注 Serverless 技术      │   │                              │
 │ │ ──────────────────────────  │   │                              │
 │ │ ✅ 待办：                   │   │                              │
 │ │ • [ ] 发送产品资料           │   │                              │
 │ │ • [ ] 安排技术对接会议       │   │                              │
 │ │ ──────────────────────────  │   │                              │
 │ │ [保存] [同步飞书表格]       │   │                              │
 │ └────────────────────────────┘   │                              │
 │                                  │                              │
 │ 点击 [保存] 按钮                  │                              │
 ├─────────────────────────────────►│                              │
 │                                  │ 5. 保存到数据库               │
 │                                  │ 6. (可选) 同步到飞书表格       │
 │                                  │                              │
 │ ✅ "已保存到联系人库"             │                              │
 │◄─────────────────────────────────┤                              │
```

### 5.2 卡片交互处理流程

```typescript
// 卡片按钮点击事件
interface CardActionEvent {
  token: string;              // 卡片 token
  action: {
    value: {
      action: 'save' | 'sync_bitable' | 'save_and_sync';
      data: {
        contactName: string;
        facts: string[];
        todos: string[];
      };
    };
  };
}

// 处理流程
async handleCardAction(event: CardActionEvent) {
  const { action, data } = event.action.value;

  switch (action) {
    case 'save':
      // 保存到 friendsAI 数据库
      await saveToDatabase(data);
      return updateCard('✅ 已保存');

    case 'sync_bitable':
      // 同步到飞书表格
      await syncToBitable(data);
      return updateCard('✅ 已同步到飞书表格');

    case 'save_and_sync':
      // 保存 + 同步
      await saveToDatabase(data);
      await syncToBitable(data);
      return updateCard('✅ 已保存并同步');
  }
}
```

### 5.3 多维表格双向同步流程

```
friendsAI                          飞书多维表格
    │                                     │
    │ 1. AI 分析完成，生成 Contact/Fact   │
    │    ────────────────────────────────►│ 2. 写入记录
    │                                     │    POST /records
    │                                     │
    │ 3. 用户在飞书表格中修改             │
    │◄────────────────────────────────────│ 4. 数据变更事件
    │                                     │
    │ 5. 同步变更到 friendsAI              │
    │    ────────────────────────────────►│ 6. 更新记录
    │    PATCH /records/{id}              │
```

---

## 6. 卡片消息设计

### 6.1 联系人分析卡片

```typescript
interface ContactAnalysisCard {
  config: {
    wide_screen_mode: true;
  };
  header: {
    title: {
      content: '📊 联系人分析结果';
      tag: 'plain_text';
    };
  };
  elements: Array<
    | TextElement
    | DividerElement
    | ActionElement
  >;
}

// 实际 JSON 示例
const cardJson = {
  config: { wide_screen_mode: true },
  header: {
    title: { content: '📊 联系人分析结果', tag: 'plain_text' }
  },
  elements: [
    // 联系人基本信息
    {
      tag: 'div',
      fields: [
        {
          is_short: true,
          text: { tag: 'lark_md', content: '**姓名**: 张三' }
        },
        {
          is_short: true,
          text: { tag: 'lark_md', content: '**公司**: ABC科技' }
        },
        {
          is_short: true,
          text: { tag: 'lark_md', content: '**职位**: 技术总监' }
        },
        {
          is_short: true,
          text: { tag: 'lark_md', content: '**邮箱**: zhangsan@example.com' }
        }
      ]
    },
    // 分割线
    { tag: 'hr' },
    // 提取的事实
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: '**📝 提取的事实**\n• 曾在2024年Q1主导过云平台迁移项目\n• 关注 Serverless 和 AI Agent 技术栈\n• 目前正在评估新的 CRM 系统'
      }
    },
    // 分割线
    { tag: 'hr' },
    // 建议的待办
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: '**✅ 建议待办**\n• [ ] 下周三前发送产品资料\n• [ ] 安排技术团队对接会议\n• [ ] 准备 CRM 方案演示'
      }
    },
    // 操作按钮
    {
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: { tag: 'plain_text', content: '保存到联系人库' },
          type: 'primary',
          value: {
            action: 'save',
            data: { /* 分析结果数据 */ }
          }
        },
        {
          tag: 'button',
          text: { tag: 'plain_text', content: '同步到飞书表格' },
          value: {
            action: 'sync_bitable',
            data: { /* 分析结果数据 */ }
          }
        },
        {
          tag: 'button',
          text: { tag: 'plain_text', content: '保存并同步' },
          type: 'primary',
          value: {
            action: 'save_and_sync',
            data: { /* 分析结果数据 */ }
          }
        }
      ]
    }
  ]
};
```

### 6.2 同步状态卡片

```typescript
const syncStatusCard = {
  config: { wide_screen_mode: true },
  header: {
    title: { content: '🔄 同步状态', tag: 'plain_text' }
  },
  elements: [
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: '**同步时间**: 2026-02-10 14:30\n**同步数量**: 3 条联系人，5 条事实，2 条待办'
      }
    },
    {
      tag: 'hr'
    },
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: '**同步详情**:\n✅ 联系人 "张三" - 已同步\n✅ 联系人 "李四" - 已同步\n⚠️ 联系人 "王五" - 字段缺失，跳过'
      }
    }
  ]
};
```

---

## 7. 服务设计

### 7.1 模块结构

```
packages/server-nestjs/src/feishu/
├── feishu.module.ts
├── controllers/
│   ├── webhook.controller.ts        # 飞书事件 Webhook
│   └── bitable.controller.ts        # 多维表格操作 API
├── services/
│   ├── webhook.service.ts           # 事件处理
│   ├── card.service.ts              # 卡片构建/更新
│   ├── bitable-sync.service.ts      # 多维表格同步
│   ├── message.service.ts           # 消息发送
│   └── feishu-api.service.ts        # 飞书 API 客户端
├── dto/
│   ├── webhook-event.dto.ts
│   ├── card.dto.ts
│   └── bitable-sync.dto.ts
├── types/
│   └── feishu.types.ts
└── constants/
    └── feishu.constants.ts
```

### 7.2 核心服务接口

#### WebhookService

```typescript
@Injectable()
export class WebhookService {
  constructor(
    private cardService: CardService,
    private eventProcessorService: EventProcessorService,
  ) {}

  // 处理 Webhook 事件
  async handleEvent(event: FeishuWebhookEvent): Promise<void> {
    if (event.type === 'url_verification') {
      return this.handleVerification(event);
    }

    if (event.type === 'event_callback') {
      return this.handleCallback(event);
    }
  }

  // URL 验证
  private async handleVerification(event: FeishuWebhookEvent): Promise<void> {
    // 返回 challenge
  }

  // 事件回调处理
  private async handleCallback(event: FeishuWebhookEvent): Promise<void> {
    switch (event.event?.type) {
      case 'im.message.receive_v1':
        await this.handleMessage(event.event);
        break;
      case 'card.action.trigger':
        await this.handleCardAction(event.event);
        break;
    }
  }

  // 处理消息
  private async handleMessage(event: FeishuEvent): Promise<void> {
    // 1. 解析消息内容
    // 2. 调用 AI 分析
    // 3. 发送卡片回复
  }

  // 处理卡片操作
  private async handleCardAction(event: FeishuEvent): Promise<void> {
    // 1. 解析操作类型
    // 2. 执行相应操作
    // 3. 更新卡片状态
  }
}
```

#### BitableSyncService

```typescript
@Injectable()
export class BitableSyncService {
  constructor(
    @InjectRepository(FeishuConfig)
    private feishuConfigRepo: Repository<FeishuConfig>,
    private feishuApiService: FeishuApiService,
  ) {}

  // 同步联系人到飞书表格
  async syncContact(userId: string, contactId: string): Promise<void> {
    const config = await this.getConfig(userId);
    const contact = await this.getContact(contactId);

    const record = this.mapContactToRecord(contact);
    await this.feishuApiService.createRecord(
      config.bitableAppToken,
      config.contactsTableId,
      record,
    );
  }

  // 从飞书表格同步联系人
  async syncContactFromBitable(userId: string): Promise<void> {
    const config = await this.getConfig(userId);
    const records = await this.feishuApiService.getRecords(
      config.bitableAppToken,
      config.contactsTableId,
    );

    for (const record of records) {
      const contact = this.mapRecordToContact(record);
      await this.saveContact(contact);
    }
  }

  // 批量同步
  async syncAll(userId: string, type: SyncType): Promise<BitableSyncResponse> {
    // 实现批量同步逻辑
  }

  // 字段映射
  private mapContactToRecord(contact: Contact): Record<string, any> {
    const config = await this.getConfig(contact.userId);
    const mapping = config.fieldMapping?.contacts || {};

    const record: Record<string, any> = {};

    // 使用用户自定义映射或默认映射
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      record[targetField] = contact[sourceField];
    }

    return record;
  }
}
```

#### CardService

```typescript
@Injectable()
export class CardService {
  // 构建联系人分析卡片
  buildContactAnalysisCard(data: ContactAnalysisData): string {
    return JSON.stringify({
      config: { wide_screen_mode: true },
      header: { title: { content: '📊 联系人分析结果', tag: 'plain_text' } },
      elements: [
        // ... 卡片元素
      ],
    });
  }

  // 构建同步状态卡片
  buildSyncStatusCard(data: SyncStatusData): string {
    // ...
  }

  // 更新卡片
  async updateCard(cardToken: string, newCard: string): Promise<void> {
    // 调用飞书 API 更新卡片
  }
}
```

#### FeishuApiService

```typescript
@Injectable()
export class FeishuApiService {
  private baseUrl = 'https://open.feishu.cn/open-apis';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  // 获取 tenant_access_token
  async getTenantAccessToken(): Promise<string> {
    // 缓存 token
  }

  // 发送消息
  async sendMessage(chatId: string, msgType: string, content: any): Promise<void> {
    const token = await this.getTenantAccessToken();
    // ...
  }

  // 更新卡片
  async updateCard(token: string, card: string): Promise<void> {
    // ...
  }

  // 创建记录
  async createRecord(appToken: string, tableId: string, record: any): Promise<void> {
    // ...
  }

  // 获取记录
  async getRecords(appToken: string, tableId: string): Promise<any[]> {
    // ...
  }

  // 更新记录
  async updateRecord(appToken: string, tableId: string, recordId: string, record: any): Promise<void> {
    // ...
  }
}
```

---

## 8. 环境变量配置

```env
# 飞书应用配置
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxx
FEISHU_ENCRYPT_KEY=your_verification_token_encryption_key
FEISHU_VERIFICATION_TOKEN=your_verification_token

# OAuth 配置
FEISHU_OAUTH_AUTHORIZE_URL=https://open.feishu.cn/open-apis/authen/v1/authorize
FEISHU_OAUTH_TOKEN_URL=https://open.feishu.cn/open-apis/authen/v3/tenant_access_token/internal
FEISHU_OAUTH_REDIRECT_URI=https://your-domain.com/connectors/feishu/callback
FEISHU_OAUTH_SCOPE=contact:user.base:readonly,bitable:app:readonly

# API 配置
FEISHU_API_BASE_URL=https://open.feishu.cn/open-apis
FEISHU_BITABLE_API_URL=https://open.feishu.cn/open-apis/bitable/v1

# 功能开关
FEISHU_BOT_ENABLED=true
FEISHU_BITABLE_SYNC_ENABLED=true
FEISHU_AUTO_SYNC_ON_ANALYSIS=true
```

---

## 9. 错误处理

### 9.1 错误类型

| 错误类型 | 场景 | 处理策略 |
|----------|------|----------|
| `FEISHU_AUTH_FAILED` | Token 过期/无效 | 刷新 Token，重试 |
| `FEISHU_RATE_LIMIT` | API 调用超限 | 指数退避重试 |
| `FEISHU_PERMISSION_DENIED` | 权限不足 | 提示用户重新授权 |
| `FEISHU_TABLE_NOT_FOUND` | 表格不存在 | 提示用户配置表格 |
| `FEISHU_INVALID_WEBHOOK` | Webhook 验证失败 | 记录日志，拒绝请求 |

### 9.2 重试策略

```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const feishuRetryConfig: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};
```

---

## 10. 安全考虑

### 10.1 Webhook 验证

```typescript
async verifyWebhook(event: FeishuWebhookEvent): Promise<boolean> {
  // 1. 验证 token
  const expectedToken = this.configService.get('FEISHU_VERIFICATION_TOKEN');
  if (event.token !== expectedToken) {
    return false;
  }

  // 2. 验证时间戳 (防重放)
  const eventTime = parseInt(event.timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - eventTime) > 300) { // 5 分钟
    return false;
  }

  return true;
}
```

### 10.2 数据隔离

- 所有操作基于 `userId` 隔离
- 多维表格配置按用户存储
- 同步操作仅处理用户授权的数据

### 10.3 Token 安全

- Access Token 加密存储
- Refresh Token 仅用于刷新，不暴露给前端
- Token 过期自动刷新

---

## 11. 测试计划

### 11.1 单元测试

- WebhookService 事件处理
- CardService 卡片构建
- BitableSyncService 数据映射

### 11.2 集成测试

- 飞书 API Mock 服务
- 端到端同步流程

### 11.3 手动测试

| 场景 | 步骤 | 预期结果 |
|------|------|----------|
| 机器人对话 | @机器人发送消息 | 返回分析卡片 |
| 保存联系人 | 点击保存按钮 | 保存成功，卡片更新 |
| 同步表格 | 点击同步按钮 | 数据写入飞书表格 |
| Token 过期 | 使用过期 Token | 自动刷新，重试成功 |

---

## 12. 实施里程碑

### Phase 1: 基础搭建 (1-2 天)

- [ ] feishu.module 搭建
- [ ] WebhookController 实现
- [ ] Webhook 验证逻辑
- [ ] FeishuConfig 实体与迁移

### Phase 2: 机器人对话 (2-3 天)

- [ ] 消息事件处理
- [ ] AI 分析集成
- [ ] 卡片消息构建
- [ ] 卡片交互处理

### Phase 3: 多维表格同步 (2-3 天)

- [ ] 飞书 API 客户端
- [ ] 数据映射逻辑
- [ ] 双向同步服务
- [ ] 同步配置管理

### Phase 4: 前端集成 (1-2 天)

- [ ] OAuth 授权引导
- [ ] 表格配置页面
- [ ] 同步状态展示

---

*文档版本: v1.0*
*最后更新: 2026-02-10*
