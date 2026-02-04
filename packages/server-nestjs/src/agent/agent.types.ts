import type OpenAI from 'openai';
import type { ToolExecutionResult } from '../ai/tools/tool.types';

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
}

export type AgentStreamEvent =
  | { type: 'token'; content: string }
  | { type: 'done'; reason?: string }
  | { type: 'error'; message: string }
  | { type: 'tool_call'; toolName: string; callId?: string; arguments?: unknown }
  | { type: 'tool_result'; result: ToolExecutionResult }
  | { type: 'requires_confirmation'; toolName: string; confirmationId: string; callId?: string; arguments?: unknown }
  | { type: 'context_update'; context: Record<string, unknown> };
