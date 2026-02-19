import type { AgentChatRequest, AgentRunRequest } from '../agent.types';

export type AgentEngineName = 'local' | 'openclaw';

export interface AgentEngineRequest {
  endpoint: 'chat' | 'run';
  userId?: string;
  agentId?: AgentRunRequest['agentId'];
  operation?: string | null;
}

export interface AgentEngineRunOptions {
  useCache?: boolean;
  forceRefresh?: boolean;
  userId?: string;
  conversationId?: string;
  sessionId?: string;
  intent?: AgentRunRequest['intent'];
  relationshipMix?: AgentRunRequest['relationshipMix'];
  timeBudgetMinutes?: number;
}

export interface AgentEngineRunResult {
  runId: string;
  cached: boolean;
  snapshotId?: string;
  data: Record<string, unknown>;
}

export interface RuntimeRouterDecision {
  request: AgentEngineRequest;
  primaryEngine: AgentEngineName;
  fallbackEngine: AgentEngineName | null;
}

export interface AgentEngineChatOptions {
  signal?: AbortSignal;
}

export type AgentEngineChatRequest = AgentChatRequest;

export const OPENCLAW_ENGINE_TOKEN = 'OPENCLAW_ENGINE_TOKEN';
