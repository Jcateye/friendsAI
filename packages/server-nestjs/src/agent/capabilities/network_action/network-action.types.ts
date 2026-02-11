/**
 * Network Action Agent 输入类型
 */
export interface NetworkActionInput {
  /** 用户 ID */
  userId: string;
  /** 可选：限制返回数量 */
  limit?: number;
  /** 可选：强制刷新缓存 */
  forceRefresh?: boolean;
  /** 用户意图 - optional: maintain|grow|repair */
  intent?: 'maintain' | 'grow' | 'repair';
  /** 关系类型偏好 - optional: business|friend|mixed */
  relationshipMix?: 'business' | 'friend' | 'mixed';
  /** 时间预算（分钟） - optional */
  timeBudgetMinutes?: number;
}

/**
 * Network Action Agent 输出类型
 */
export interface NetworkActionOutput {
  /** 需要跟进的联系人列表 */
  followUps: Array<{
    contactId: string;
    contactName: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    suggestedAction: string;
  }>;
  /** 关系网络建议 */
  recommendations: Array<{
    type: 'connection' | 'followup' | 'introduction';
    description: string;
    contacts: string[]; // 相关联系人 ID
    confidence: number; // 0-1
  }>;
  /** 可读的汇总解释 */
  synthesis: string;
  /** 可执行的下一步行动 */
  nextActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    estimatedTime?: string;
  }>;
  /** 元数据 */
  metadata: {
    cached: boolean;
    sourceHash: string;
    generatedAt: number; // epoch milliseconds
  };
  /** Enhanced queues (optional for backward compatibility) */
  queues?: ActionQueues;
  /** Weekly plan (optional for backward compatibility) */
  weeklyPlan?: WeeklyAction[];
}

/**
 * 模板上下文类型
 */
export interface NetworkActionTemplateContext {
  contacts: Array<{
    id: string;
    name: string;
    company?: string;
    position?: string;
    lastInteractionAt: string;
  }>;
  recentInteractions: Array<{
    date: string;
    summary: string;
  }>;
  metadata: {
    totalContacts: number;
    totalInteractions: number;
  };
  /** 用户意图 - optional: maintain|grow|repair */
  intent?: 'maintain' | 'grow' | 'repair';
  /** 关系类型偏好 - optional: business|friend|mixed */
  relationshipMix?: 'business' | 'friend' | 'mixed';
  /** 时间预算（分钟） - optional */
  timeBudgetMinutes?: number;
}

/**
 * Network Action Agent 错误码
 */
export enum NetworkActionErrorCode {
  NO_CONTACTS = 'NETWORK_ACTION_NO_CONTACTS',
  OUTPUT_VALIDATION_FAILED = 'NETWORK_ACTION_OUTPUT_VALIDATION_FAILED',
  CONTEXT_BUILD_FAILED = 'NETWORK_ACTION_CONTEXT_BUILD_FAILED',
}

/**
 * Action Queues - Organized list of actions by category
 */
export interface ActionQueues {
  /** Urgent repairs - relationships at risk */
  urgentRepairs: QueuedAction[];
  /** Opportunity bridges - potential introductions or collaborations */
  opportunityBridges: QueuedAction[];
  /** Light touches - low-effort relationship maintenance */
  lightTouches: QueuedAction[];
}

/**
 * Queued Action - Action in a queue
 */
export interface QueuedAction {
  /** Unique identifier */
  id: string;
  /** Contact ID this action is for */
  contactId: string;
  /** Contact name */
  contactName: string;
  /** Action description */
  action: string;
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Estimated effort in minutes */
  effortMinutes: number;
  /** Why this action matters */
  rationale: string;
}

/**
 * Weekly Action - Planned action for a specific day
 */
export interface WeeklyAction {
  /** Day of the week (0=Sunday, 6=Saturday) */
  day: number;
  /** Day name (e.g., "Monday") */
  dayName: string;
  /** Maximum time budget in minutes */
  maxMinutes: number;
  /** Planned actions for this day */
  actions: Array<{
    /** Unique identifier */
    id: string;
    /** Contact ID */
    contactId: string;
    /** Contact name */
    contactName: string;
    /** Action description */
    action: string;
    /** Estimated effort in minutes */
    effortMinutes: number;
    /** Priority level */
    priority: 'high' | 'medium' | 'low';
  }>;
}

