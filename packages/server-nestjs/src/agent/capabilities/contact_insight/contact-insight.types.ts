/**
 * Contact Insight 相关类型定义
 */

export type InsightDepth = 'brief' | 'standard' | 'deep';

export interface ContactInsightInput {
  userId: string;
  contactId: string;
  depth?: InsightDepth;
  forceRefresh?: boolean;
}

export interface ContactInsightOutput {
  profileSummary: string;
  relationshipSignals: RelationshipSignal[];
  opportunities: Opportunity[];
  risks: Risk[];
  suggestedActions: SuggestedAction[];
  openingLines: OpeningLine[];
  citations: Citation[];
  confidence: number;
  sourceRefs: Array<{
    type: string;
    reference: string;
  }>;
  evidenceChains: Array<{
    summary: string;
    sourceType: string;
    sourceRef: string;
  }>;
  // V1 闭环功能字段
  priority_score: number;           // 0-100，用于排序
  reason_tags: string[];            // 原因标签，如 ['long_time_no_contact', 'upcoming_event']
  relationship_risk_level: 'low' | 'medium' | 'high';
}

export interface RelationshipSignal {
  type: string;
  description: string;
  confidence?: number;
}

export interface Opportunity {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  citations?: string[];
}

export interface Risk {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  citations?: string[];
}

export interface SuggestedAction {
  action: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  citations?: string[];
}

export interface OpeningLine {
  line: string;
  context: string;
  citations?: string[];
}

export interface Citation {
  type: 'message' | 'conversation' | 'event' | 'fact';
  reference: string;
  span?: string;
}

export interface ContactInsightContext {
  contactId: string;
  contact: {
    id: string;
    name: string;
    email?: string | null;
    company?: string | null;
    position?: string | null;
    tags?: string[] | null;
    note?: string | null;
    lastInteractionAt?: Date | null;
    // V1 闭环优先级计算所需上下文
    daysSinceLastInteraction?: number;  // 距上次互动天数
    interactionFrequency?: number;      // 互动频率（次/月）
  };
  recentInteractions: Array<{
    index: number;
    id: string;
    summary?: string | null;
    createdAt: Date;
  }>;
  archivedData: {
    events: Array<{
      index: number;
      id: string;
      type: string;
      title: string;
      description?: string | null;
      eventDate?: Date | null;
    }>;
    facts: Array<{
      id: string;
      content: string;
    }>;
    todos: Array<{
      id: string;
      content: string;
      status: string;
    }>;
  };
  depth: InsightDepth;
  // V1 闭环优先级计算所需上下文
  userPreferences?: {
    importanceWeights?: {
      recency?: number;          // 联络及时性权重
      frequency?: number;        // 互动频率权重
      events?: number;           // 事件相关性权重
    };
    riskThresholds?: {
      lowRiskDays?: number;      // 低风险阈值（天）
      mediumRiskDays?: number;   // 中风险阈值（天）
    };
  };
  upcomingEvents?: Array<{
    id: string;
    title: string;
    eventDate: Date;
    daysUntilEvent: number;
  }>;
}


