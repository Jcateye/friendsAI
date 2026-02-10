# 飞书开放平台接入调研报告

**日期**: 2026-02-10
**调研目标**: 评估飞书开放平台与 friendsAI 系统的集成可行性
**应用类型**: 第三方开发者应用（应用商店应用） + 企业集成

---

## 一、飞书开放平台能力概览

### 1.1 核心 API 能力

| 能力域 | 主要功能 | 与 friendsAI 相关度 | 说明 |
|--------|----------|---------------------|------|
| **消息/机器人** | 接收/发送消息、富文本、卡片消息、事件订阅 | ⭐⭐⭐⭐⭐ | 用户对话入口 |
| **联系人** | 用户信息、部门架构、群组列表 | ⭐⭐⭐⭐ | 需用户授权 |
| **多维表格** | 数据表 CRUD、批量操作、变更订阅 | ⭐⭐⭐⭐⭐ | 数据存储/同步 |
| **文档** | 云文档创建/编辑/导出、评论 | ⭐⭐⭐ | 分析结果导出 |
| **日历** | 事件同步、会议预约 | ⭐⭐⭐ | 待办提醒 |
| **搜索** | 全文搜索、文档搜索 | ⭐⭐⭐⭐ | 联系人检索 |

### 1.2 平台规模

- **2500+ API 接口**，覆盖 20+ 产品能力
- 支持事件订阅、Webhook 回调
- 支持 OAuth 2.0 用户授权
- 支持飞书卡片（交互式 UI）

---

## 二、应用模式对比

### 2.1 三种应用模式

| 能力 | 企业自建应用 | 第三方应用商店应用 | 企业集成（ISV） |
|------|-------------|-------------------|----------------|
| **目标用户** | 单个企业内部 | 所有飞书用户 | B2B 企业客户 |
| **数据访问** | 企业内所有数据 | 仅授权用户数据 | 授权企业数据 |
| **安装方式** | 企业后台启用 | 用户自主安装 | 企业管理员安装 |
| **审核要求** | 无需平台审核 | 需平台审核 | 需平台审核 |
| **收费模式** | 免费 | 免费/付费 | 订阅/按量计费 |
| **数据隔离** | 企业级 | 用户级 | 企业级 |
| **适用场景** | 内部工具 | 通用工具 | 垂直行业 SaaS |

### 2.2 friendsAI 推荐路径

**阶段 1：第三方应用商店应用**
- 快速验证产品价值
- 获取用户反馈
- 低成本试错

**阶段 2：企业集成（ISV）**
- 针对企业客户提供深度集成
- 企业级数据安全与权限管理
- 订阅收费模式

---

## 三、第三方应用能力与限制

### 3.1 第三方应用限制

- 只能收到与机器人相关的消息（私聊或 @）
- 需要用户明确授权才能访问联系人、表格等数据
- 受隐私政策和数据保护法规约束
- 需通过飞书平台审核

### 3.2 可实现功能

- **机器人对话**: 私聊、群聊 @交互
- **数据读写**: 经用户授权后读写多维表格
- **文档操作**: 创建、编辑、导出文档
- **卡片交互**: 富文本卡片、按钮、表单

---

## 四、企业集成（ISV）能力

### 4.1 企业集成优势

| 能力 | 说明 |
|------|------|
| **企业级授权** | 企业管理员一次性授权，全员可用 |
| **深度数据访问** | 可访问企业内联系人、部门架构等 |
| **自定义权限** | 可按部门/角色配置不同权限 |
| **私有化部署** | 支持企业私有化部署需求 |
| **SSO 集成** | 支持企业单点登录 |
| **审计日志** | 企业级操作审计 |

### 4.2 企业集成适用场景

- **CRM 深度集成**: 与企业现有 CRM 系统打通
- **销售团队协作**: 全员共享联系人管理与 AI 分析
- **知识库构建**: 企业级知识沉淀与检索
- **合规要求**: 满足企业数据安全与合规要求

### 4.3 企业集成技术要求

```
企业集成架构
┌─────────────────────────────────────────────────────────────┐
│                    企业客户环境                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ 飞书企业     │  │ CRM/ERP系统  │  │ 私有数据存储      │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          │ OAuth 2.0 企业授权│ API 集成         │ 数据同步
┌─────────▼──────────────────▼──────────────────▼──────────────┐
│                    friendsAI SaaS                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ 多租户管理   │  │ 企业数据隔离 │  │ AI 分析引擎      │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、推荐打通的功能模块

### 5.1 飞书 AI 机器人（优先级：P0）

#### 功能描述
用户在飞书中添加机器人后，可通过私聊或群聊 @ 机器人调用 friendsAI 的分析能力。

#### 可实现功能
- **私聊对话**: 用户直接与 AI 对话，分析联系人或会话内容
- **群聊交互**: 在群组中 @机器人 触发分析
- **卡片消息**: 展示结构化的分析结果（联系人信息、事实、待办）
- **按钮交互**: 通过卡片按钮完成工具确认、保存操作

#### 技术要点
- 事件订阅: `im.message.receive_v1`（接收用户消息）
- 卡片交互: `interactiveCard`（按钮、表单等 UI 组件）
- Webhook 回调处理

---

### 5.2 多维表格双向同步（优先级：P0）

#### 功能描述
将飞书多维表格作为外部数据源，实现与 friendsAI 实体（Contact, ContactFact, ContactTodo）的双向同步。

#### 数据模型映射

| friendsAI 实体 | 飞书多维表格 | 字段映射 |
|----------------|--------------|----------|
| `Contact` | 联系人表 | name, email, phone, company, position, tags, note |
| `ContactFact` | 事实表 | content, sourceConversationId, category, extractedAt |
| `ContactTodo` | 待办表 | content, status, dueAt, completedAt |
| `Conversation` | 会话表 | title, summary, content, createdAt |

#### API 端点
- `POST /bitable/v1/apps/{app_token}/tables/{table_id}/records` - 创建记录
- `PATCH /bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}` - 更新记录
- `GET /bitable/v1/apps/{app_token}/tables/{table_id}/records` - 查询记录

---

### 5.3 联系人组织架构同步（优先级：P1）

#### 功能描述
同步飞书组织架构到 friendsAI 联系人库。

#### 可实现功能
- 用户信息自动更新（姓名、部门、手机号）
- 群组映射到联系人分组
- 增量同步（基于更新时间）

#### API 端点
- `GET /contact/v3/users` - 获取用户列表
- `GET /contact/v3/departments` - 获取部门架构

---

### 5.4 AI 结果生成飞书文档（优先级：P1）

#### 功能描述
将 AI 分析结果自动生成为飞书文档。

#### 可实现功能
- 会议纪要自动生成
- 联系人简报（ContactBrief）导出
- 分析报告生成

---

## 六、技术架构设计

### 6.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        飞书平台                                  │
│  ┌──────────────┐              ┌──────────────────────────────┐ │
│  │ 飞书机器人   │              │       多维表格 (Bitable)       │ │
│  │ - 私聊消息   │              │  - 联系人表                   │ │
│  │ - 群 @消息   │              │  - 事实表                     │ │
│  │ - 卡片交互   │              │  - 待办表                     │ │
│  └──────┬───────┘              └──────────┬───────────────────┘ │
│         │                                 │                      │
└─────────┼─────────────────────────────────┼──────────────────────┘
          │ Webhook 事件                    │ OAuth 2.0 API
          │                                 │
┌─────────▼─────────────────────────────────▼──────────────────────┐
│                    friendsAI 后端 (NestJS)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ feishu module│  │ connectors   │  │  agent (现有)        │   │
│  │ - webhook    │  │ - oauth      │  │  - conversations     │   │
│  │ - 卡片处理   │  │ - token管理  │  │  - contacts          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │ 多租户管理   │  │ 企业数据隔离 │  (企业集成专属)              │
│  └──────────────┘  └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 用户交互流程

```
用户在飞书中                      friendsAI 后端              数据库
    │                                 │                        │
    │  @机器人 "帮我分析一下张三"       │                        │
    ├────────────────────────────────►│                        │
    │          (Webhook 事件)          │                        │
    │                                 │                        │
    │                                 │ 1. 解析消息            │
    │                                 │ 2. 调用 Agent Runtime  │
    │                                 │ 3. 流式返回分析结果    │
    │                                 │                        │
    │  卡片消息 (分析结果)             │                        │
    │◄────────────────────────────────┤                        │
    │  - 联系人信息                    │                        │
    │  - 提取的事实                    │                        │
    │  - 待办事项                      │                        │
    │  [确认] [拒绝] 按钮              │                        │
    │                                 │                        │
    │  点击 [确认] 按钮                │                        │
    ├────────────────────────────────►│                        │
    │          (卡片回调)              │                        │
    │                                 │ 保存到数据库            │
    │                                 ├───────────────────────►│
    │                                 │ 同步到飞书表格          │
    │  "已保存到联系人库"              ├───────┐                │
    │◄────────────────────────────────┤       │                │
    │                                 │       ▼                │
    │                                 │    飞书多维表格          │
```

### 6.3 新增模块结构

```
packages/server-nestjs/src/feishu/
├── feishu.module.ts
├── controllers/
│   ├── webhook.controller.ts      # 飞书事件 Webhook
│   └── bitable.controller.ts      # 多维表格操作
├── services/
│   ├── webhook.service.ts         # 事件处理
│   ├── card.service.ts            # 卡片构建/更新
│   ├── bitable-sync.service.ts    # 多维表格同步
│   └── message.service.ts         # 消息发送
├── dto/
│   ├── webhook-event.dto.ts
│   └── card.dto.ts
├── types/
│   └── feishu.types.ts
└── enterprise/                    # 企业集成专属
    ├── tenant.service.ts          # 多租户管理
    └── data-isolation.service.ts  # 数据隔离
```

---

## 七、飞书卡片消息设计

### 7.1 联系人分析结果卡片示例

```json
{
  "config": { "wide_screen_mode": true },
  "header": {
    "title": { "content": "📊 联系人分析结果", "tag": "plain_text" }
  },
  "elements": [
    {
      "tag": "div",
      "fields": [
        { "is_short": true, "text": { "tag": "lark_md", "content": "**姓名**: 张三" } },
        { "is_short": true, "text": { "tag": "lark_md", "content": "**公司**: ABC科技" } }
      ]
    },
    {
      "tag": "hr"
    },
    {
      "tag": "div",
      "text": {
        "tag": "lark_md",
        "content": "**📝 提取的事实**\n• 曾在2024年Q1主导过云平台迁移项目\n• 关注 Serverless 和 AI Agent 技术栈"
      }
    },
    {
      "tag": "div",
      "text": {
        "tag": "lark_md",
        "content": "**✅ 建议待办**\n• [ ] 下周三前发送产品资料\n• [ ] 安排技术团队对接会议"
      }
    },
    {
      "tag": "action",
      "actions": [
        {
          "tag": "button",
          "text": { "tag": "plain_text", "content": "保存到联系人库" },
          "type": "primary",
          "value": { "action": "save_contact" }
        },
        {
          "tag": "button",
          "text": { "tag": "plain_text", "content": "同步到飞书表格" },
          "value": { "action": "sync_bitable" }
        }
      ]
    }
  ]
}
```

---

## 八、实施计划

### 8.1 阶段划分

| 阶段 | 内容 | 工作量 | 优先级 | 适用模式 |
|------|------|--------|--------|----------|
| **阶段 1** | 飞书应用基础搭建（OAuth + Webhook） | 1-2 天 | P0 | 通用 |
| **阶段 2** | 机器人消息处理模块 | 2-3 天 | P0 | 通用 |
| **阶段 3** | 多维表格双向同步 | 2-3 天 | P0 | 通用 |
| **阶段 4** | 前端集成页面 | 1-2 天 | P1 | 通用 |
| **阶段 5** | 多租户架构（企业集成） | 3-5 天 | P1 | 企业版 |
| **阶段 6** | 企业数据隔离与权限 | 2-3 天 | P1 | 企业版 |

### 8.2 第三方应用路线（推荐先做）

**目标**: 快速验证产品价值，获取用户反馈

1. 完成阶段 1-4
2. 发布到飞书应用商店（免费版）
3. 收集用户反馈迭代产品
4. 验证商业模式

### 8.3 企业集成路线（后续扩展）

**目标**: 服务 B2B 企业客户，实现订阅收费

**阶段 5：多租户架构**
- 企业租户管理
- 企业级 OAuth 授权
- 租户数据隔离

**阶段 6：企业数据隔离与权限**
- 基于角色的权限控制
- 企业级操作审计
- 数据加密与脱敏

---

## 九、环境变量配置

```env
# 飞书应用配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_OAUTH_AUTHORIZE_URL=https://open.feishu.cn/open-apis/authen/v1/authorize
FEISHU_OAUTH_TOKEN_URL=https://open.feishu.cn/open-apis/authen/v3/tenant_access_token/internal
FEISHU_OAUTH_REDIRECT_URI=https://your-domain.com/connectors/feishu/callback
FEISHU_OAUTH_SCOPE=contact:user.base:readonly,bitable:app:readonly
FEISHU_ENCRYPT_KEY=your_verification_token_encryption_key
FEISHU_VERIFICATION_TOKEN=your_verification_token

# 多维表格 API
FEISHU_BITABLE_API_URL=https://open.feishu.cn/open-apis/bitable/v1

# 企业集成配置（可选）
FEISHU_ENTERPRISE_ENABLED=true
FEISHU_ISV_MODE=false
```

---

## 十、需要扩展的实体

### 10.1 FeishuConfig 实体

```typescript
@Entity({ name: 'feishu_configs' })
export class FeishuConfig {
  @PrimaryGeneratedColumn('uuid', { uuidVersion: '7' })
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  // 多维表格配置
  @Column({ nullable: true })
  bitableAppToken: string;      // 关联的飞书应用

  @Column({ nullable: true })
  contactsTableId: string;      // 联系人表 ID

  @Column({ nullable: true })
  factsTableId: string;         // 事实表 ID

  @Column({ nullable: true })
  todosTableId: string;         // 待办表 ID

  @Column({ default: true })
  syncEnabled: boolean;         // 是否启用自动同步

  @Column({ nullable: true, type: 'bigint', transformer: timestampMsTransformer })
  lastSyncedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
```

### 10.2 EnterpriseTenant 实体（企业集成）

```typescript
@Entity({ name: 'enterprise_tenants' })
export class EnterpriseTenant {
  @PrimaryGeneratedColumn('uuid', { uuidVersion: '7' })
  id: string;

  @Column()
  tenantName: string;           // 企业名称

  @Column({ unique: true })
  feishuTenantKey: string;      // 飞书租户标识

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;  // 企业配置

  @Column({ default: 'trial' })
  plan: 'trial' | 'basic' | 'pro' | 'enterprise';  // 订阅计划

  @Column({ nullable: true, type: 'bigint', transformer: timestampMsTransformer })
  expiresAt: Date;              // 订阅到期时间

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;
}
```

---

## 十一、商业模式建议

### 11.1 第三方应用（免费 + 增值）

| 功能 | 免费版 | 付费版 |
|------|--------|--------|
| 机器人对话 | ✅ 有限次数 | ✅ 无限 |
| 多维表格同步 | ✅ 单表 | ✅ 多表 |
| 联系人数量 | 100 个 | 无限 |
| AI 分析次数 | 50 次/月 | 无限 |
| 技术支持 | 社区 | 专属 |

### 11.2 企业集成（订阅制）

| 计划 | 价格 | 功能 |
|------|------|------|
| Basic | ¥99/用户/月 | 基础机器人 + 多维表格同步 |
| Pro | ¥199/用户/月 | + 企业级权限 + 审计日志 |
| Enterprise | 定制 | + 私有化部署 + 定制开发 |

---

## 十二、参考文档

- [飞书开放平台官网](https://open.feishu.cn/?lang=zh-CN)
- [机器人概述 - 飞书开放平台](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/bot-v3/bot-overview?lang=zh-CN)
- [飞书开放平台介绍](https://www.feishu.cn/hc/zh-CN/articles/244506653275)
- [申请API权限](https://open.feishu.cn/document/server-docs/application-scope/introduction)
- [多维表格 API](https://open.feishu.cn/document/server-docs/bitable-v1/app-table-list)
- [企业自建应用](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/application-v6/create_app_self-built)
- [应用商店应用](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/application-v6/create_app_from_template)
- [更新日志](https://open.feishu.cn/changelog?lang=zh-CN)

---

## 十三、总结

### 13.1 可行性评估

| 功能 | 可行性 | 复杂度 | 价值 | 适用模式 |
|------|--------|--------|------|----------|
| 飞书 AI 机器人 | ✅ 可行 | 中 | 极高 | 通用 |
| 多维表格双向同步 | ✅ 可行 | 中 | 极高 | 通用 |
| 联系人组织架构同步 | ✅ 可行 | 低 | 高 | 通用 |
| AI 结果生成文档 | ✅ 可行 | 低 | 中 | 通用 |
| 企业多租户架构 | ✅ 可行 | 高 | 高 | 企业版 |
| 企业级权限控制 | ✅ 可行 | 中 | 高 | 企业版 |

### 13.2 建议实施路径

**第一步（1-2个月）**: 第三方应用商店版
- 机器人对话 + 多维表格同步
- 发布免费版验证市场
- 收集用户反馈

**第二步（2-3个月）**: 增值服务
- 增加付费功能
- 验证收费模式

**第三步（3-6个月）**: 企业集成版
- 多租户架构
- 企业级权限与安全
- 开拓 B2B 客户

---

*调研报告完成日期: 2026-02-10*
