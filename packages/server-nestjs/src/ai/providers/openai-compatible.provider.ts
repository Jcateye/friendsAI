import OpenAI from 'openai';
import { InternalServerErrorException } from '@nestjs/common';
import type { LlmProvider } from './llm-provider.interface';
import type {
  LlmMessage,
  LlmStreamChatOptions,
  LlmStreamChunk,
  LlmToolCall,
  LlmToolDefinition,
} from './llm-types';

export interface OpenAiCompatibleProviderOptions {
  apiKey: string;
  baseUrl?: string;
  model: string;
  embeddingModel: string;
}

export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name = 'openai-compatible';

  private readonly client: OpenAI;
  private readonly model: string;
  private readonly embeddingModel: string;

  constructor(options: OpenAiCompatibleProviderOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      ...(options.baseUrl ? { baseURL: options.baseUrl } : {}),
    });
    this.model = options.model;
    this.embeddingModel = options.embeddingModel;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      return response.data[0]?.embedding ?? [];
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate embedding.');
    }
  }

  async generateText(
    messages: LlmMessage[],
    options?: Pick<LlmStreamChatOptions, 'model' | 'temperature' | 'maxTokens' | 'signal'>,
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create(
        {
          model: options?.model ?? this.model,
          messages: this.toOpenAiMessages(messages),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 500,
        },
        options?.signal ? { signal: options.signal } : undefined,
      );

      return response.choices[0]?.message?.content ?? '';
    } catch (error) {
      throw new InternalServerErrorException('Failed to call AI agent.');
    }
  }

  async streamChat(
    messages: LlmMessage[],
    options?: LlmStreamChatOptions,
  ): Promise<AsyncIterable<LlmStreamChunk>> {
    try {
      const stream = await this.client.chat.completions.create(
        {
          model: options?.model ?? this.model,
          messages: this.toOpenAiMessages(messages),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
          stream: true,
          tools: this.toOpenAiTools(options?.tools),
          tool_choice: options?.tools && options.tools.length > 0 ? 'auto' : undefined,
        },
        options?.signal ? { signal: options.signal } : undefined,
      );

      return this.mapStream(stream);
    } catch (error) {
      throw new InternalServerErrorException('Failed to stream AI agent.');
    }
  }

  private toOpenAiMessages(messages: LlmMessage[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map((message) => {
      const role = message.role;
      const content = typeof message.content === 'string' ? message.content : '';

      if (role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: String(message.tool_call_id ?? ''),
          content,
        } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam;
      }

      if (role === 'assistant' && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
        return {
          role: 'assistant',
          content,
          tool_calls: message.tool_calls.map((toolCall) => ({
            id: toolCall.id ?? '',
            type: 'function',
            function: {
              name: toolCall.function?.name ?? '',
              arguments: toolCall.function?.arguments ?? '',
            },
          })),
        } as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;
      }

      return {
        role: role as 'system' | 'user' | 'assistant',
        content,
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
    });
  }

  private toOpenAiTools(
    tools?: LlmToolDefinition[],
  ): OpenAI.Chat.Completions.ChatCompletionTool[] | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters ?? { type: 'object', properties: {} },
      },
    }));
  }

  private async *mapStream(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  ): AsyncGenerator<LlmStreamChunk> {
    for await (const chunk of stream) {
      yield {
        choices: chunk.choices?.map((choice) => ({
          delta: {
            content: choice.delta?.content ?? undefined,
            tool_calls: choice.delta?.tool_calls?.map((toolCall) => this.mapToolCall(toolCall)),
          },
          finish_reason: choice.finish_reason ?? undefined,
        })),
      };
    }
  }

  private mapToolCall(
    toolCall: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall,
  ): LlmToolCall {
    return {
      id: toolCall.id ?? undefined,
      type: toolCall.type === 'function' ? 'function' : undefined,
      index: toolCall.index,
      function: toolCall.function
        ? {
            name: toolCall.function.name ?? undefined,
            arguments: toolCall.function.arguments ?? undefined,
          }
        : undefined,
    };
  }
}
