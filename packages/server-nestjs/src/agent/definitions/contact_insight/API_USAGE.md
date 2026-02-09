# contact_insight Agent 前端集成指南

## 概述

`contact_insight` Agent 用于生成联系人洞察分析，帮助用户理解关系动态、识别机会和风险，并提供行动建议。

**默认输出语言：中文**

**支持的分析深度：** `brief`（简要）、`standard`（标准，默认）、`deep`（深度）

---

## API 端点

```
POST /v1/agent/run
```

**Agent 路由说明**：通过请求体中的 `agentId: "contact_insight"` 字段指定要调用的 Agent。

---

## 请求格式

```json
{
  "agentId": "contact_insight",
  "input": {
    "userId": "string",
    "contactId": "string",
    "depth": "standard"
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
| `agentId` | string | 是 | **指定调用的 Agent**，固定值：`"contact_insight"` |
| `input.userId` | string | 是 | 用户 ID |
| `input.contactId` | string | 是 | 联系人 ID |
| `input.depth` | string | 否 | 分析深度，可选值：`"brief"`、`"standard"`（默认）、`"deep"` |
| `options.useCache` | boolean | 否 | 是否使用缓存，默认 `true` |
| `options.forceRefresh` | boolean | 否 | 是否强制刷新（忽略缓存），默认 `false` |
| `conversationId` | string | 是 | 对话 ID（用于快照作用域） |

### 分析深度说明

| `depth` | 说明 | 适用场景 |
|---------|------|----------|
| `brief` | 简要分析，聚焦关键亮点和 3-5 个洞察 | 快速预览、列表页展示 |
| `standard` | 标准分析，提供 5-10 个平衡的洞察 | 详情页默认展示 |
| `deep` | 深度分析，全面探索所有方面 | 深度研究、重要联系人 |

### Agent ID 说明

`agentId` 字段用于指定要调用的 Agent，支持的值包括：

| `agentId` | 用途 |
|-----------|------|
| `contact_insight` | 联系人洞察分析 |
| `archive_brief` | 归档提取和简报生成 |
| `title_summary` | 生成对话标题和摘要 |
| `network_action` | 全体联系人归纳行动建议 |
| `chat_conversation` | 实时流式对话 |

---

## 响应格式

```json
{
  "runId": "01HZ...",
  "agentId": "contact_insight",
  "operation": null,
  "cached": false,
  "snapshotId": "01HZ...",
  "generatedAt": "2026-02-09T12:00:00.000Z",
  "generatedAtMs": 1739088000000,
  "data": {
    "profileSummary": "张三是一位技术顾问，与您有 2 年的合作关系，主要涉及技术咨询项目。最近交互频繁，关系积极。",
    "relationshipSignals": [
      {
        "type": "positive_trend",
        "description": "最近 3 个月交互频率增加，表明关系在加强",
        "strength": "strong"
      },
      {
        "type": "engagement_opportunity",
        "description": "对方最近发布了新项目，是建立更深合作的良机",
        "strength": "moderate"
      }
    ],
    "opportunities": [
      {
        "title": "新项目合作机会",
        "description": "对方正在启动新项目，可以主动提供技术支持或资源",
        "priority": "high"
      },
      {
        "title": "技术交流活动",
        "description": "可以邀请对方参加技术分享会，加深关系",
        "priority": "medium"
      }
    ],
    "risks": [
      {
        "title": "交互间隔较长",
        "description": "上次交互距今已 2 个月，需要及时跟进",
        "severity": "low"
      }
    ],
    "suggestedActions": [
      {
        "action": "发送新项目合作提案",
        "reason": "对方正在启动新项目，是建立合作的良机",
        "urgency": "high"
      },
      {
        "action": "安排一次技术交流会议",
        "reason": "通过面对面交流加深关系",
        "urgency": "medium"
      }
    ],
    "openingLines": [
      "看到您最近启动了新项目，进展如何？",
      "上次讨论的技术方案实施得怎么样？",
      "最近有个技术分享会，您有兴趣参加吗？"
    ],
    "citations": [
      {
        "source": "conv_123",
        "type": "conversation",
        "reference": "讨论了新项目的技术方案"
      },
      {
        "source": "event_456",
        "type": "event",
        "reference": "2024-01-15 项目启动会议"
      }
    ],
    "sourceHash": "abc123...",
    "generatedAt": 1739088000000
  }
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `runId` | string | 本次运行 ID |
| `cached` | boolean | 是否来自缓存 |
| `snapshotId` | string | 快照 ID（用于缓存检测） |
| `data.profileSummary` | string | 联系人档案摘要（50-1000 字符） |
| `data.relationshipSignals` | array | 关系信号列表，包含类型、描述和强度 |
| `data.opportunities` | array | 机会列表，包含标题、描述和优先级 |
| `data.risks` | array | 风险列表，包含标题、描述和严重程度 |
| `data.suggestedActions` | array | 建议行动列表，包含行动、原因和紧急程度 |
| `data.openingLines` | array | 开场白建议列表（1-10 条） |
| `data.citations` | array | 引用列表，引用具体的数据点 |
| `data.sourceHash` | string | 源数据哈希（用于缓存） |
| `data.generatedAt` | number | 生成时间戳（毫秒） |

---

## 前端集成逻辑

### 基础调用示例

```typescript
// 生成联系人洞察
async function generateContactInsight(
  userId: string,
  contactId: string,
  depth: 'brief' | 'standard' | 'deep' = 'standard'
) {
  const response = await fetch('/v1/agent/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: 'contact_insight',
      input: {
        userId,
        contactId,
        depth
      },
      options: {
        useCache: true
      },
      conversationId: `insight_${contactId}`
    })
  });

  if (response.ok) {
    const result = await response.json();
    // 使用洞察数据
    displayContactInsight(result.data);
  }
}
```

### 不同深度的使用场景

```typescript
// 1. 列表页快速预览（brief）
async function loadContactListInsights(contacts: Contact[]) {
  for (const contact of contacts) {
    generateContactInsight(userId, contact.id, 'brief')
      .then(result => {
        // 显示简要摘要和关键洞察
        updateContactCard(contact.id, {
          summary: result.data.profileSummary,
          topOpportunity: result.data.opportunities[0]
        });
      })
      .catch(err => console.error('Failed to load insight:', err));
  }
}

// 2. 详情页标准分析（standard）
async function loadContactDetail(contactId: string) {
  const insight = await generateContactInsight(
    userId,
    contactId,
    'standard'
  );
  
  // 显示完整的洞察分析
  displayInsightPanel(insight.data);
}

// 3. 重要联系人深度分析（deep）
async function analyzeImportantContact(contactId: string) {
  const insight = await generateContactInsight(
    userId,
    contactId,
    'deep'
  );
  
  // 显示全面的深度分析报告
  displayDeepAnalysisReport(insight.data);
}
```

### 触发时机

- **自动触发**：
  - 打开联系人详情页时（使用 `standard` 深度）
  - 联系人列表加载时（使用 `brief` 深度，异步加载）
- **手动触发**：
  - 用户点击"生成洞察"按钮
  - 用户选择"深度分析"选项
- **条件触发**：
  - 重要联系人自动使用 `deep` 深度
  - 新联系人首次查看时生成洞察

---

## 边界情况处理

### 新联系人或无数据

- 如果联系人没有交互历史，Agent 会基于基本信息生成基础洞察
- 如果没有归档数据，相关字段会返回空数组
- `profileSummary` 会基于可用信息生成

### 混合语言

- 中英混合 → 以中文为主输出
- 纯英文 → 输出英文
- 技术术语 → 保留英文原文

### 缓存机制

- 相同输入（`userId`、`contactId`、`depth`）会返回缓存结果（`cached: true`）
- 前端可通过 `snapshotId` 判断是否为新结果
- 如需强制重新生成，设置 `forceRefresh: true`
- 缓存基于源数据哈希，数据变化时自动失效

---

## 完整流程示例

```typescript
// 1. 用户打开联系人详情页
const contactId = "contact_123";

// 2. 自动生成标准洞察（异步）
generateContactInsight(userId, contactId, 'standard')
  .then(result => {
    // 3. 显示洞察面板
    displayInsightPanel({
      summary: result.data.profileSummary,
      signals: result.data.relationshipSignals,
      opportunities: result.data.opportunities,
      risks: result.data.risks,
      actions: result.data.suggestedActions,
      openingLines: result.data.openingLines
    });
    
    // 4. 显示引用来源
    displayCitations(result.data.citations);
  });

// 5. 用户点击"深度分析"按钮
onDeepAnalysisClick(() => {
  generateContactInsight(userId, contactId, 'deep')
    .then(result => {
      // 显示完整的深度分析报告
      showDeepAnalysisModal(result.data);
    });
});
```

---

## 注意事项

1. **分析深度选择**：根据使用场景选择合适的深度，避免不必要的计算
2. **缓存利用**：设置 `useCache: true` 提高性能，相同输入会复用缓存结果
3. **异步执行**：洞察生成是异步的，不阻塞主流程
4. **证据基础**：所有洞察都有引用，确保可追溯性
5. **语言检测**：Agent 会自动检测输入语言并输出对应语言的洞察
6. **数据更新**：当联系人的交互历史或归档数据更新时，建议重新生成洞察以获得最新分析

---

## Agent 解析逻辑

### 处理流程图

```
用户请求 (agentId: "contact_insight")
    ↓
ContactInsightService.generate()
    ↓
1. 计算 sourceHash
   基于: userId + contactId + depth
   用途: 缓存键，相同输入返回缓存结果
    ↓
2. 检查缓存 (SnapshotService)
   TTL: 6 小时
   命中 → 直接返回缓存结果
   未命中 → 继续
    ↓
3. ContactInsightContextBuilder.buildContext()
   聚合数据源:
   ├─ Contact: 基本信息 (name, email, company, note, tags)
   ├─ Recent Interactions: 最近对话记录
   ├─ Archived Events: 联系人事件
   ├─ Archived Facts: 联系人事实
   └─ Archived Todos: 联系人待办
    ↓
4. AgentRuntimeExecutor.execute()
   ├─ 加载 agent.json 定义
   ├─ 渲染 system.mustache (系统提示词)
   ├─ 渲染 user.mustache (用户数据 + Mustache 模板)
   ├─ 调用 LLM (OpenAI GPT-4.1-mini)
   └─ OutputValidator 验证输出 JSON Schema
    ↓
5. 保存快照到数据库 (agent_snapshots 表)
    ↓
6. 返回结构化洞察数据
```

### 关键组件说明

| 组件 | 文件位置 | 作用 |
|------|----------|------|
| **ContactInsightService** | `capabilities/contact_insight/` | 服务入口，协调缓存和执行 |
| **ContactInsightContextBuilder** | `capabilities/contact_insight/` | 从数据库聚合联系人相关数据 |
| **AgentRuntimeExecutor** | `runtime/agent-runtime-executor.service.ts` | 通用执行器，加载定义、渲染模板、调用 AI |
| **SnapshotService** | `snapshots/snapshot.service.ts` | 快照缓存管理 (TTL: 6小时) |
| **OutputValidator** | `runtime/output-validator.service.ts` | 验证 LLM 输出符合 JSON Schema |

### 数据聚合规则

ContactInsightContextBuilder 按以下规则聚合数据：

```typescript
{
  // 1. 联系人基本信息
  contact: {
    id, name, email, company, position, tags, note, lastInteractionAt
  },

  // 2. 最近对话 (按 createdAt 倒序，取最近 N 条)
  recentInteractions: [
    {
      createdAt,
      summary,           // AI 生成的对话摘要
      messages[]         // 对话消息列表
    }
  ],

  // 3. 归档数据
  archivedData: {
    events: [],   // { title, eventDate, description }
    facts: [],    // { content }
    todos: []     // { content, status }
  },

  // 4. 分析深度
  depth: 'brief' | 'standard' | 'deep'
}
```

### 模板渲染规则

**system.mustache** - 系统提示词包含：
- 分析师角色定义
- 输出 JSON Schema 定义
- 分析深度调节指南
- 输出语言规则（默认中文）
- 质量标准

**user.mustache** - 用户数据模板使用 Mustache 语法：
- `{{contact.name}}` - 联系人姓名
- `{{#contact.email}}...{{/contact.email}}` - 条件渲染邮箱
- `{{#recentInteractions}}...{{/recentInteractions}}` - 循环渲染对话列表
- `{{^recentInteractions}}...{{/recentInteractions}}` - 空数据提示

### 输出 Schema 验证

响应必须符合 `schemas/output.schema.json`，包含 8 个必填字段：

| 字段 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `profileSummary` | string | 联系人档案摘要 | "张三是一位技术顾问..." |
| `relationshipSignals` | array | 关系信号列表 | [{ type, description, strength }] |
| `opportunities` | array | 机会列表 | [{ title, description, priority }] |
| `risks` | array | 风险列表 | [{ title, description, severity }] |
| `suggestedActions` | array | 建议行动列表 | [{ action, reason, urgency }] |
| `openingLines` | array | 开场白建议 | ["您好，最近..."] |
| `citations` | array | 数据引用 | [{ source, type, reference }] |
| `sourceHash` | string | 源数据哈希 | "e1f90269..." |

### 缓存策略

```typescript
// sourceHash 计算逻辑
const sourceHash = crypto
  .createHash('sha256')
  .update(JSON.stringify({ userId, contactId, depth }))
  .digest('hex');

// 缓存查询条件
{
  agentId: 'contact_insight',
  operation: null,
  userId,
  scopeType: 'contact',  // 按联系人作用域
  scopeId: contactId,
  sourceHash,             // 相同 sourceHash = 相同数据
  promptVersion: '1.0.0'  // 模板版本变化时缓存失效
}

// TTL: 21600 秒 (6 小时)
```

### 分析深度调节

| depth | 调整方式 | 输出规模 |
|-------|----------|----------|
| `brief` | 聚焦关键亮点，3-5 个洞察 | ~500 字符 |
| `standard` | 平衡分析，5-10 个洞察 | ~1000 字符 |
| `deep` | 全面探索，详细分析 | ~2000 字符 |

### 语言检测规则

```
IF 联系人数据包含中文字符
THEN 输出中文（默认）
ELSE IF 联系人数据纯英文
THEN 输出英文
ELSE
    中英混合 → 中文为主，保留英文专有名词
END
```



