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
}

/**
 * Network Action Agent 错误码
 */
export enum NetworkActionErrorCode {
  NO_CONTACTS = 'NETWORK_ACTION_NO_CONTACTS',
  OUTPUT_VALIDATION_FAILED = 'NETWORK_ACTION_OUTPUT_VALIDATION_FAILED',
  CONTEXT_BUILD_FAILED = 'NETWORK_ACTION_CONTEXT_BUILD_FAILED',
}



