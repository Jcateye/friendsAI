/**
 * Agent 相关类型定义
 * 对应后端 /v1/agent/run 的结构化输出
 */

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


