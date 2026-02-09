# archive_brief Agent 前端集成指南

## 概述

`archive_brief` Agent 支持两种操作模式：
1. **archive_extract**: 从对话归档中提取结构化信息
2. **brief_generate**: 为联系人生成会前简报

**默认输出语言：中文**

---

## API 端点

```
POST /v1/agent/run
```

**Agent 路由说明**：通过请求体中的 `agentId: "archive_brief"` 字段指定要调用的 Agent，通过 `operation` 字段指定操作类型。

---

## 请求格式

### archive_extract 操作

```json
{
  "agentId": "archive_brief",
  "operation": "archive_extract",
  "input": {
    "userId": "string",
    "conversationId": "string"
  },
  "options": {
    "useCache": true,
    "forceRefresh": false
  },
  "conversationId": "string"
}
```

### brief_generate 操作

```json
{
  "agentId": "archive_brief",
  "operation": "brief_generate",
  "input": {
    "userId": "string",
    "contactId": "string"
  },
  "options": {
    "useCache": true,
    "forceRefresh": false
  },
  "conversationId": "string"
}
```

### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | **指定调用的 Agent**，固定值：`"archive_brief"` |
| `operation` | string | 是 | **操作类型**，可选值：`"archive_extract"` 或 `"brief_generate"` |
| `input.userId` | string | 是 | 用户 ID |
| `input.conversationId` | string | 是（archive_extract） | 对话 ID（仅 archive_extract 需要） |
| `input.contactId` | string | 是（brief_generate） | 联系人 ID（仅 brief_generate 需要） |
| `options.useCache` | boolean | 否 | 是否使用缓存，默认 `true` |
| `options.forceRefresh` | boolean | 否 | 是否强制刷新（忽略缓存），默认 `false` |
| `conversationId` | string | 是 | 对话 ID（用于快照作用域） |

### Agent ID 说明

`agentId` 字段用于指定要调用的 Agent，支持的值包括：

| `agentId` | 用途 |
|-----------|------|
| `archive_brief` | 归档提取和简报生成 |
| `title_summary` | 生成对话标题和摘要 |
| `contact_insight` | 联系人洞察分析 |
| `network_action` | 全体联系人归纳行动建议 |
| `chat_conversation` | 实时流式对话 |

---

## 响应格式

### archive_extract 响应

```json
{
  "runId": "01HZ...",
  "agentId": "archive_brief",
  "operation": "archive_extract",
  "cached": false,
  "snapshotId": "01HZ...",
  "generatedAt": "2026-02-09T12:00:00.000Z",
  "generatedAtMs": 1739088000000,
  "data": {
    "operation": "archive_extract",
    "id": "conv_123",
    "status": "completed",
    "summary": "讨论了项目进度和下一步计划，确定了三个关键行动项。",
    "payload": {
      "keyPoints": [
        "项目进度正常，已完成 80%",
        "需要在下周完成剩余功能"
      ],
      "decisions": [
        "决定采用新的技术方案",
        "确定了下一次会议时间"
      ],
      "actionItems": [
        "完成剩余功能开发",
        "准备技术方案文档",
        "安排下一次会议"
      ],
      "participants": ["张三", "李四"]
    }
  }
}
```

### brief_generate 响应

```json
{
  "runId": "01HZ...",
  "agentId": "archive_brief",
  "operation": "brief_generate",
  "cached": false,
  "snapshotId": "01HZ...",
  "generatedAt": "2026-02-09T12:00:00.000Z",
  "generatedAtMs": 1739088000000,
  "data": {
    "operation": "brief_generate",
    "id": "brief_123",
    "contact_id": "contact_456",
    "content": "## 关系背景\n\n与张三的合作关系始于 2023 年，主要涉及技术咨询项目...\n\n## 最近交互\n\n- 2024-01-15: 讨论了新项目的技术方案\n- 2024-01-20: 确认了项目时间表\n\n## 建议话题\n\n1. 询问新项目的进展情况\n2. 讨论技术方案的可行性\n...",
    "generated_at": "2026-02-09T12:00:00.000Z",
    "source_hash": "abc123..."
  }
}
```

### 响应字段说明

#### archive_extract 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `runId` | string | 本次运行 ID |
| `cached` | boolean | 是否来自缓存 |
| `snapshotId` | string | 快照 ID（用于缓存检测） |
| `data.operation` | string | 操作类型，固定值 `"archive_extract"` |
| `data.id` | string | 对话 ID |
| `data.status` | string | 状态，通常为 `"completed"` |
| `data.summary` | string | 对话摘要（中文） |
| `data.payload.keyPoints` | array | 关键要点列表 |
| `data.payload.decisions` | array | 决策列表 |
| `data.payload.actionItems` | array | 行动项列表 |
| `data.payload.participants` | array | 参与者列表 |

#### brief_generate 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `runId` | string | 本次运行 ID |
| `cached` | boolean | 是否来自缓存 |
| `snapshotId` | string | 快照 ID（用于缓存检测） |
| `data.operation` | string | 操作类型，固定值 `"brief_generate"` |
| `data.id` | string | 简报 ID |
| `data.contact_id` | string | 联系人 ID |
| `data.content` | string | 简报内容（Markdown 格式，中文） |
| `data.generated_at` | string | 生成时间（ISO 8601） |
| `data.source_hash` | string | 源数据哈希（用于缓存） |

---

## 前端集成逻辑

### archive_extract 使用场景

```typescript
// 提取对话归档
async function extractConversationArchive(
  userId: string,
  conversationId: string
) {
  const response = await fetch('/v1/agent/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: 'archive_brief',
      operation: 'archive_extract',
      input: {
        userId,
        conversationId
      },
      options: {
        useCache: true
      },
      conversationId
    })
  });

  if (response.ok) {
    const result = await response.json();
    // 使用提取的结构化数据
    const { summary, payload } = result.data;
    // 显示关键要点、决策、行动项等
    displayArchiveExtract(summary, payload);
  }
}
```

### brief_generate 使用场景

```typescript
// 生成会前简报
async function generateContactBrief(
  userId: string,
  contactId: string
) {
  const response = await fetch('/v1/agent/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: 'archive_brief',
      operation: 'brief_generate',
      input: {
        userId,
        contactId
      },
      options: {
        useCache: true
      },
      conversationId: `brief_${contactId}`
    })
  });

  if (response.ok) {
    const result = await response.json();
    // 显示简报内容
    displayBrief(result.data.content);
  }
}
```

### 触发时机

#### archive_extract
- 用户点击"归档对话"按钮时
- 对话结束后自动归档
- 批量归档多个对话时

#### brief_generate
- 会议前自动生成简报
- 用户点击"生成简报"按钮时
- 查看联系人详情时预加载

---

## 边界情况处理

### 空对话或无效数据

- **archive_extract**: 如果对话不存在或为空，Agent 会返回空的关键要点和行动项
- **brief_generate**: 如果联系人没有交互历史，Agent 会基于基本信息生成基础简报

### 混合语言

- 中英混合 → 以中文为主输出
- 纯英文 → 输出英文
- 技术术语 → 保留英文原文

### 缓存机制

- 相同输入会返回缓存结果（`cached: true`）
- 前端可通过 `snapshotId` 判断是否为新结果
- 如需强制重新生成，设置 `forceRefresh: true`
- `archive_extract` 基于 `conversationId` 缓存
- `brief_generate` 基于 `contactId` 和源数据哈希缓存

---

## 完整流程示例

### archive_extract 示例

```typescript
// 1. 用户完成对话
await sendMessage("项目完成了");

// 2. 用户点击归档按钮
await extractConversationArchive(userId, conversationId);

// 3. 显示归档结果
// - 摘要：项目已完成
// - 关键要点：项目进度 100%
// - 决策：项目验收通过
// - 行动项：准备项目报告
// - 参与者：张三、李四
```

### brief_generate 示例

```typescript
// 1. 用户准备与联系人会面
const contactId = "contact_123";

// 2. 自动生成简报
await generateContactBrief(userId, contactId);

// 3. 显示简报内容
// - 关系背景：合作 2 年，主要涉及技术咨询
// - 最近交互：3 次对话，讨论新项目
// - 建议话题：询问项目进展、讨论技术方案
// - 开场白建议：3 条自然对话开场
```

---

## 注意事项

1. **操作类型必需**：必须明确指定 `operation` 参数（`archive_extract` 或 `brief_generate`）
2. **输入参数不同**：两种操作需要不同的输入参数
3. **输出格式不同**：两种操作的输出结构完全不同，需要分别处理
4. **异步执行**：归档提取和简报生成是异步的，不阻塞主流程
5. **缓存利用**：设置 `useCache: true` 提高性能，相同输入会复用缓存结果
6. **语言检测**：Agent 会自动检测输入语言并输出对应语言的摘要和简报



