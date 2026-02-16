export interface DailyActionDigestItemView {
  id: string;
  rank: number;
  actionType: string;
  sourceAgentId: string;
  sourceRef: string | null;
  title: string;
  description: string;
  priorityScore: number;
  confidence: number | null;
  payload: Record<string, unknown> | null;
}

export interface DailyActionDigestView {
  date: string;
  generatedAt: string;
  items: DailyActionDigestItemView[];
}
