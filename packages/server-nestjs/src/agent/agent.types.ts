import type OpenAI from 'openai';
import type {
  AgentContextPatch,
  AgentError,
  AgentMessage,
  AgentMessageDelta,
  AgentRunEnd,
  AgentRunStart,
  AgentSseEvent,
  ToolStateUpdate,
} from '../../../client/src/types';

export type AgentChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export interface AgentChatRequest {
  messages?: AgentChatMessage[];
  prompt?: string;
  context?: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  max_tokens?: number;
  userId?: string;
  conversationId?: string;
  sessionId?: string;
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
