export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';

export type LlmProviderName = 'openai' | 'claude' | 'gemini' | 'openai-compatible';
export type LlmProviderAlias = 'anthropic' | 'google';
export type LlmProviderInputName = LlmProviderName | LlmProviderAlias;

export type LlmProviderOptions = Record<string, Record<string, unknown>>;

export interface LlmRequestConfig {
  provider: LlmProviderName;
  providerKey?: string;
  model: string;
  baseURL?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  seed?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  providerOptions?: LlmProviderOptions;
}

export interface LlmCallSettings {
  provider?: LlmProviderName;
  providerKey?: string;
  model?: string;
  baseURL?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  seed?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  providerOptions?: LlmProviderOptions;
}

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
  name?: string;
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

export interface LlmTextOptions {
  llm?: LlmCallSettings;
  signal?: AbortSignal;
}

export interface LlmStreamChatOptions extends LlmTextOptions {
  tools?: LlmToolDefinition[];
  includeReasoning?: boolean;
}
