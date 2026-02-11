# Design: Agent Action Cards Enhancement

## 1. Goals

- 从"信息型洞察"升级为"可执行行动卡"
- 每条建议包含 `why now` + 证据 + 草稿 + 一键确认
- 支持三队列分桶：紧急修复、机会桥接、轻触达
- 形成行为反馈学习闭环

## 2. Boundaries

### 2.1 独占路径
- `packages/server-nestjs/src/agent/capabilities/contact_insight/**` (扩展)
- `packages/server-nestjs/src/agent/capabilities/network_action/**` (扩展)
- `packages/server-nestjs/src/agent/feedback/**` (新增)
- `packages/client/src/components/ActionCard/**` (新增)
- `packages/client/src/components/ActionQueue/**` (新增)

## 3. Interface

### 3.1 contact_insight 扩展输出

```typescript
interface ContactInsightOutput {
  // 现有字段...
  profileSummary: string;
  relationshipSignals: RelationshipSignal[];
  opportunities: Opportunity[];
  risks: Risk[];
  suggestedActions: SuggestedAction[];
  openingLines: OpeningLine[];
  citations: Citation[];

  // 新增字段
  relationshipState?: 'warming' | 'stable' | 'cooling' | 'at_risk';
  relationshipType?: 'business' | 'friend' | 'mixed';
  momentSignals?: MomentSignal[];
  actionCards?: ActionCard[];
}

interface MomentSignal {
  type: 'event_window' | 'recency_gap' | 'reciprocity_gap';
  score: number; // 0-100
  whyNow: string;
  expiresAtMs: number;
}

interface ActionCard {
  actionId: string;
  goal: 'maintain' | 'grow' | 'repair';
  actionType: 'message' | 'invite' | 'intro' | 'note';
  draftMessage: string;
  effortMinutes: number;
  confidence: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: true;
}
```

### 3.2 network_action 扩展输出

```typescript
interface NetworkActionOutput {
  // 现有字段...
  followUps: Array<{...}>;
  recommendations: Array<{...}>;
  synthesis: string;
  nextActions: Array<{...}>;
  metadata: {...};

  // 新增字段
  queues?: {
    urgentRepairs: ActionItem[];
    opportunityBridges: ActionItem[];
    lightTouches: ActionItem[];
  };
  weeklyPlan?: WeeklyPlanItem[];
}

interface WeeklyPlanItem {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  maxMinutes: number;
  actions: ActionItem[];
}
```

### 3.3 反馈接口

```typescript
POST /v1/agent/feedback

interface AgentFeedbackRequest {
  runId: string;
  agentId: 'contact_insight' | 'network_action';
  actionId: string;
  status: 'accepted' | 'edited' | 'dismissed' | 'executed';
  reasonCode?: 'not_relevant' | 'too_generic' | 'tone_off' | 'timing_bad' | 'other';
  editDistance?: number; // 0-1
  executedAtMs?: number;
}
```

## 4. Data Flow

```
用户请求 -> /v1/agent/run
  -> AgentRuntimeExecutor
  -> ContextBuilder (新增 intent/relationshipMix/timeBudgetMinutes)
  -> AgentCapability
  -> ActionCardGenerator (新增，计算 whyNow/effort/risk)
  -> PriorityScorer (新增，计算 0-100 分数)
  -> QueueCategorizer (新增，分到三队列)
  -> OutputValidator
  -> Snapshot
  -> 响应用户

用户操作 -> 前端组件
  -> POST /v1/agent/feedback
  -> AgentFeedbackService
  -> Database/Analytics
```

## 5. Scoring Algorithm

初始优先级公式（0-100）：

```
priority = 0.35*recencyGap
        + 0.25*reciprocityGap
        + 0.20*importance
        + 0.10*momentWindow
        + 0.10*replyLikelihood
```

分桶策略：
- `>=75`: `urgentRepairs` (紧急修复)
- `45~74`: `opportunityBridges` (机会桥接)
- `<45`: `lightTouches` (轻触达)

## 6. Failure Modes

1. contact 不存在或无权限
2. 输出缺关键字段
3. actionCards 格式不合法
4. 评分函数计算异常
5. 反馈写入失败

## 7. Test Plan

- contact_insight 扩展输出测试
- network_action 扩展输出测试
- 评分函数边界值测试
- 分桶逻辑测试
- 反馈接口测试
- 前端组件单元测试
- 闭环 E2E 测试

## 8. Compatibility

- 所有新字段为可选，向后兼容
- 旧调用方忽略新字段不会崩溃
- 新调用方可按需使用新字段
