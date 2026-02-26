import type {
  LlmCallSettings,
  LlmMessage,
  LlmProviderName,
  LlmRequestConfig,
} from '../ai/providers/llm-types';
import type {
  AgentContextPatch,
  AgentError,
  AgentMessage,
  AgentMessageDelta,
  AgentRunEnd,
  AgentRunStart,
  AgentSseEvent,
  ToolStateUpdate,
} from './client-types';
import type { AgentId } from './contracts/agent-definition.types';

export type AgentChatMessage = LlmMessage;

export interface AgentComposerAttachment {
  name: string;
  mimeType?: string;
  size?: number;
  kind: 'image' | 'file';
}

export interface AgentComposerContext {
  enabledTools?: string[];
  attachments?: AgentComposerAttachment[];
  feishuEnabled?: boolean;
  thinkingEnabled?: boolean;
  inputMode?: 'text' | 'voice';
  skillActionId?: string;
  rawInputs?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AgentChatContext extends Record<string, unknown> {
  composer?: AgentComposerContext;
}

export interface AgentChatRequest {
  messages?: AgentChatMessage[];
  prompt?: string;
  context?: AgentChatContext;
  llm?: LlmCallSettings;
  userId?: string;
  conversationId?: string;
  sessionId?: string;
}

/**
 * Agent ID 类型
 * 支持的 Agent 类型列表
 */
export type SupportedAgentId =
  | 'chat_conversation'
  | 'archive_brief'
  | 'title_summary'
  | 'network_action'
  | 'contact_insight';

/**
 * Agent 运行请求
 * 用于统一入口 /v1/agent/run
 */
export interface AgentRunRequest {
  /** Agent ID */
  agentId: SupportedAgentId;
  /** 操作类型（可选，用于区分同一 agent 的不同操作） */
  operation?: string | null;
  /** 输入数据 */
  input: Record<string, unknown>;
  /** 用户意图 - optional: maintain|grow|repair */
  intent?: 'maintain' | 'grow' | 'repair';
  /** 关系类型偏好 - optional: business|friend|mixed */
  relationshipMix?: 'business' | 'friend' | 'mixed';
  /** 时间预算（分钟） - optional */
  timeBudgetMinutes?: number;
  /** 运行选项 */
  options?: {
    /** 是否使用缓存 */
    useCache?: boolean;
    /** 是否强制刷新（忽略缓存） */
    forceRefresh?: boolean;
  };
  /** 用户 ID */
  userId?: string;
  /** 会话 ID */
  sessionId?: string;
  /** 对话 ID */
  conversationId?: string;
  /** LLM 调用配置 */
  llm?: LlmRequestConfig;
}

/**
 * Agent 运行响应
 * /v1/agent/run 的响应格式
 */
export interface AgentRunResponse {
  /** 运行 ID */
  runId: string;
  /** Agent ID */
  agentId: SupportedAgentId;
  /** 操作类型 */
  operation: string | null;
  /** 是否来自缓存 */
  cached: boolean;
  /** 快照 ID（如果使用了缓存） */
  snapshotId?: string;
  /** 生成时间（ISO 8601） */
  generatedAt: string;
  /** 生成时间戳（毫秒，用于排序） */
  generatedAtMs: number;
  /** 响应数据 */
  data: Record<string, unknown>;
}

/**
 * Agent 运行错误码
 */
export enum AgentRunErrorCode {
  /** Agent 未找到 */
  AGENT_NOT_FOUND = 'agent_not_found',
  /** Agent 操作无效 */
  AGENT_OPERATION_INVALID = 'agent_operation_invalid',
  /** Legacy 桥接失败 */
  LEGACY_BRIDGE_FAILED = 'legacy_bridge_failed',
}

export type AgentStreamEvent = AgentSseEvent;

export type AgentStreamPayload =
  | { event: 'agent.start'; data: AgentRunStart }
  | { event: 'agent.delta'; data: AgentMessageDelta }
  | { event: 'agent.message'; data: AgentMessage }
  | { event: 'tool.state'; data: ToolStateUpdate }
  | { event: 'context.patch'; data: AgentContextPatch }
  | { event: 'agent.end'; data: AgentRunEnd }
  | { event: 'error'; data: AgentError };

export interface AgentLlmCatalogModel {
  model: string;
  label: string;
  reasoning: boolean;
  providerOptions?: Record<string, Record<string, unknown>>;
}

export interface AgentLlmCatalogProvider {
  key: string;
  provider: LlmProviderName;
  label: string;
  baseURL?: string;
  models: AgentLlmCatalogModel[];
}

export interface AgentLlmCatalogResponse {
  source: 'opencode' | 'env';
  defaultSelection: {
    key: string;
    provider: LlmProviderName;
    model: string;
  };
  providers: AgentLlmCatalogProvider[];
}
