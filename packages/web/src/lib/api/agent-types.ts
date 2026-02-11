/**
 * Agent 相关类型定义
 * 对应后端 /v1/agent/run 的结构化输出
 */

/**
 * Agent 运行请求类型
 * 对应后端 AgentRunRequest
 */
export interface AgentRunRequest {
  agentId: string;
  operation?: string | null;
  input: Record<string, unknown>;
  /** 用户意图 - optional: maintain|grow|repair */
  intent?: 'maintain' | 'grow' | 'repair';
  /** 关系类型偏好 - optional: business|friend|mixed */
  relationshipMix?: 'business' | 'friend' | 'mixed';
  /** 时间预算（分钟） - optional */
  timeBudgetMinutes?: number;
  options?: {
    useCache?: boolean;
    forceRefresh?: boolean;
  };
  userId?: string;
  sessionId?: string;
  conversationId?: string;
}

/**
 * contact_insight Agent 输出数据结构
 * 参考后端定义：packages/server-nestjs/src/agent/definitions/contact_insight/API_USAGE.md
 */
export interface ContactInsightData {
  profileSummary: string;
  relationshipSignals: Array<{
    type: string;
    description: string;
    strength: string;
  }>;
  opportunities: Array<{
    title: string;
    description: string;
    priority: string;
  }>;
  risks: Array<{
    title: string;
    description: string;
    severity: string;
  }>;
  suggestedActions: Array<{
    action: string;
    reason: string;
    urgency: string;
  }>;
  openingLines: string[];
  citations: Array<{
    source: string;
    type: string;
    reference: string;
  }>;
  sourceHash: string;
  generatedAt: number;
  // New fields for action cards enhancement
  relationshipState?: 'warming' | 'stable' | 'cooling' | 'at_risk';
  relationshipType?: 'business' | 'friend' | 'mixed';
  momentSignals?: Array<MomentSignal>;
  actionCards?: ActionCard[];
}

/**
 * Moment signal for relationship momentum
 */
export interface MomentSignal {
  type: 'event_window' | 'recency_gap' | 'reciprocity_gap';
  score: number;
  whyNow: string;
  expiresAtMs: number;
}

/**
 * Action card for executable relationship actions
 */
export interface ActionCard {
  actionId: string;
  goal: 'maintain' | 'grow' | 'repair';
  actionType: 'message' | 'invite' | 'intro' | 'note';
  whyNow: string;
  evidence?: EvidencePoint[];
  draftMessage: string;
  effortMinutes: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
  contactId?: string;
  contactName?: string;
}

/**
 * Evidence point for action justification
 */
export interface EvidencePoint {
  type: 'event' | 'fact' | 'conversation' | 'recency';
  source: string;
  reference: string;
}

/**
 * archive_brief Agent 输出数据结构
 * 参考后端定义：packages/server-nestjs/src/agent/definitions/archive_brief/API_USAGE.md
 */
export type ArchiveBriefData = ArchiveExtractData | BriefGenerateData;

/**
 * archive_extract 操作输出
 */
export interface ArchiveExtractData {
  operation: 'archive_extract';
  id: string;
  status: string;
  summary: string;
  payload: {
    keyPoints?: string[];
    decisions?: string[];
    actionItems?: string[];
    participants?: string[];
    // 扩展字段：联系人提取
    contacts?: Array<{
      name: string;
      company?: string;
      position?: string;
      email?: string;
      role?: string; // 在对话中的角色
    }>;
    // 扩展字段：事实/信息点
    facts?: Array<{
      content: string;
      category?: string; // 如：项目、技术、商务等
    }>;
    // 扩展字段：标签/主题
    tags?: string[];
    // 扩展字段：时间相关
    dates?: Array<{
      description: string;
      date?: string;
      type?: 'deadline' | 'meeting' | 'milestone' | 'other';
    }>;
    [key: string]: unknown;
  };
}

/**
 * brief_generate 操作输出
 */
export interface BriefGenerateData {
  operation: 'brief_generate';
  id: string;
  contact_id: string;
  content: string;
  generated_at: string;
  source_hash: string;
}

/**
 * network_action Agent 输出数据结构
 * 参考后端定义：packages/server-nestjs/src/agent/definitions/network_action/API_USAGE.md
 */
export interface NetworkActionData {
  followUps: Array<{
    contactId: string;
    contactName: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    suggestedAction: string;
  }>;
  recommendations: Array<{
    type: 'connection' | 'followup' | 'introduction';
    description: string;
    contacts: string[];
    confidence: number;
  }>;
  synthesis: string;
  nextActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    estimatedTime?: string;
  }>;
  metadata?: {
    cached: boolean;
    sourceHash: string;
    generatedAt: number;
  };
  // New fields for action cards enhancement
  queues?: ActionQueues;
  weeklyPlan?: WeeklyPlanDay[];
}

/**
 * Action queues for categorizing relationship actions
 */
export interface ActionQueues {
  urgentRepairs: ActionCard[];
  opportunityBridges: ActionCard[];
  lightTouches: ActionCard[];
}

/**
 * Weekly plan day for scheduling actions
 */
export interface WeeklyPlanDay {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  maxMinutes: number;
  actions: ActionCard[];
}

/**
 * 通用 Agent 运行响应结构
 */
export interface AgentRunResponse<TData> {
  runId: string;
  agentId: string;
  operation: string | null;
  cached: boolean;
  snapshotId?: string;
  generatedAt?: string;
  generatedAtMs?: number;
  data: TData;
}

/**
 * Agent feedback request
 */
export interface AgentFeedbackRequest {
  runId: string;
  agentId: 'contact_insight' | 'network_action';
  actionId: string;
  status: 'accepted' | 'edited' | 'dismissed' | 'executed';
  reasonCode?: 'not_relevant' | 'too_generic' | 'tone_off' | 'timing_bad' | 'other';
  editDistance?: number;
  executedAtMs?: number;
  editedMessage?: string;
}

/**
 * Agent feedback response
 */
export interface AgentFeedbackResponse {
  success: boolean;
  feedbackId?: string;
}


