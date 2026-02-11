# AI Messages Logic（消息完整链路）

本文档说明 friendsAI 当前「前端发消息 → 服务端代理 AI → 返回并落库 → 可选飞书同步」的完整链路，并标注每个代码文件中的关键逻辑。

## 1. 链路总览（MVP 当前实现）

```text
用户在 /chat 输入消息
  -> ChatPage.handleSendMessage
  -> 先写入本地状态 + Dexie
  -> 调用 POST /api/chat
      -> parseChatRequestBody 校验
      -> buildProxyPayload 构造模型请求
      -> fetch LOCAL_AI_BASE_URL/chat/completions
      -> extractAssistantReply 解析回复
      -> extractContactCardFromText 提取联系人卡片
      -> buildToolResult 生成工具结果文本
      -> (可选) syncMessageToBitable 同步到飞书
  -> 前端收到 reply/toolResult/contactCard
  -> 渲染 tool 消息 + assistant 消息
  -> 落回 Dexie
```

---

## 2. 前端入口与请求构造

## 文件
- `packages/client/app/chat/page.tsx`

## 关键逻辑

### 2.1 用户发送入口
- 函数：`handleSendMessage(content: string)`
- 核心职责：
  1. 构造用户消息对象（`role: 'user'`）
  2. 立即写入 Zustand（乐观更新）
  3. 持久化到 Dexie（失败不阻断 UI）
  4. 请求 `/api/chat`

### 2.2 请求体关键点（已修复）
- 发送时会过滤空内容消息：
  - `messages: [...currentMessages, userMessage].filter((message) => message.content.trim().length > 0)`
- 目的：避免把 `tool` 类空 content 消息发给后端，触发 400 校验失败。

### 2.3 响应处理
- 服务端成功后：
  - 若有 `toolResult`：先渲染一条 assistant 工具消息（含 `toolCalls`）
  - 再渲染一条 assistant 文本消息（`payload.reply`）
- 两类消息都写入 Dexie。

### 2.4 联系人卡片“确认后添加”
- 当 `contactCard` 返回时，前端会把工具消息标记为 `pendingContactCardConfirmation=true`。
- UI 展示两个动作：
  - `确认添加联系人`：调用 `saveContactCard` 入库并清除 pending 状态
  - `暂不添加`：仅清除 pending 状态，不入库
- 目的：满足 POC 的“识别后先确认再添加”。

### 2.5 飞书工具开关透传
- 前端会构造 `tools`：
  - 默认：`enabled=['extract_contact_info']`
  - 开启飞书时：`enabled=['extract_contact_info','feishu_template_message']`
  - 并附加 `feishuTemplateMessage.mode`（`sync` 或 `preview`）
- 这部分由聊天页工具开关 UI 控制。

### 2.4 异常回退
- `/api/chat` 调用失败时，插入兜底消息：
  - `当前 AI 服务不可用，请检查本地代理配置后重试。`

---

## 3. 服务端聊天路由（Next.js API）

## 文件
- `packages/client/app/api/chat/route.ts`

## 关键逻辑

### 3.1 环境变量读取
- `LOCAL_AI_BASE_URL` / `LOCAL_AI_MODEL` / `LOCAL_AI_API_KEY`
- 飞书相关：`FEISHU_SYNC_ENABLED`、`FEISHU_CHAT_TOOL_ENABLED`、`FEISHU_*`

### 3.2 请求校验与代理
1. `request.json()` 读取请求体
2. `parseChatRequestBody(rawBody)` 做严格校验
3. `buildProxyPayload(parsed, LOCAL_AI_MODEL)` 组装兼容 OpenAI 的 payload
4. `fetch(${LOCAL_AI_BASE_URL}/chat/completions)` 代理调用本地 AI

### 3.3 回复与联系人提取
- `extractAssistantReply(proxyData)`：提取模型回复文本
- `extractContactCardFromText(...)`：从最新用户消息中抽取联系人字段
- `buildToolResult(contactCard)`：把抽取结果转成前端可展示文案

### 3.4 飞书同步（best-effort）
- 触发条件：
  - `FEISHU_SYNC_ENABLED=true`
  - `FEISHU_CHAT_TOOL_ENABLED=true`（服务端开关）
  - 请求工具开启 `feishu_template_message`
  - `mode='sync'`（`preview` 不写飞书）
  - 配置完整
  - 最新消息角色是 `user`
- 同步流程：
  1. `parseBitableSyncRequestBody(...)` 二次校验飞书入参
  2. 透传 `extractedFields`（Email/Phone/Company/Title/Tags 等）
  3. `syncMessageToBitable(...)` 写飞书多维表
- 异常处理：
  - 捕获并记录 `console.error('Feishu sync failed', ...)`
  - 不影响主聊天响应

### 3.5 返回结构
- 成功返回：
  - `{ reply, toolResult, contactCard }`
- 失败分层：
  - 参数错误（`ValidationError`）-> 400
  - 其他错误 -> 500

---

## 4. 聊天逻辑函数（纯函数层）

## 文件
- `packages/client/app/api/chat/logic.ts`

## 关键函数

### `parseChatRequestBody(input)`
- 校验：
  - `contact.id/name` 必须存在且长度合法
  - `messages` 必须是非空数组，最多 50 条
  - 每条消息 `role` 必须是 `user|assistant`
  - `content` 非空且长度 <= 4000
- 作用：把脏数据挡在路由入口，避免污染后续流程。

### `buildProxyPayload(request, model)`
- 注入 system prompt
- 把前端消息映射成模型可消费格式

### `extractAssistantReply(proxyResponse)`
- 从 `choices[0].message.content` 抽取文本
- 若为空，返回默认文案 `我已经记下来了。`

### `extractContactCardFromText(text, contactName, sourceMessageId)`
- 用规则提取邮箱、手机号、职位、公司和标签
- 无有效字段时返回 `null`

### `buildToolResult(card)`
- 把提取到的联系人信息拼成一行可读文案

---

## 5. 飞书多维表逻辑层

## 文件
- `packages/client/app/api/feishu/bitable/logic.ts`

## 关键函数

### `parseBitableSyncRequestBody(input)`
- 校验字段格式与长度：
  - `contactId/contactName/messageId/role/content/occurredAt/source`
- 关键约束：
  - `role` 只能 `user|assistant`
  - `source` 当前限定为 `chat`
  - `occurredAt` 必须可解析为合法时间

### `buildBitableRecordFields(payload)`
- 把内部 payload 映射成 Bitable 字段名：
  - `Contact ID` / `Contact Name` / `Message ID` / `Role` / `Content` / `Source` / `Occurred At`

### `requestTenantAccessToken(config)`
- 调飞书 token 接口拿 `tenant_access_token`
- 非 2xx 或 `code !== 0` 直接抛错

### `syncMessageToBitable({ payload, config })`
- 先拿 token，再写 records
- 写入失败或响应结构不合法时抛错

---

## 6. 飞书路由（独立入口）

## 文件
- `packages/client/app/api/feishu/bitable/route.ts`

## 关键逻辑
- 这是可选独立写入入口（当前主要链路已经在 `/api/chat` 内触发）
- 有内部令牌保护：
  - 需 `FEISHU_INTERNAL_API_TOKEN` 已配置
  - 请求头 `x-internal-token` 必须匹配
- 仍保留 `FEISHU_SYNC_ENABLED` 开关和配置完整性校验

---

## 7. 本地持久化（Dexie）

## 文件
- `packages/client/lib/db.ts`

## 关键逻辑
- `saveMessage` / `getMessagesByContact`
- `saveContact` / `getAllContacts`
- `saveContactCard`

聊天页会在发送/接收时写入本地 DB，刷新后可恢复联系人与消息。

---

## 8. 测试覆盖

## 文件
- `packages/client/app/api/chat/logic.test.ts`
- `packages/client/app/api/feishu/bitable/logic.test.ts`

## 已覆盖重点
- chat 请求解析与约束校验
- 飞书 payload 校验（含 `source`）
- token 获取成功/失败
- bitable 写入成功/失败（含非 2xx 与 `code != 0`）

---

## 9. 常见报错与定位建议

### 9.1 `/api/chat` 400
常见原因：请求体不满足 `parseChatRequestBody` 约束（例如空 content 消息）。

排查顺序：
1. 看 Network 请求体里 `messages` 是否存在空字符串内容
2. 看 `contact.id/name` 是否为空或超长
3. 看消息条数是否超过 50

### 9.2 `/api/chat` 500（本地 AI 配置问题）
常见原因：`LOCAL_AI_API_KEY` 未配置。

### 9.3 `/api/chat` 502（代理调用失败）
常见原因：本地 AI 代理地址不通、模型不可用、上游超时。

### 9.4 飞书未同步但聊天正常
这是当前设计（best-effort）：
- 聊天主流程优先
- 飞书失败只记录日志，不中断聊天

---

## 10. 相关配置

## 文件
- `packages/client/.env.example`

关键变量：
- `LOCAL_AI_BASE_URL`
- `LOCAL_AI_MODEL`
- `LOCAL_AI_API_KEY`
- `FEISHU_SYNC_ENABLED`
- `FEISHU_CHAT_TOOL_ENABLED`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_BITABLE_APP_TOKEN`
- `FEISHU_BITABLE_TABLE_ID`
- `FEISHU_BASE_URL`
- `FEISHU_INTERNAL_API_TOKEN`
