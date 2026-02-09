# title_summary Agent 前端集成指南

## 概述

`title_summary` Agent 用于生成对话的标题和摘要。

**默认输出语言：中文**

---

## API 端点

```
POST /v1/agent/run
```

**Agent 路由说明**：通过请求体中的 `agentId: "title_summary"` 字段指定要调用的 Agent。

---

## 请求格式

```json
{
  "agentId": "title_summary",
  "input": {
    "conversationId": "string",
    "messages": [
      {
        "role": "user|assistant",
        "content": "string"
      }
    ],
    "language": "zh"
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
| `agentId` | string | 是 | **指定调用的 Agent**，固定值：`"title_summary"` |
| `input.conversationId` | string | 是 | 对话 ID |
| `input.messages` | array | 是 | 消息列表，包含 `role` 和 `content` |
| `input.language` | string | 否 | 输出语言，默认 `"zh"`（中文） |
| `options.useCache` | boolean | 否 | 是否使用缓存，默认 `true` |
| `options.forceRefresh` | boolean | 否 | 是否强制刷新（忽略缓存），默认 `false` |
| `conversationId` | string | 是 | 对话 ID（用于快照作用域） |

### Agent ID 说明

`agentId` 字段用于指定要调用的 Agent，支持的值包括：

| `agentId` | 用途 |
|-----------|------|
| `title_summary` | 生成对话标题和摘要 |
| `contact_insight` | 联系人洞察分析 |
| `archive_brief` | 归档提取和简报生成 |
| `network_action` | 全体联系人归纳行动建议 |
| `chat_conversation` | 实时流式对话 |

---

## 响应格式

```json
{
  "runId": "01HZ...",
  "agentId": "title_summary",
  "operation": null,
  "cached": false,
  "snapshotId": "01HZ...",
  "generatedAt": "2026-02-09T12:00:00.000Z",
  "generatedAtMs": 1739088000000,
  "data": {
    "title": "天气与散步建议",
    "summary": "讨论了今天天气晴朗适合出门散步，建议用户利用好天气进行户外活动。"
  }
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `runId` | string | 本次运行 ID |
| `cached` | boolean | 是否来自缓存 |
| `snapshotId` | string | 快照 ID（用于缓存检测） |
| `data.title` | string | 生成的标题（最多 50 字符） |
| `data.summary` | string | 生成的摘要（2-3 句话） |

---

## 前端集成逻辑

### 触发条件

```typescript
// 前端维护的状态
interface ConversationState {
  conversationId: string;
  messages: Message[];
  titleSummaryGenerated: boolean;  // 是否已生成过标题摘要
}

// 触发判断
function shouldTriggerTitleSummary(state: ConversationState): boolean {
  // 已生成过，不重复生成
  if (state.titleSummaryGenerated) {
    return false;
  }

  const messageCount = state.messages.length;

  // 条件1: 总计第3条消息发出时
  if (messageCount >= 3) {
    return true;
  }

  // 条件2: 会话结束时（由前端判断）且消息数 < 3
  if (isConversationEnding() && messageCount > 0 && messageCount < 3) {
    return true;
  }

  return false;
}
```

### 异步调用示例

```typescript
// 异步调用，不阻塞聊天
async function generateTitleSummary(conversationId: string, messages: Message[]) {
  // 使用 fire-and-forget 模式，不等待结果
  fetch('/v1/agent/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: 'title_summary',
      input: {
        conversationId,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        language: 'zh'
      },
      options: {
        useCache: true  // 利用缓存避免重复计算
      },
      conversationId
    })
  }).then(async res => {
    if (res.ok) {
      const result = await res.json();
      // 更新会话标题和摘要
      updateConversationTitle(conversationId, {
        title: result.data.title,
        summary: result.data.summary
      });
      // 标记已生成
      markTitleSummaryGenerated(conversationId);
    }
  }).catch(err => {
    console.error('Title summary generation failed:', err);
    // 静默失败，不影响用户体验
  });
}
```

### 发送消息后触发

```typescript
function sendMessage(content: string) {
  // 1. 发送消息
  const response = await chatAPI.sendMessage({ content });

  // 2. 检查是否需要触发标题摘要
  const state = getConversationState(conversationId);
  if (shouldTriggerTitleSummary(state)) {
    // 异步生成，不等待
    generateTitleSummary(conversationId, state.messages);
  }

  return response;
}
```

---

## 边界情况处理

### 空对话或单条消息

Agent 会根据内容生成合理的标题摘要：
- 空内容 → "未分类对话"
- 单条消息 → 总结消息本身

### 混合语言

- 中英混合 → 以中文为主输出
- 纯英文 → 输出英文
- 技术术语 → 保留英文原文

### 缓存机制

- 相同输入会返回缓存结果（`cached: true`）
- 前端可通过 `snapshotId` 判断是否为新结果
- 如需强制重新生成，设置 `forceRefresh: true`

---

## 完整流程示例

```typescript
// 1. 用户发送消息
await sendMessage("今天天气真好");

// 2. 第2条消息
await sendMessage("是的，适合出去散步");

// 3. 第3条消息 - 触发标题摘要生成
await sendMessage("你有什么建议吗？");
// → generateTitleSummary() 在后台异步执行
// → 对话列表稍后更新显示新标题

// 4. 后续消息不再触发（已生成）
await sendMessage("谢谢");
// → titleSummaryGenerated = true，不再调用
```

---

## 注意事项

1. **异步执行**：标题摘要生成是异步的，不阻塞聊天响应
2. **幂等性**：通过 `titleSummaryGenerated` 标志避免重复调用
3. **静默失败**：生成失败不影响正常聊天功能
4. **缓存利用**：设置 `useCache: true` 提高性能
5. **语言检测**：Agent 会自动检测对话语言并输出对应语言的标题摘要
