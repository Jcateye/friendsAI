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




