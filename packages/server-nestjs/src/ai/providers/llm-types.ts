export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LlmToolFunctionCall {
  name?: string;
  arguments?: string;
}

export interface LlmToolCall {
  id?: string;
  type?: 'function';
  index?: number;
  function?: LlmToolFunctionCall;
}

export interface LlmMessage {
  role: LlmRole;
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: LlmToolCall[];
  [key: string]: unknown;
}

export interface LlmToolDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface LlmStreamChoiceDelta {
  content?: string;
  tool_calls?: LlmToolCall[];
}

export interface LlmStreamChoice {
  delta?: LlmStreamChoiceDelta;
  finish_reason?: string | null;
}

export interface LlmStreamChunk {
  choices?: LlmStreamChoice[];
  [key: string]: unknown;
}

export interface LlmStreamChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  tools?: LlmToolDefinition[];
}
