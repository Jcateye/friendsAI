export interface RelationshipFactor {
  key: string;
  weight: number;
  value: number;
  reason: string;
}

export interface RelationshipHealthView {
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: RelationshipFactor[];
}

export interface RelationshipHealthSummaryResponse {
  averageScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalContacts: number;
  generatedAt: string;
}

export interface RelationshipRiskQueueItem {
  contactId: string;
  contactName: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  suggestedAction: string;
  factors: RelationshipFactor[];
}

export interface RelationshipRiskQueueResponse {
  generatedAt: string;
  items: RelationshipRiskQueueItem[];
}

export interface RelationshipThresholdOptions {
  highRiskThreshold?: number;
  mediumRiskThreshold?: number;
  ruleWeight?: number;
  llmWeight?: number;
}
