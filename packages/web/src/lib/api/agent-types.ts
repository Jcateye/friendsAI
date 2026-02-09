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


