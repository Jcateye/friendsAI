import type OpenAI from 'openai';

export type AgentChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export interface AgentChatRequest {
  messages?: AgentChatMessage[];
  prompt?: string;
  context?: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  max_tokens?: number;
}

export type AgentStreamEvent =
  | { type: 'token'; content: string }
  | { type: 'done'; reason?: string }
  | { type: 'error'; message: string };
