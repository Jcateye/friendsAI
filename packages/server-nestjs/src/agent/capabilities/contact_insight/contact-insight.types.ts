/**
 * Contact Insight 相关类型定义
 */

export type InsightDepth = 'brief' | 'standard' | 'deep';

export interface ContactInsightInput {
  userId: string;
  contactId: string;
  depth?: InsightDepth;
  forceRefresh?: boolean;
  /** 用户意图 - optional: maintain|grow|repair */
  intent?: 'maintain' | 'grow' | 'repair';
  /** 关系类型偏好 - optional: business|friend|mixed */
  relationshipMix?: 'business' | 'friend' | 'mixed';
  /** 时间预算（分钟） - optional */
  timeBudgetMinutes?: number;
}

export interface ContactInsightOutput {
  profileSummary: string;
  relationshipSignals: RelationshipSignal[];
  opportunities: Opportunity[];
  risks: Risk[];
  suggestedActions: SuggestedAction[];
  openingLines: OpeningLine[];
  citations: Citation[];
  /** Enhanced action cards (optional for backward compatibility) */
  actionCards?: ActionCard[];
  /** Relationship state (optional for backward compatibility) */
  relationshipState?: 'warming' | 'stable' | 'cooling' | 'at_risk';
  /** Relationship type (optional for backward compatibility) */
  relationshipType?: 'business' | 'friend' | 'mixed';
  /** Time-sensitive signals (optional for backward compatibility) */
  momentSignals?: MomentSignal[];
  /** Source hash for caching */
  sourceHash: string;
  /** Generated timestamp (epoch milliseconds) */
  generatedAt: number;
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
  contact: {
    id: string;
    name: string;
    email?: string | null;
    company?: string | null;
    position?: string | null;
    tags?: string[] | null;
    note?: string | null;
    lastInteractionAt?: Date | null;
  };
  recentInteractions: Array<{
    id: string;
    summary?: string | null;
    createdAt: Date;
  }>;
  archivedData: {
    events: Array<{
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
}

/**
 * Action Card - Enhanced actionable item with rich metadata
 */
export interface ActionCard {
  /** Unique identifier for this action card */
  actionId: string;
  /** Goal/objective of this action */
  goal: string;
  /** Type of action */
  actionType: 'message' | 'call' | 'meeting' | 'email' | 'social' | 'gift' | 'introduction' | 'other';
  /** Draft message content (if applicable) */
  draftMessage?: string;
  /** Estimated effort in minutes */
  effortMinutes: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Risk level of taking this action */
  riskLevel: 'low' | 'medium' | 'high';
  /** Whether action requires user confirmation before executing */
  requiresConfirmation: boolean;
  /** When this action is most relevant (optional) */
  timingHint?: string;
  /** Contextual notes for the user */
  notes?: string;
}

/**
 * Moment Signal - Time-sensitive opportunities
 */
export interface MomentSignal {
  /** Type of moment signal */
  type: 'birthday' | 'anniversary' | 'milestone' | 'life_event' | 'seasonal' | 'opportunity' | 'risk';
  /** Relevance score (0-1) */
  score: number;
  /** Why this moment matters now */
  whyNow: string;
  /** When this signal expires (epoch milliseconds) */
  expiresAtMs: number;
  /** Suggested action (optional) */
  suggestedAction?: string;
}

