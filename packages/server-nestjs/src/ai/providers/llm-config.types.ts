import type { EmbeddingModel, LanguageModel } from 'ai';
import type { LlmProviderName, LlmRequestConfig } from './llm-types';

export interface ProviderConnectionConfig {
  provider: LlmProviderName;
  apiKey?: string;
  baseURL?: string;
}

export interface ResolvedRuntimeLlmConfig extends LlmRequestConfig {
  apiKey?: string;
  baseURL?: string;
}

export interface ResolvedRuntimeEmbeddingConfig {
  provider: LlmProviderName;
  model: string;
  apiKey?: string;
  baseURL?: string;
}

export interface ProviderFactory {
  createLanguageModel(config: ResolvedRuntimeLlmConfig): LanguageModel;
  createEmbeddingModel(config: ResolvedRuntimeEmbeddingConfig): EmbeddingModel;
}

export type LlmConfigurationErrorCode =
  | 'unsupported_llm_provider'
  | 'llm_provider_not_configured';

export class LlmConfigurationError extends Error {
  readonly code: LlmConfigurationErrorCode;

  constructor(code: LlmConfigurationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'LlmConfigurationError';
  }
}

export class LlmCallError extends Error {
  readonly code = 'llm_call_failed' as const;

  constructor(message: string) {
    super(message);
    this.name = 'LlmCallError';
  }
}
