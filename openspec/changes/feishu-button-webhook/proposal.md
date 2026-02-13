# Feature: feishu-button-webhook

## Summary

实现飞书多维表格（Bitable）按钮点击后的外部 Webhook 回调处理，使 friendsAI 能够响应飞书侧的按钮操作，调用飞书 API 拉取数据并执行后续业务逻辑。

## Motivation

用户需要在飞书 Bitable 中点击按钮后触发 friendsAI 的业务逻辑。通过飞书 Automation + Webhook 的模式，实现：

1. **查询 Bitable 记录** - 根据按钮点击上下文获取记录数据
2. **执行业务处理** - 使用拉取的数据进行后续操作（如发消息通知）
3. **可选：更新记录状态** - 标记处理结果

**为什么不用 MCP：**
- 需求简单明确（只读 + 触发按钮），MCP 过度设计
- 飞书按钮不支持直触 API，必须通过 Automation/Webhook 间接触发
- 方案更轻量，直接调用 OpenAPI 即可

## Proposed Solution

### 架构设计

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
│         │  - timestamp      │               │         │
│         │  - token (签名)   │               │         │
│         │  - app_token     │               │         │
│         │  - table_id       │               │         │
│         │  - record_id      │               │         │
│         │  - button_id       │               │         │
│         │  - user_id        │               │         │
│         │  - view_id (可选) │               │         │
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
│         │ 5. 可选：发飞书消息通知用户     │       │         │
│         └────────────────────────────┘       │         │
│                                           │         │
└───────────────────────────────────────────────────────────┘
```

### 核心模块

| 模块 | 职责 | 文件位置 |
|-------|--------|----------|
| **Webhook 接收** | `feishu/webhook.controller.ts` | `src/feishu/webhook/` |
| **签名验证** | `feishu/webhook.service.ts` | `src/feishu/webhook/` |
| **飞书 API 封装** | `feishu/api.service.ts` | `src/feishu/api.service.ts` |
| **配置管理** | `feishu/config.controller.ts` | `src/feishu/config.controller.ts` |
| **数据模型** | Entity + DTO | `src/entities/` + `src/feishu/dto/` |
| **OAuth 复用** | 现有 `connectors` 模块 | `src/connectors/` |

### API 设计

```
POST /v1/webhooks/feishu/button
```

**请求 DTO：**
```typescript
export class ButtonClickDto {
  @IsString() timestamp: string;
  @IsString() token: string;
  @IsString() appToken: string;
  @IsString() tableId: string;
  @IsString() recordId: string;
  @IsString() buttonId: string;
  @IsString() userId: string;
  @IsOptional() viewId?: string;
}
```

**响应：**
```typescript
{
  success: true,
  message: "处理成功",
  data?: {
    recordId: string;
    status: "processed";
    result: any;
  }
}
```

### 数据模型

**新增实体：**

```typescript
// feishu_config.entity.ts - 用户配置
@Entity({ name: 'feishu_configs' })
export class FeishuConfig {
  @PrimaryGeneratedColumn('uuid', { uuidVersion: '7' })
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar', { length: 255, nullable: true })
  appToken: string | null;

  @Column('varchar', { length: 255, nullable: true })
  tableId: string | null;

  @Column('varchar', { length: 255, nullable: true })
  webhookUrl: string | null;

  @Column('boolean', { default: true })
  enabled: boolean;

  @Column('timestamp with time zone', { default: () => 'NOW()' })
  createdAt: Date;
}

// feishu_webhook_log.entity.ts - Webhook 调用日志
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
  status: number; // 0=received, 1=processing, 2=completed, 3=failed

  @Column('text', { nullable: true })
  errorMessage: string | null;

  @Column('timestamp with time zone', { default: () => 'NOW()' })
  receivedAt: Date;

  @Column('timestamp with time zone', { nullable: true })
  processedAt: Date | null;
}
```

### 飞书 API 依赖

| API | 权限 | 用途 |
|-----|--------|------|
| `bitable:app:readonly` | 查看 Bitable 应用和表格 | 查询记录 |
| `bitable:app` | 管理 Bitable 应用 | 更新记录状态 |
| `contact:user.base:readonly` | 读取用户基础信息 | 获取用户信息 |
| `im:message` | 发送消息 | 发送卡片通知用户 |

## Alternatives Considered

### 方案 A：完整 MCP 服务器集成
- **描述：** 部署完整的飞书 MCP 服务，friendsAI 作为 MCP 客户端
- **优点：** 标准化、功能完整
- **缺点：** 过度设计、运维成本高、MCP 协议调试复杂
- **结论：** 不采用

### 方案 B：直连飞书 API（无按钮触发）
- **描述：** friendsAI 直接调用飞书 API 查询/更新记录
- **优点：** 简单直接、无中间层
- **缺点：** 无法触发表格按钮（飞书不支持外部直触按钮）
- **结论：** 不满足需求

### 方案 C：Automation + Webhook（✅ 采用）
- **描述：** 按钮点击触发飞书 Automation → 调用预设 Webhook → friendsAI 处理
- **优点：**
  - 符合飞书官方机制
  - 实现简单，只需 Webhook 接口
  - 可靠性高（飞书 Automation 成熟）
  - 安全性好（签名验证）
- **缺点：**
  - 需要用户在飞书侧配置 Automation（一次性操作）
  - 依赖飞书 Webhook 投递
- **结论：** **采用此方案**

## Impact

### 功能影响
- ✅ 用户可在飞书 Bitable 中通过按钮触化 friendsAI 业务逻辑
- ✅ friendsAI 可根据按钮上下文获取记录数据并执行操作
- ✅ 支持多租户（每个用户独立配置）

### 技术影响
- ➕ 新增 `feishu/webhook/` 模块
- ➕ 新增 `feishu/api.service.ts` 飞书 API 封装
- ➕ 新增 2 个 Entity：`FeishuConfig`、`FeishuWebhookLog`
- ➕ 复用现有 `connectors` 模块获取 OAuth token
- ➕ 配置管理接口（用户设置 Webhook URL）

### 非功能影响
- 无破坏性变更
- 纯新增功能模块

---

## Acceptance Criteria

1. **Webhook 接口可正常接收请求**
   - [ ] 创建 `POST /v1/webhooks/feishu/button` 接口
   - [ ] 请求体可正常解析为 `ButtonClickDto`
   - [ ] Swagger 文档更新

2. **签名验证**
   - [ ] 验证飞书签名（`X-Lark-Signature`）
   - [ ] 签名验证失败时返回 401

3. **飞书 API 调用**
   - [ ] 实现查询 Bitable 记录（`Search records` API）
   - [ ] 实现更新记录状态（`Update record` API）
   - [ ] 实现发送飞书卡片消息（`Send message` API）

4. **配置管理**
   - [ ] 创建配置管理接口（`GET/POST /v1/feishu/config`）
   - [ ] 实现配置保存/查询
   - [ ] 多租户隔离（按 userId）

5. **日志审计**
   - [ ] Webhook 调用日志记录
   - [ ] 处理状态跟踪（received → processing → completed/failed）

6. **集成测试**
   - [ ] 单元测试（Service 层逻辑）
   - [ ] 集成测试（Webhook 端到端）
   - [ ] 飞书端真实按钮点击测试

---

## Related Links

- [飞书 Bitable 按钮 Automation](https://www.feishu.cn/hc/en-US/articles/339066898695-use-button-fields-in-base)
- [查询记录 API](https://open.feishu.cn/document/docs/bitable-v1/app-table-record/search)
- [飞书 Automation 触发条件](https://open.feishu.cn/document/common-c3xc3r/automation/trigger-condition)
- [现有 connectors 模块](../../packages/server-nestjs/src/connectors/)
