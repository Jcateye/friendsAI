import type {
  LlmMessage,
  LlmStreamChatOptions,
  LlmStreamChunk,
} from './llm-types';

export interface LlmProvider {
  readonly name: string;
  generateEmbedding(text: string): Promise<number[]>;
  generateText(
    messages: LlmMessage[],
    options?: Pick<LlmStreamChatOptions, 'model' | 'temperature' | 'maxTokens' | 'signal'>,
  ): Promise<string>;
  streamChat(
    messages: LlmMessage[],
    options?: LlmStreamChatOptions,
  ): Promise<AsyncIterable<LlmStreamChunk>>;
}
