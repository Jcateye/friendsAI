# network_action Agent 前端集成指南

## 概述

`network_action` Agent 用于生成全体联系人层面的关系盘点与行动建议，帮助用户管理整个联系人网络。

**默认输出语言：中文**

---

## API 端点

```
POST /v1/agent/run
```

**Agent 路由说明**：通过请求体中的 `agentId: "network_action"` 字段指定要调用的 Agent。

---

## 请求格式

```json
{
  "agentId": "network_action",
  "input": {
    "userId": "string",
    "limit": 10
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
| `agentId` | string | 是 | **指定调用的 Agent**，固定值：`"network_action"` |
| `input.userId` | string | 是 | 用户 ID |
| `input.limit` | number | 否 | 限制返回的联系人数量（可选） |
| `options.useCache` | boolean | 否 | 是否使用缓存，默认 `true` |
| `options.forceRefresh` | boolean | 否 | 是否强制刷新（忽略缓存），默认 `false` |
| `conversationId` | string | 是 | 对话 ID（用于快照作用域） |

### Agent ID 说明

`agentId` 字段用于指定要调用的 Agent，支持的值包括：

| `agentId` | 用途 |
|-----------|------|
| `network_action` | 全体联系人归纳行动建议 |
| `contact_insight` | 联系人洞察分析 |
| `archive_brief` | 归档提取和简报生成 |
| `title_summary` | 生成对话标题和摘要 |
| `chat_conversation` | 实时流式对话 |

---

## 响应格式

```json
{
  "runId": "01HZ...",
  "agentId": "network_action",
  "operation": null,
  "cached": false,
  "snapshotId": "01HZ...",
  "generatedAt": "2026-02-09T12:00:00.000Z",
  "generatedAtMs": 1739088000000,
  "data": {
    "followUps": [
      {
        "contactId": "contact_123",
        "contactName": "张三",
        "reason": "上次交互距今已 2 个月，需要及时跟进",
        "priority": "high",
        "suggestedAction": "发送问候消息并询问项目进展"
      },
      {
        "contactId": "contact_456",
        "contactName": "李四",
        "reason": "有未完成的任务待处理",
        "priority": "medium",
        "suggestedAction": "跟进任务完成情况"
      }
    ],
    "recommendations": [
      {
        "type": "connection",
        "description": "张三和李四在同一行业，可以介绍他们认识",
        "contacts": ["contact_123", "contact_456"],
        "confidence": 0.8
      },
      {
        "type": "followup",
        "description": "王五最近发布了新项目，是建立合作的好机会",
        "contacts": ["contact_789"],
        "confidence": 0.7
      }
    ],
    "synthesis": "您的联系人网络包含 50 个联系人，最近 30 天有 15 次交互。整体关系网络健康，但有几个重要联系人需要及时跟进。建议重点关注高优先级跟进和潜在合作机会。",
    "nextActions": [
      {
        "action": "跟进 3 个高优先级联系人",
        "priority": "high",
        "estimatedTime": "30 分钟"
      },
      {
        "action": "安排一次三方介绍会议",
        "priority": "medium",
        "estimatedTime": "1 小时"
      },
      {
        "action": "更新联系人标签和备注",
        "priority": "low",
        "estimatedTime": "15 分钟"
      }
    ],
    "metadata": {
      "cached": false,
      "sourceHash": "abc123...",
      "generatedAt": 1739088000000
    }
  }
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `runId` | string | 本次运行 ID |
| `cached` | boolean | 是否来自缓存 |
| `snapshotId` | string | 快照 ID（用于缓存检测） |
| `data.followUps` | array | 需要跟进的联系人列表，包含联系人信息、跟进原因、优先级和建议行动 |
| `data.recommendations` | array | 关系网络建议，包含类型（连接/跟进/介绍）、描述、相关联系人和置信度 |
| `data.synthesis` | string | 整体关系盘点（200-300 字） |
| `data.nextActions` | array | 可执行的下一步行动，包含行动描述、优先级和预估时间 |
| `data.metadata.cached` | boolean | 是否来自缓存 |
| `data.metadata.sourceHash` | string | 源数据哈希（用于缓存） |
| `data.metadata.generatedAt` | number | 生成时间戳（毫秒） |

---

## 前端集成逻辑

### 基础调用示例

```typescript
// 生成网络行动建议
async function generateNetworkAction(userId: string, limit?: number) {
  const response = await fetch('/v1/agent/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: 'network_action',
      input: {
        userId,
        limit
      },
      options: {
        useCache: true
      },
      conversationId: `network_${userId}`
    })
  });

  if (response.ok) {
    const result = await response.json();
    // 使用网络行动建议数据
    displayNetworkAction(result.data);
  }
}
```

### 使用场景

```typescript
// 1. 仪表板加载时自动生成
async function loadDashboard(userId: string) {
  // 异步生成，不阻塞页面加载
  generateNetworkAction(userId)
    .then(result => {
      // 显示关系盘点和行动建议
      updateDashboard({
        synthesis: result.data.synthesis,
        followUps: result.data.followUps,
        recommendations: result.data.recommendations,
        nextActions: result.data.nextActions
      });
    })
    .catch(err => {
      console.error('Failed to load network action:', err);
      // 静默失败，不影响页面显示
    });
}

// 2. 用户手动刷新
async function refreshNetworkAction(userId: string) {
  const result = await generateNetworkAction(userId, undefined, true);
  // 强制刷新，显示最新结果
  displayNetworkAction(result.data);
}

// 3. 限制返回数量（性能优化）
async function loadTopFollowUps(userId: string) {
  // 只返回前 5 个跟进建议
  const result = await generateNetworkAction(userId, 5);
  displayFollowUps(result.data.followUps);
}
```

### 触发时机

- **自动触发**：
  - 打开仪表板/行动面板时
  - 用户登录后首次加载
- **手动触发**：
  - 用户点击"刷新建议"按钮
  - 用户点击"生成关系盘点"按钮
- **定时触发**：
  - 每 12 小时自动刷新（基于缓存 TTL）

---

## 边界情况处理

### 空联系人网络

- 如果用户没有联系人，Agent 会返回空数组和友好的提示信息
- `synthesis` 会说明当前网络状态并给出建议

### 混合语言

- 中英混合 → 以中文为主输出
- 纯英文 → 输出英文
- 技术术语 → 保留英文原文

### 缓存机制

- 相同输入（`userId`、联系人数据哈希）会返回缓存结果（`cached: true`）
- 缓存 TTL 为 12 小时（43200 秒）
- 前端可通过 `snapshotId` 判断是否为新结果
- 如需强制重新生成，设置 `forceRefresh: true`
- 缓存基于源数据哈希，联系人数据变化时自动失效

---

## 完整流程示例

```typescript
// 1. 用户打开仪表板
const userId = "user_123";

// 2. 自动生成网络行动建议（异步）
loadDashboard(userId);

// 3. 显示关系盘点
// - 整体关系网络状态：50 个联系人，15 次最近交互
// - 需要跟进的联系人：3 个高优先级，5 个中优先级
// - 关系网络建议：2 个连接建议，1 个跟进建议
// - 下一步行动：3 个具体可执行行动

// 4. 用户点击"跟进联系人"
onFollowUpClick((contactId: string) => {
  // 跳转到联系人详情页或发送消息
  navigateToContact(contactId);
});

// 5. 用户点击"刷新建议"
onRefreshClick(() => {
  refreshNetworkAction(userId);
});
```

---

## 注意事项

1. **性能考虑**：网络行动建议涉及所有联系人数据，生成时间较长，建议异步执行
2. **缓存利用**：设置 `useCache: true` 提高性能，相同输入会复用缓存结果
3. **数据更新**：当联系人数据或交互历史更新时，建议重新生成以获得最新建议
4. **限制数量**：对于大型联系人网络，可以使用 `limit` 参数限制返回数量
5. **异步执行**：建议生成是异步的，不阻塞主流程
6. **语言检测**：Agent 会自动检测输入语言并输出对应语言的建议





