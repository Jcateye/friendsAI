/**
 * 事件追踪服务类型定义
 * 用于追踪 Agent 建议的用户行为链路
 */

/**
 * Agent 事件类型
 * - shown: 建议已展示给用户
 * - accepted: 用户采纳了建议
 * - sent: 用户发送了消息
 * - replied: 收到消息回复
 * - followup_completed: 完成后续跟进
 */
export type AgentEventType = 'shown' | 'accepted' | 'sent' | 'replied' | 'followup_completed';

/**
 * 建议展示事件输入
 * 当 Agent 建议展示给用户时记录
 */
export interface SuggestionShownInput {
  /** 用户 ID */
  userId: string;
  /** Agent ID */
  agentId: string;
  /** 建议 ID */
  suggestionId: string;
  /** 建议类型 */
  suggestionType: string;
  /** 建议内容 */
  content: Record<string, unknown>;
}

/**
 * 建议采纳事件输入
 * 当用户点击采纳建议时记录
 */
export interface SuggestionAcceptedInput {
  /** 用户 ID */
  userId: string;
  /** 建议 ID */
  suggestionId: string;
}

/**
 * 消息发送事件输入
 * 当用户发送消息时记录
 */
export interface MessageSentInput {
  /** 用户 ID */
  userId: string;
  /** 建议 ID */
  suggestionId: string;
  /** 消息 ID */
  messageId: string;
  /** 接收者 ID */
  recipientId: string;
  /** 接收者类型 */
  recipientType: 'contact' | 'group';
  /** 发送渠道 */
  channel: 'feishu' | 'wechat' | 'manual';
  /** 消息内容预览 */
  contentPreview: string;
}

/**
 * 消息回复事件输入
 * 当收到消息回复时记录
 */
export interface MessageRepliedInput {
  /** 消息发送事件 ID */
  messageSentId: string;
  /** 回复内容预览（可选） */
  replyPreview?: string;
}

/**
 * 后续跟进完成事件输入
 * 当用户完成后续跟进行动时记录
 */
export interface FollowupCompletedInput {
  /** 用户 ID */
  userId: string;
  /** 建议 ID */
  suggestionId: string;
  /** 完成类型 */
  completionType: 'manual' | 'auto';
}

/**
 * 每周指标输出
 * 用于计算用户行为的转化率
 */
export interface WeeklyMetrics {
  /** 采纳率 = 采纳数 / 展示数 */
  actionCompletionRate: number;
  /** 回复率 = 回复数 / 发送数 */
  replyRate: number;
  /** 推进率 = 完成跟进数 / 采纳数 */
  followupRate: number;
  /** 总建议展示数 */
  totalSuggestions: number;
  /** 总采纳数 */
  totalAccepted: number;
  /** 总发送数 */
  totalSent: number;
  /** 总回复数 */
  totalReplied: number;
}

/**
 * 追踪事件实体
 * 数据库存储的事件记录
 */
export interface TrackingEvent {
  /** 事件 ID (UUIDv7) */
  id: string;
  /** 事件类型 */
  eventType: AgentEventType;
  /** 用户 ID */
  userId: string;
  /** 关联的建议 ID */
  suggestionId: string;
  /** 关联的 Agent ID */
  agentId?: string;
  /** 事件数据 */
  eventData: Record<string, unknown>;
  /** 创建时间（毫秒时间戳） */
  createdAt: number;
}

/**
 * 查询事件过滤器
 */
export interface EventFilter {
  /** 用户 ID */
  userId: string;
  /** Agent ID（可选） */
  agentId?: string;
  /** 事件类型（可选） */
  eventType?: AgentEventType;
  /** 开始时间（毫秒时间戳，可选） */
  startTime?: number;
  /** 结束时间（毫秒时间戳，可选） */
  endTime?: number;
}

/**
 * 事件统计结果
 */
export interface EventStatistics {
  /** 按事件类型统计 */
  byType: Partial<Record<AgentEventType, number>>;
  /** 总事件数 */
  total: number;
}
