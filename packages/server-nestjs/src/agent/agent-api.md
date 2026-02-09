### 总览：Agent 模块 HTTP API

- **基础地址**：`http://localhost:3000/v1`
- **模块前缀**：`/agent`
- **完整路径**：
  - `POST /v1/agent/chat` —— 流式聊天（SSE / Vercel AI 格式）
  - `POST /v1/agent/run` —— 统一的一次性 Agent 执行入口
  - `GET  /v1/agent/messages` —— 查询某个用户+会话的历史 Agent 消息
  - `GET  /v1/agent/list` —— 查询所有可用 Agent 的“名片”列表

下面我按“从大到小”的结构来写：先说明接口目的，再讲请求结构、字段含义，最后给可直接运行的调用示例。

---

## `POST /v1/agent/chat` —— 流式聊天接口

### 1. 作用

- **用途**：发起与多 Agent 协调的流式对话，返回 SSE 事件流或 Vercel AI 文本流。
- **典型场景**：前端聊天框、打字机效果、工具调用时需要实时增量 token。

### 2. 请求

- **URL**：`POST http://localhost:3000/v1/agent/chat`
- **Query 参数**

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `format` | `"sse" \| "vercel-ai"` | 否 | 输出流格式，默认 `"sse"`；`"vercel-ai"` 用于与 Vercel AI SDK 兼容 |

- **Headers**

| Header | 值 |
|--------|----|
| `Content-Type` | `application/json` |
| （可选）`Accept` | `text/event-stream`（SSE 时） |

- **Body：`AgentChatRequest`**

```json
{
  "messages": [
    {
      "role": "user",
      "content": "今天天气怎么样？"
    }
  ],
  "prompt": "可选，直接给模型的一段提示",
  "context": {
    "any": "自定义上下文"
  },
  "model": "可选模型名",
  "temperature": 0.7,
  "maxTokens": 1024,
  "max_tokens": 1024,
  "userId": "user_123",
  "conversationId": "conv_123",
  "sessionId": "session_123"
}
```

- **字段说明**

| 字段 | 所在 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| `messages` | body | `AgentChatMessage[]` | 与 `prompt` 二选一 | 聊天历史，使用 OpenAI Chat Completion message 格式（`role`, `content`, 也支持 `tool` 等） |
| `prompt` | body | string | 与 `messages` 二选一 | 单条提示文本；如果只传 `prompt`，会由服务端封装为一条 user 消息 |
| `context` | body | object | 否 | 自定义上下文（业务侧状态、变量等），会进入 Agent 上下文层 |
| `model` | body | string | 否 | 指定模型名（如果不填使用后端默认） |
| `temperature` | body | number | 否 | 采样温度，越大越随机 |
| `maxTokens` / `max_tokens` | body | number | 否 | 最大生成 token 数，两者任选一个 |
| `userId` | body | string | 否 | 用户 ID；如果有鉴权中间件，会优先用 `req.user.id` 覆盖 |
| `conversationId` | body | string | 否 | 对话 ID，用于消息分组和缓存 |
| `sessionId` | body | string | 否 | 会话 ID，用于多轮会话管理 |

> **重要约束**：`messages` 和 `prompt` 必须至少提供一个，否则接口返回 `400`。

### 3. 响应（SSE / Vercel AI 流）

- 当 `format=sse`（默认）时，响应头：

```text
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

- **事件类型**（`AgentSseEvent`）：

| event 名 | data 结构 | 含义 |
|----------|-----------|------|
| `agent.start` | `AgentRunStart` | 本次 run 开始，包含 `runId`、时间戳、上下文 |
| `agent.delta` | `AgentMessageDelta` | 增量文本片段，逐字/逐句推送 |
| `agent.message` | `AgentMessage` | 完整一条消息（id、role、content、时间戳等） |
| `tool.state` | `ToolStateUpdate` | 工具调用状态：排队、运行、成功、失败等 |
| `context.patch` | `AgentContextPatch` | Agent 更新的上下文差异 |
| `agent.end` | `AgentRunEnd` | 本轮 run 结束状态（`succeeded` / `failed` 等） |
| `error` | `AgentError` | 流式错误信息 |
| `ping` | `{ at: string }` | 心跳包，约每 15 秒一次 |

- SSE 每条事件的原始格式类似：

```text
event: agent.delta
data: {"event":"agent.delta","data":{"id":"msg_1","delta":"你好","role":"assistant"}}

```

- 当 `format=vercel-ai` 时：
  - `Content-Type: text/plain; charset=utf-8`
  - Header：`X-Vercel-AI-Data-Stream: v1`
  - Body 是 Vercel AI 风格的增量文本片段，适配前端的 Vercel AI SDK。

### 4. 可运行示例

**cURL（SSE 默认格式）**

```bash
curl -N \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -X POST "http://localhost:3000/v1/agent/chat" \
  -d '{
    "messages": [
      { "role": "user", "content": "帮我想一句给老朋友的新年祝福" }
    ],
    "userId": "user_123",
    "conversationId": "conv_123"
  }'
```

**Node（fetch + SSE 解析示意）**

```typescript
const res = await fetch('http://localhost:3000/v1/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: '帮我想一句给老朋友的新年祝福' }],
    userId: 'user_123',
    conversationId: 'conv_123',
  }),
});

for await (const chunk of res.body as any) {
  const text = chunk.toString('utf8');
  // 按行拆分，解析 event/data
  console.log(text);
}
```

---

## `POST /v1/agent/run` —— 一次性 Agent 执行

### 1. 作用

- **用途**：统一入口执行所有“非流式” Agent 能力，返回一次性 JSON 结果。
- **支持的 Agent**（`SupportedAgentId`）：

| agentId | 功能 |
|--------|------|
| `title_summary` | 生成对话标题和摘要 |
| `contact_insight` | 联系人洞察分析 |
| `archive_brief` | 归档提取 + 会前简报 |
| `network_action` | 全联系人行动建议 |
| `chat_conversation` | 实时聊天（一般用 `/agent/chat`，很少用 run） |

### 2. 通用请求结构

- **URL**：`POST http://localhost:3000/v1/agent/run`
- **Headers**

| Header | 值 |
|--------|----|
| `Content-Type` | `application/json` |

- **Body：`AgentRunRequest`（顶层字段）**

```json
{
  "agentId": "title_summary",
  "operation": null,
  "input": { },
  "options": {
    "useCache": true,
    "forceRefresh": false
  },
  "userId": "user_123",
  "sessionId": "session_123",
  "conversationId": "conv_123"
}
```

- **字段说明（顶层）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | `SupportedAgentId` | 是 | 指定要调用的 Agent 类型 |
| `operation` | string \| null | 部分 Agent 必填 | 同一 Agent 下的子操作（如 `archive_brief` 的 `archive_extract` / `brief_generate`） |
| `input` | object | 是 | 该 Agent 的业务输入，下面分 Agent 详细说明 |
| `options.useCache` | boolean | 否 | 是否使用缓存 |
| `options.forceRefresh` | boolean | 否 | 是否强制刷新（忽略缓存） |
| `userId` | string | 否 | 用户 ID，若有登录中间件，会被 `req.user.id` 覆盖 |
| `sessionId` | string | 否 | 会话 ID |
| `conversationId` | string | 建议传 | 用于缓存快照作用域、追踪本次调用 |

---

### 3. 响应通用封装

**响应体：`AgentRunResponse`**

```json
{
  "runId": "01HZABC...",
  "agentId": "title_summary",
  "operation": null,
  "cached": false,
  "snapshotId": "01HZSNAP...",
  "generatedAt": "2026-02-09T12:00:00.000Z",
  "generatedAtMs": 1739088000000,
  "data": { }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `runId` | string | 本次 Agent 执行的唯一 ID |
| `agentId` | string | 与请求中一致 |
| `operation` | string \| null | 若未传则为 null |
| `cached` | boolean | 是否命中缓存结果 |
| `snapshotId` | string | 快照 ID，用于检测结果是否变化 |
| `generatedAt` | string | ISO 8601 时间 |
| `generatedAtMs` | number | 毫秒时间戳，便于排序 |
| `data` | object | 各 Agent 各自定义的结果结构（见下） |

---

### 4. 各 Agent 的 `input` / `data` 说明与示例

#### 4.1 `title_summary` —— 对话标题 + 摘要

- **请求示例**

```bash
curl -X POST "http://localhost:3000/v1/agent/run" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "title_summary",
    "input": {
      "conversationId": "conv_123",
      "messages": [
        { "role": "user", "content": "今天天气真好" },
        { "role": "assistant", "content": "是的，很适合出去散步" },
        { "role": "user", "content": "有什么建议的路线吗？" }
      ],
      "language": "zh"
    },
    "options": {
      "useCache": true
    },
    "conversationId": "conv_123"
  }'
```

- **`input` 字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `conversationId` | string | 是 | 对话 ID |
| `messages` | array | 是 | 对话消息列表，仅需 `role` + `content` |
| `language` | string | 否 | `zh` / `en` 等，默认为中文 |

- **`data` 结果结构**

```json
"data": {
  "title": "天气和散步路线建议",
  "summary": "讨论了今天天气很好，适合出去散步，并询问了具体的路线建议。"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 对话标题（短语） |
| `summary` | string | 2–3 句自然语言摘要 |

---

#### 4.2 `contact_insight` —— 联系人洞察

- **请求示例**

```bash
curl -X POST "http://localhost:3000/v1/agent/run" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "contact_insight",
    "input": {
      "userId": "user_123",
      "contactId": "contact_456",
      "depth": "standard"
    },
    "options": {
      "useCache": true
    },
    "conversationId": "insight_contact_456"
  }'
```

- **`input` 字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | string | 是 | 当前用户 ID |
| `contactId` | string | 是 | 要分析的联系人 ID |
| `depth` | `"brief" \| "standard" \| "deep"` | 否 | 分析深度，默认 `standard` |

- **`data` 结果（核心字段）**

```json
"data": {
  "profileSummary": "联系人背景和关系概况...",
  "relationshipSignals": [
    { "type": "positive_trend", "description": "最近交互变多", "strength": "strong" }
  ],
  "opportunities": [
    { "title": "新项目合作机会", "description": "...", "priority": "high" }
  ],
  "risks": [
    { "title": "交互间隔较长", "description": "...", "severity": "low" }
  ],
  "suggestedActions": [
    { "action": "发送问候消息", "reason": "...", "urgency": "high" }
  ],
  "openingLines": ["好久没聊了，最近项目进展怎么样？"],
  "citations": [
    { "source": "conv_123", "type": "conversation", "reference": "最近一次通话记录" }
  ],
  "sourceHash": "abc123...",
  "generatedAt": 1739088000000
}
```

---

#### 4.3 `archive_brief` —— 归档提取 & 会前简报

- **操作一：`archive_extract`（从对话归档中提取结构化信息）**

**请求示例**

```bash
curl -X POST "http://localhost:3000/v1/agent/run" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "archive_brief",
    "operation": "archive_extract",
    "input": {
      "userId": "user_123",
      "conversationId": "conv_123"
    },
    "options": {
      "useCache": true
    },
    "conversationId": "conv_123"
  }'
```

**`input` 字段（archive_extract）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | string | 是 | 用户 ID |
| `conversationId` | string | 是 | 要提取的对话 ID |

**`data` 示例（关键字段）**

```json
"data": {
  "operation": "archive_extract",
  "id": "conv_123",
  "status": "completed",
  "summary": "对话摘要...",
  "payload": {
    "keyPoints": ["关键要点1", "关键要点2"],
    "decisions": ["决策1"],
    "actionItems": ["行动项1", "行动项2"],
    "participants": ["张三", "李四"]
  }
}
```

---

- **操作二：`brief_generate`（生成联系人会前简报）**

**请求示例**

```bash
curl -X POST "http://localhost:3000/v1/agent/run" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "archive_brief",
    "operation": "brief_generate",
    "input": {
      "userId": "user_123",
      "contactId": "contact_456"
    },
    "options": {
      "useCache": true
    },
    "conversationId": "brief_contact_456"
  }'
```

**`input` 字段（brief_generate）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | string | 是 | 用户 ID |
| `contactId` | string | 是 | 联系人 ID |

**`data` 示例（关键字段）**

```json
"data": {
  "operation": "brief_generate",
  "id": "brief_123",
  "contact_id": "contact_456",
  "content": "## 关系背景...\n\n## 最近交互...\n\n## 建议话题...\n",
  "generated_at": "2026-02-09T12:00:00.000Z",
  "source_hash": "abc123..."
}
```

---

#### 4.4 `network_action` —— 全网络行动建议

- **请求示例**

```bash
curl -X POST "http://localhost:3000/v1/agent/run" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "network_action",
    "input": {
      "userId": "user_123",
      "limit": 10
    },
    "options": {
      "useCache": true
    },
    "conversationId": "network_user_123"
  }'
```

- **`input` 字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | string | 是 | 用户 ID |
| `limit` | number | 否 | 最大返回多少个跟进对象 |

- **`data` 结构（核心字段）**

```json
"data": {
  "followUps": [
    {
      "contactId": "contact_123",
      "contactName": "张三",
      "reason": "上次交互已两个月",
      "priority": "high",
      "suggestedAction": "发一条问候并询问项目进展"
    }
  ],
  "recommendations": [
    {
      "type": "connection",
      "description": "可以介绍张三和李四认识",
      "contacts": ["contact_123", "contact_456"],
      "confidence": 0.8
    }
  ],
  "synthesis": "对整体联系人网络的总结文本...",
  "nextActions": [
    {
      "action": "跟进3个高优先级联系人",
      "priority": "high",
      "estimatedTime": "30 分钟"
    }
  ],
  "metadata": {
    "cached": false,
    "sourceHash": "abc123...",
    "generatedAt": 1739088000000
  }
}
```

---

## `GET /v1/agent/messages` —— 查询历史 Agent 消息

### 1. 作用

- **用途**：查询保存在内存中的 Agent 消息历史，用于回显、调试或前端展示历史对话。
- 返回值为一个 `AgentMessage[]` 数组。

### 2. 请求

- **URL**：`GET http://localhost:3000/v1/agent/messages`
- **Query 参数**

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `conversationId` | string | 与 `sessionId` 二选一 | 对话 ID，优先级与 `sessionId` 等价，传一个即可 |
| `sessionId` | string | 与 `conversationId` 二选一 | 会话 ID，如果没传 `conversationId` 可以用这个作为 key 的一部分 |
| `userId` | string | 否 | 用户 ID；不传时会尝试从 `req.user.id` 读取；都没有则视为 `anonymous` |

> 服务器内部按 `key = (userId || 'anonymous') + ':' + (conversationId || sessionId || 'default')` 组合来取消息。

### 3. 响应

- **200 OK，body：`AgentMessage[]`**

```json
[
  {
    "id": "01HZMSG1...",
    "role": "user",
    "content": "你好",
    "createdAt": "2026-02-09T12:00:00.000Z",
    "createdAtMs": 1739088000000,
    "toolCallId": null,
    "references": [],
    "metadata": {}
  },
  {
    "id": "01HZMSG2...",
    "role": "assistant",
    "content": "你好，请问有什么可以帮你？",
    "createdAt": "2026-02-09T12:00:01.000Z",
    "createdAtMs": 1739088001000
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 消息 ID |
| `role` | `"system" \| "user" \| "assistant" \| "tool"` | 消息角色 |
| `content` | string | 文本内容 |
| `createdAt` | string | 创建时间（ISO） |
| `createdAtMs` | number | 毫秒时间戳 |
| `toolCallId` | string | 若由某次工具调用产生，可记录对应的 tool 调用 ID |
| `references` | array | 与这条消息相关的外部引用（如某次事件、某条记录） |
| `metadata` | object | 业务自定义元数据 |

### 4. 可运行示例

```bash
curl "http://localhost:3000/v1/agent/messages?userId=user_123&conversationId=conv_123"
```

---

## `GET /v1/agent/list` —— 查询所有 Agent 列表

### 1. 作用

- **用途**：以“名片”的方式列出后端已配置的所有 Agent，包含状态、支持的操作、输入输出 schema、使用说明等。
- 适合给管理后台、前端配置面板、自动文档使用。

### 2. 请求

- **URL**：`GET http://localhost:3000/v1/agent/list`
- **Query 参数**：无

### 3. 响应：`AgentListResponseDto`

```json
{
  "agents": [
    {
      "id": "title_summary",
      "name": "对话标题与摘要",
      "description": "根据对话内容生成标题和摘要",
      "version": "1.0.0",
      "status": "available",
      "statusError": null,
      "operations": [],
      "tools": {
        "mode": "none",
        "allowedTools": []
      },
      "cache": {
        "ttl": 3600
      },
      "memory": {
        "strategy": "sliding_window",
        "maxTokens": 4000
      },
      "inputSchema": {},
      "outputSchema": {},
      "usage": "在对话结束或第 3 条消息后调用 /v1/agent/run，agentId=title_summary",
      "endpoint": "/v1/agent/run"
    }
  ],
  "total": 1
}
```

- **字段说明**

**顶层**

| 字段 | 类型 | 说明 |
|------|------|------|
| `agents` | `AgentInfoDto[]` | Agent 列表 |
| `total` | number | Agent 总数 |

**`AgentInfoDto`**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | Agent 唯一 ID（与 `agentId` 一致，如 `title_summary`） |
| `name` | string | Agent 显示名称 |
| `description` | string | Agent 简要说明 |
| `version` | string | 版本号 |
| `status` | `"available" \| "unavailable"` | 当前是否可用 |
| `statusError` | string | 若不可用，具体错误信息 |
| `operations` | `AgentOperationDto[]` | 支持的操作列表（例如 `archive_extract` / `brief_generate`） |
| `tools` | `AgentToolInfoDto` | 工具调用策略（`mode`、`allowedTools`） |
| `cache` | `AgentCacheInfoDto` | 缓存策略（TTL 秒） |
| `memory` | `AgentMemoryInfoDto` | 记忆策略（类型、最大 token） |
| `inputSchema` | object | 输入字段的结构描述（OpenAPI/JSON Schema 风格） |
| `outputSchema` | object | 输出字段的结构描述 |
| `usage` | string | 人类可读的“如何使用这个 Agent”说明 |
| `endpoint` | string | 推荐调用的 HTTP 端点路径 |

### 4. 可运行示例

```bash
curl "http://localhost:3000/v1/agent/list"
```
。