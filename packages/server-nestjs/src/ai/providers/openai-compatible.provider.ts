/**
 * Legacy compatibility shim.
 *
 * Runtime now uses `AiSdkProviderFactory` + AI SDK v6 directly.
 * This file is intentionally kept as a non-functional shim to avoid stale imports
 * from older branches/tests.
 */

export interface OpenAiCompatibleProviderOptions {
  apiKey: string;
  baseUrl?: string;
  model: string;
  embeddingModel: string;
}

export class OpenAiCompatibleProvider {
  readonly name = 'openai-compatible';

  constructor(_options: OpenAiCompatibleProviderOptions) {}

  async generateEmbedding(): Promise<number[]> {
    throw new Error('OpenAiCompatibleProvider shim is deprecated. Use AiService/AiSdkProviderFactory.');
  }

  async generateText(): Promise<string> {
    throw new Error('OpenAiCompatibleProvider shim is deprecated. Use AiService/AiSdkProviderFactory.');
  }

  async streamChat(): Promise<AsyncIterable<unknown>> {
    throw new Error('OpenAiCompatibleProvider shim is deprecated. Use AiService/AiSdkProviderFactory.');
  }
}
