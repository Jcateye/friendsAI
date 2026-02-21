import type {
  LlmMessage,
  LlmStreamChatOptions,
  LlmStreamChunk,
  LlmTextOptions,
} from './llm-types';

export interface LlmProvider {
  readonly name: string;
  generateEmbedding(text: string): Promise<number[]>;
  generateText(
    messages: LlmMessage[],
    options?: LlmTextOptions,
  ): Promise<string>;
  streamChat(
    messages: LlmMessage[],
    options?: LlmStreamChatOptions,
  ): Promise<AsyncIterable<LlmStreamChunk>>;
}
