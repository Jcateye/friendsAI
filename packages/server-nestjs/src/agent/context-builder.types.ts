/**
 * ContextBuilder Types
 *
 * 定义三层上下文构建器的类型系统
 */

import type {
  AgentContextLayers,
  AgentGlobalContext,
  AgentSessionContext,
  AgentRequestContext,
  Contact,
  AgentMessage,
} from '../../../client/src/types';

/**
 * 上下文构建配置
 */
export interface ContextBuildOptions {
  /** 是否包含联系人信息 */
  includeContacts?: boolean;

  /** 是否包含对话历史 */
  includeHistory?: boolean;

  /** 是否包含连接器信息 */
  includeConnectors?: boolean;

  /** 历史消息数量限制 */
  historyLimit?: number;

  /** 联系人数量限制 */
  contactsLimit?: number;

  /** 是否使用向量搜索相关上下文 */
  useVectorSearch?: boolean;

  /** 向量搜索查询文本 */
  vectorSearchQuery?: string;

  /** 向量搜索结果数量 */
  vectorSearchLimit?: number;
}

/**
 * 全局上下文构建参数
 */
export interface GlobalContextParams {
  userId: string;
  includeContacts?: boolean;
  includeConnectors?: boolean;
  contactsLimit?: number;
}

/**
 * 会话上下文构建参数
 */
export interface SessionContextParams {
  sessionId: string;
  conversationId?: string;
  userId: string;
  includeHistory?: boolean;
  historyLimit?: number;
  useVectorSearch?: boolean;
  vectorSearchQuery?: string;
  vectorSearchLimit?: number;
}

/**
 * 请求上下文构建参数
 */
export interface RequestContextParams {
  requestId: string;
  traceId?: string;
  input?: string;
  channel?: string;
  metadata?: Record<string, any>;
}

/**
 * 完整上下文构建参数
 */
export interface BuildContextParams {
  userId: string;
  sessionId: string;
  requestId: string;
  conversationId?: string;
  options?: ContextBuildOptions;
  requestContext?: Partial<RequestContextParams>;
}

/**
 * 向量搜索结果
 */
export interface VectorSearchResult {
  conversations: Array<{
    id: string;
    content: string;
    similarity: number;
    createdAt: Date;
    contactId?: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    description?: string;
    similarity: number;
    createdAt: Date;
    contactId?: string;
  }>;
}
