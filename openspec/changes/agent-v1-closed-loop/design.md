# Design: Agent V1 可执行闭环

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Taro)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Suggestion   │  │  Confirm     │  │  Weekly      │          │
│  │   Panel      │  │   Dialog     │  │  Report      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (NestJS)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ /v1/agents   │  │ /v1/actions  │  │ /v1/metrics  │          │
│  │   /run       │  │  /confirm    │  │  /weekly     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Runtime Layer                         │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ contact_insight  │  │  network_action  │                     │
│  │   (enhanced)     │  │   (enhanced)     │                     │
│  └────────┬─────────┘  └────────┬─────────┘                     │
└───────────┼─────────────────────┼───────────────────────────────┘
            │                     │
            ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer (PostgreSQL)                     │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  friendsai_v2    │  │ friendsai_v3_gpt │  ← NEW              │
│  │  (READ-ONLY)     │  │  (WRITE)         │                     │
│  └──────────────────┘  └──────────────────┘                     │
│    contacts/events       relationship_health_snapshot            │
│    facts/todos           relationship_debt_item                  │
│                          action_outcome_log                      │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Contracts

### 2.1 Enhanced ContactInsightOutput

```typescript
interface ContactInsightOutput {
  // === 现有字段（保持兼容）===
  profileSummary: string;
  relationshipSignals: RelationshipSignal[];
  opportunities: Opportunity[];
  risks: Risk[];
  suggestedActions: SuggestedAction[];
  openingLines: OpeningLine[];
  citations: Citation[];

  // === 新增字段 ===
  priority_score: number;           // 0-100，用于排序
  reason_tags: string[];            // 原因标签，如 ['long_time_no_contact', 'upcoming_event']
  relationship_risk_level: 'low' | 'medium' | 'high';
}
```

### 2.2 Enhanced NetworkActionOutput

```typescript
interface NetworkActionOutput {
  // === followUps 增强 ===
  followUps: Array<{
    contactId: string;
    contactName: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    suggestedAction: string;
    // === 新增字段 ===
    timing_reason: string;          // "为何是现在"
    value_first_suggestion: string; // "可先提供的价值"
    followup_plan: string;          // "后续计划"
  }>;

  // === recommendations 增强 ===
  recommendations: Array<{
    type: 'connection' | 'followup' | 'introduction';
    description: string;
    contacts: string[];
    confidence: number;
    // === 新增字段 ===
    reason: string;                 // 推荐原因
  }>;

  // 其他字段保持兼容
  synthesis: string;
  nextActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    estimatedTime?: string;
  }>;
  metadata: {
    cached: boolean;
    sourceHash: string;
    generatedAt: number;
  };
}
```

### 2.3 行为事件结构

```typescript
interface AgentSuggestionShownEvent {
  id: string;               // UUID
  user_id: string;
  agent_id: string;         // 'contact_insight' | 'network_action'
  suggestion_id: string;    // 建议唯一标识
  suggestion_type: string;  // 'followup' | 'connection' | 'introduction'
  content: jsonb;           // 建议内容快照
  created_at: timestamp;
}

interface AgentSuggestionAcceptedEvent {
  id: string;
  user_id: string;
  suggestion_id: string;    // 关联到 shown 事件
  accepted_at: timestamp;
}

interface AgentMessageSentEvent {
  id: string;
  user_id: string;
  suggestion_id: string;
  message_id: string;
  recipient_id: string;
  recipient_type: 'contact' | 'group';
  channel: 'feishu' | 'wechat' | 'manual';
  content_preview: string;  // 消息预览（前100字符）
  sent_at: timestamp;
}

interface AgentMessageRepliedEvent {
  id: string;
  message_sent_id: string;  // 关联到 sent 事件
  replied_at: timestamp;
  reply_preview?: string;
}

interface AgentFollowupCompletedEvent {
  id: string;
  user_id: string;
  suggestion_id: string;
  completed_at: timestamp;
  completion_type: 'manual' | 'auto';
}
```

## 3. Data Model

### 3.1 新数据库 `friendsai_v3_gpt`

**重要**：此数据库完全独立，不影响 `friendsai_v2`。

```sql
-- 关系健康快照
CREATE TABLE relationship_health_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  contact_id VARCHAR(255) NOT NULL,
  snapshot_date DATE NOT NULL,
  health_score DECIMAL(5,2),      -- 0-100
  risk_level VARCHAR(20),         -- 'low'/'medium'/'high'
  last_interaction_at TIMESTAMP,
  interaction_frequency INT,      -- 过去30天互动次数
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contact_id, snapshot_date)
);

-- 关系债务项
CREATE TABLE relationship_debt_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  contact_id VARCHAR(255) NOT NULL,
  debt_type VARCHAR(50),          -- 'long_no_contact', 'unfulfilled_promise', 'unreciprocated'
  severity VARCHAR(20),           -- 'low'/'medium'/'high'
  description TEXT,
  suggested_action TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- 行动结果日志
CREATE TABLE action_outcome_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(100) NOT NULL,
  suggestion_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'shown'/'accepted'/'sent'/'replied'/'followup_completed'
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 每周简报缓存
CREATE TABLE weekly_report_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  week_start DATE NOT NULL,
  action_completion_rate DECIMAL(5,2),
  reply_rate DECIMAL(5,2),
  followup_rate DECIMAL(5,2),
  total_suggestions INT,
  total_accepted INT,
  total_sent INT,
  total_replied INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX idx_action_outcome_user_event ON action_outcome_log(user_id, event_type, created_at);
CREATE INDEX idx_health_snapshot_user ON relationship_health_snapshot(user_id, snapshot_date DESC);
CREATE INDEX idx_debt_user_resolved ON relationship_debt_item(user_id, is_resolved);
```

## 4. Edge Cases

### 4.1 缓存一致性问题
**场景**：用户数据更新后，旧的 Agent 建议缓存仍存在
**处理**：
- `forceRefresh=true` 时强制重新计算
- 缓存 TTL 保持 6h/12h 不变

### 4.2 事件写入失败
**场景**：事件追踪写入失败不应影响主流程
**处理**：
- 事件写入采用 fire-and-forget 模式
- 失败时记录日志，不抛出异常

### 4.3 飞书 API 限流
**场景**：飞书 API 返回 429
**处理**：
- 实现指数退避重试
- 超过阈值后降级为"待手动发送"状态

## 5. Security

1. **数据隔离**：所有查询必须带 `user_id` 过滤
2. **敏感信息**：消息内容预览不超过 100 字符
3. **审计日志**：所有外部 API 调用记录

## 6. Rollout / Rollback

### 6.1 部署步骤
1. 创建 `friendsai_v3_gpt` 数据库
2. 运行新表迁移
3. 部署新代码（向后兼容）
4. 通过环境变量 `V1_AGENTS_ENABLED=true` 启用

### 6.2 回滚步骤
1. 设置 `V1_AGENTS_ENABLED=false`
2. 旧 schema 仍然有效
3. 可删除 `friendsai_v3_gpt` 数据库（可选）

## 7. External Dependencies

| 依赖 | 版本 | 用途 |
|------|------|------|
| PostgreSQL | 14+ | `friendsai_v3_gpt` 新数据库 |
| 飞书开放 API | v1 | 消息发送 |
| Vercel AI SDK | latest | 流式输出 |
