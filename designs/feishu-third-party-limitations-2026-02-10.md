# 第三方开发者接入飞书的限制与能力

**日期**: 2026-02-10
**文档类型**: 接入指南/限制说明
**目标读者**: 第三方开发者

---

## 一、应用类型概述

### 1.1 飞书开放平台应用类型

| 应用类型 | 说明 | 审核要求 | 适用场景 |
|----------|------|----------|----------|
| **企业自建应用** | 企业内部使用，无需发布 | 无需审核 | 企业内部工具 |
| **应用商店应用** | 发布到飞书应用商店 | 需平台审核 | 面向所有飞书用户 |
| **企业集成（ISV）** | 为企业提供定制化解决方案 | 需平台审核 | B2B SaaS 服务 |

### 1.2 本文档聚焦

**应用商店应用 + 企业集成（ISV）**：第三方开发者面向飞书用户/企业提供服务的场景。

---

## 二、核心限制

### 2.1 数据访问限制

| 限制项 | 说明 | 影响 |
|--------|------|------|
| **授权数据范围** | 只能访问用户明确授权的数据 | 无法获取企业全量数据 |
| **联系人访问** | 需要 `contact:user.base:readonly` 等权限 | 需用户主动授权 |
| **多维表格访问** | 只能访问用户授权的特定表格 | 无法扫描所有表格 |
| **消息范围** | 只能收到与机器人相关的消息（私聊或群 @） | 无法监听所有群消息 |

### 2.2 功能限制

| 限制项 | 说明 | 绕过方案 |
|--------|------|----------|
| **无法批量获取企业用户** | 只能获取授权用户信息 | 引导用户主动邀请 |
| **无法自动安装到企业** | 需要企业管理员手动安装 | 提供安装引导文档 |
| **Webhook 延迟** | 事件推送可能有延迟 | 设置重试机制 |
| **API 限流** | 每个接口有调用频率限制 | 实现请求队列与缓存 |

### 2.3 审核限制

| 限制项 | 说明 | 建议 |
|--------|------|------|
| **隐私政策** | 必须提供完整的隐私政策 | 提前准备隐私政策文档 |
| **数据使用说明** | 需说明如何使用用户数据 | 在应用内提供数据使用说明 |
| **安全评估** | 敏感权限需安全评估 | 提前与飞书技术支持沟通 |
| **审核周期** | 通常 3-7 个工作日 | 预留足够时间 |

---

## 三、核心能力

### 3.1 消息与机器人

#### 能力描述

机器人可以接收用户消息并响应，支持私聊和群聊场景。

#### 可用功能

| 功能 | API/事件 | 说明 |
|------|----------|------|
| **接收私聊消息** | `im.message.receive_v1` | 用户与机器人私聊时触发 |
| **接收群 @ 消息** | `im.message.receive_v1` | 群中 @机器人时触发 |
| **发送文本消息** | `POST /im/v1/messages` | 发送纯文本消息 |
| **发送卡片消息** | `POST /im/v1/messages` | 发送交互式卡片 |
| **更新卡片** | `POST /card/v1/update` | 动态更新已发送的卡片 |
| **富文本消息** | Message Card | 支持图片、链接、分割线等 |

#### 卡片交互能力

```
卡片元素支持：
├── 文本元素
│   ├── 纯文本 (plain_text)
│   ├── Markdown (lark_md)
│   └── 富文本 (text)
├── 交互元素
│   ├── 按钮 (button)
│   ├── 下拉选择器 (select_menu)
│   ├── 日期选择器 (datepicker)
│   ├── 人员选择器 (person)
│   └── 表单输入框 (input)
└── 媒体元素
    ├── 图片 (img)
    ├── 视频 (video)
    └── 文件 (file)
```

#### 权限要求

```env
FEISHU_OAUTH_SCOPE=im:message,im:message.group_at_msg
```

---

### 3.2 多维表格（Bitable）

#### 能力描述

飞书多维表格类似 Airtable，支持丰富的字段类型和自动化功能。

#### 可用功能

| 功能 | API | 说明 |
|------|-----|------|
| **获取应用列表** | `GET /bitable/v1/apps` | 获取用户授权的表格应用 |
| **获取数据表** | `GET /bitable/v1/apps/{app_token}/tables` | 获取应用下的所有表格 |
| **创建记录** | `POST /bitable/v1/apps/{app_token}/tables/{table_id}/records` | 新增数据行 |
| **批量创建** | `POST /bitable/v1/apps/{app_token}/tables/{table_id}/records/batch_create` | 批量新增（最多 500 条） |
| **更新记录** | `PATCH /bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}` | 修改数据行 |
| **删除记录** | `DELETE /bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}` | 删除数据行 |
| **查询记录** | `GET /bitable/v1/apps/{app_token}/tables/{table_id}/records` | 支持筛选、排序、分页 |
| **字段操作** | Field API | 创建/修改字段结构 |

#### 支持的字段类型

| 类型 | 说明 | 示例值 |
|------|------|--------|
| `text` | 单行文本 | "张三" |
| `longtext` | 多行文本 | "这是一段\n多行文本" |
| `number` | 数字 | 123.45 |
| `date` | 日期 | "2024-02-10" |
| `datetime` | 日期时间 | "2024-02-10T14:30:00.000+08:00" |
| `checkbox` | 复选框 | true |
| `select` | 单选 | "进行中" |
| `multiSelect` | 多选 | ["标签1", "标签2"] |
| `person` | 人员 | { "open_id": "ou_xxx" } |
| `phone` | 电话 | "+86 13800138000" |
| `email` | 邮箱 | "user@example.com" |
| `url` | 链接 | "https://example.com" |
| `attachment` | 附件 | { file_token: "xxx" } |
| `formula` | 公式 | (自动计算) |
| `lookup` | 引用 | (引用其他表) |
| `createdTime` | 创建时间 | (自动记录) |
| `modifiedTime` | 修改时间 | (自动记录) |

#### 权限要求

```env
FEISHU_OAUTH_SCOPE=bitable:app:readonly   # 读取权限
FEISHU_OAUTH_SCOPE=bitable:app           # 读写权限
```

---

### 3.3 联系人（Contact）

#### 能力描述

获取飞书组织架构中的用户和部门信息。

#### 可用功能

| 功能 | API | 说明 |
|------|-----|------|
| **获取用户信息** | `GET /contact/v3/users/{user_id}` | 获取单个用户详情 |
| **批量获取用户** | `POST /contact/v3/users/batch_get` | 批量获取用户信息 |
| **获取用户列表** | `GET /contact/v3/users` | 分页获取用户列表 |
| **获取部门信息** | `GET /contact/v3/departments/{department_id}` | 获取部门详情 |
| **获取子部门** | `GET /contact/v3/departments/{department_id}/children` | 获取子部门列表 |
| **获取部门用户** | `GET /contact/v3/departments/{department_id}/users` | 获取部门下的用户 |

#### 返回数据字段

| 字段 | 说明 | 是否需要额外权限 |
|------|------|------------------|
| `name` | 姓名 | ❌ |
| `en_name` | 英文名 | ❌ |
| `email` | 邮箱 | ❌ |
| `mobile` | 手机号 | ✅ 需要 `contact:user.mobile:readonly` |
| `avatar` | 头像 | ❌ |
| `department_ids` | 所属部门 ID 列表 | ❌ |
| `leader_user_id` | 上级用户 ID | ❌ |
| `positions` | 职位信息 | ❌ |

#### 权限要求

```env
FEISHU_OAUTH_SCOPE=contact:user.base:readonly          # 用户基本信息
FEISHU_OAUTH_SCOPE=contact:user.mobile:readonly       # 用户手机号
FEISHU_OAUTH_SCOPE=contact:department:readonly        # 部门信息
```

---

### 3.4 文档（Doc）

#### 能力描述

创建和操作飞书云文档。

#### 可用功能

| 功能 | API | 说明 |
|------|-----|------|
| **创建文档** | `POST /doc/v1/documents/create` | 创建新文档 |
| **获取文档内容** | `GET /doc/v1/documents/{document_id}` | 获取文档内容 |
| **更新文档块** | `POST /doc/v1/documents/{document_id}/blocks/{block_id}/children` | 添加内容块 |
| **创建表格** | `POST /sheet/v3/spreadsheets` | 创建电子表格 |
| **写入数据** | `POST /sheet/v3/spreadsheets/{sheet_id}/write` | 写入表格数据 |

#### 权限要求

```env
FEISHU_OAUTH_SCOPE=doc:doc:readonly          # 读取文档
FEISHU_OAUTH_SCOPE=doc:doc                  # 读写文档
FEISHU_OAUTH_SCOPE=drive:drive:readonly     # 访问文件
```

---

### 3.5 日历（Calendar）

#### 可用功能

| 功能 | API | 说明 |
|------|-----|------|
| **获取日历事件** | `GET /calendar/v4/calendars/{calendar_id}/events` | 获取日程 |
| **创建事件** | `POST /calendar/v4/calendars/{calendar_id}/events` | 创建日程 |
| **更新事件** | `PATCH /calendar/v4/calendars/{calendar_id}/events/{event_id}` | 更新日程 |
| **查询忙闲** | `POST /calendar/v4/freebusy/query` | 查询用户忙闲状态 |

#### 权限要求

```env
FEISHU_OAUTH_SCOPE=calendar:event:readonly      # 读取日程
FEISHU_OAUTH_SCOPE=calendar:event                # 读写日程
```

---

### 3.6 搜索（Search）

#### 可用功能

| 功能 | API | 说明 |
|------|-----|------|
| **搜索消息** | `POST /search/v2/message` | 搜索聊天消息 |
| **搜索文档** | `POST /search/v2/document` | 搜索文档内容 |
| **搜索用户** | `POST /contact/v3/users/search` | 搜索用户 |

#### 权限要求

```env
FEISHU_OAUTH_SCOPE=search:message:readonly      # 搜索消息
FEISHU_OAUTH_SCOPE=search:document:readonly     # 搜索文档
```

---

## 四、OAuth 授权流程

### 4.1 用户授权流程

```
用户                    第三方应用                飞书开放平台
  │                         │                         │
  │  1. 点击"添加机器人"     │                         │
  ├────────────────────────►│                         │
  │                         │  2. 跳转授权页面         │
  │                         ├────────────────────────►│
  │                         │                         │
  │  3. 用户确认授权         │                         │
  │◄────────────────────────┤─────────────────────────┤
  │                         │  4. 返回 code            │
  │                         │◄────────────────────────┤
  │                         │                         │
  │                         │  5. 用 code 换 token     │
  │                         ├────────────────────────►│
  │                         │  6. 返回 access_token    │
  │                         │◄────────────────────────┤
  │                         │                         │
  │  7. 授权成功             │                         │
  │◄────────────────────────┤                         │
```

### 4.2 授权端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/authen/v1/authorize` | GET | 获取授权码 |
| `/authen/v3/tenant_access_token/internal` | POST | 企业应用获取 token |
| `/authen/v1/oidc/access_token` | POST | 用 code 换取 token |

### 4.3 Token 类型

| Token 类型 | 说明 | 有效期 |
|-----------|------|--------|
| `tenant_access_token` | 应用级 token，代表应用身份 | 2 小时 |
| `user_access_token` | 用户级 token，代表用户身份 | 约 2 小时 |
| `refresh_token` | 用于刷新 user_access_token | 更长（可配置） |

---

## 五、事件订阅（Webhook）

### 5.1 支持的事件类型

| 事件类别 | 事件类型 | 触发条件 |
|----------|----------|----------|
| **消息事件** | `im.message.receive_v1` | 收到用户消息 |
| **卡片事件** | `card.action.trigger` | 用户点击卡片按钮 |
| **审批事件** | `approval.instance` | 审批流程变更 |
| **日历事件** | `calendar.event` | 日程变更 |
| **表格事件** | `bitable.record` | 表格记录变更 |

### 5.2 Webhook 验证

飞书在首次配置 Webhook 时会发送验证请求：

```typescript
// 验证请求结构
{
  "challenge": "验证字符串",
  "token": "验证令牌",
  "type": "url_verification"
}

// 响应验证
{
  "challenge": "原样返回的 challenge 字符串"
}
```

---

## 六、API 限流

### 6.1 限流规则

| API 类型 | 限制 |
|----------|------|
| **消息发送** | 20 次/秒/应用 |
| **多维表格** | 50 次/秒/应用 |
| **联系人** | 30 次/秒/应用 |
| **文档操作** | 20 次/秒/应用 |

### 6.2 错误处理

```typescript
// 限流错误响应
{
  "code": 99991663,
  "msg": "请求频率过高，请稍后再试"
}

// 建议处理
if (error.code === 99991663) {
  // 指数退避重试
  await delay(Math.pow(2, retryCount) * 1000);
}
```

---

## 七、数据安全与合规

### 7.1 必须遵守的规定

| 规定 | 说明 |
|------|------|
| **数据最小化** | 只收集必要的数据 |
| **用户知情权** | 告知用户数据用途 |
| **数据删除权** | 提供删除数据的功能 |
| **安全存储** | 加密存储敏感信息 |
| **不滥用数据** | 不将数据用于未声明的用途 |

### 7.2 推荐做法

```typescript
// 1. 数据加密存储
const encryptedToken = encrypt(userAccessToken);

// 2. 最小权限原则
const scope = ['contact:user.base:readonly']; // 只申请必要权限

// 3. 数据定期清理
await cleanupExpiredTokens();

// 4. 审计日志
await logDataAccess(userId, dataType, purpose);
```

---

## 八、开发调试

### 8.1 本地调试

| 工具 | 用途 |
|------|------|
| **飞书开发平台** | 在线测试 API |
| **内网穿透** | ngrok / frp（用于 Webhook 本地调试） |
| **飞书开发者工具** | Chrome 插件，查看 API 请求 |

### 8.2 测试账号

- 创建测试企业
- 添加测试用户
- 使用测试账号授权应用

---

## 九、参考资源

| 资源 | 链接 |
|------|------|
| **飞书开放平台** | https://open.feishu.cn |
| **API 文档** | https://open.feishu.cn/document/server-docs/api-introduction |
| **机器人开发** | https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/bot-v3/bot-overview |
| **OAuth 文档** | https://open.feishu.cn/document/server-docs/authentication-management/access-token/tenant_access_token |
| **事件订阅** | https://open.feishu.cn/document/server-docs/event-subscription-guide |
| **应用审核** | https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/app-review-guide |
| **SDK 下载** | https://open.feishu.cn/document/ukTMukTMukTM/docs/sdk-list |

---

## 十、常见问题

### Q1: 第三方应用能否获取企业全量用户列表？

**A**: 不能。只能获取授权用户可访问的联系人范围。如需企业全量数据，需要引导客户使用企业集成模式。

### Q2: Webhook 接收不到事件怎么办？

**A**:
1. 检查 Webhook URL 配置是否正确
2. 确认服务器外网可访问
3. 查看飞书开放平台的事件推送日志
4. 验证加密配置是否正确

### Q3: 如何处理 Token 过期？

**A**: 使用 `refresh_token` 刷新，或重新引导用户授权：

```typescript
if (isTokenExpired(token)) {
  if (refreshToken) {
    newToken = await refreshAccessToken(refreshToken);
  } else {
    redirectUserToAuth();
  }
}
```

### Q4: 卡片按钮点击没有反应？

**A**:
1. 确认 Webhook 已正确配置
2. 检查卡片的 `token` 字段是否正确返回
3. 验证按钮的 `value` 数据结构

### Q5: 多维表格 API 返回权限不足？

**A**:
1. 确认用户已授权该表格应用
2. 检查申请的 scope 是否包含 `bitable:app`
3. 确认表格的权限设置允许第三方应用访问

---

*文档版本: v1.0*
*更新日期: 2026-02-10*
