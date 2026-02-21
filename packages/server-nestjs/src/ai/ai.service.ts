import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  embed,
  generateText,
  jsonSchema,
  streamText,
  tool,
  type JSONSchema7,
  type JSONValue,
  type EmbeddingModel,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
  type TextStreamPart,
} from 'ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {
  LlmCallError,
  LlmConfigurationError,
  type ResolvedRuntimeEmbeddingConfig,
  type ResolvedRuntimeLlmConfig,
} from './providers/llm-config.types';
import {
  type LlmMessage,
  type LlmProviderAlias,
  type LlmProviderName,
  type LlmProviderOptions,
  type LlmRequestConfig,
  type LlmStreamChatOptions,
  type LlmStreamChunk,
  type LlmTextOptions,
  type LlmToolDefinition,
} from './providers/llm-types';
import { AiSdkProviderFactory } from './providers/ai-sdk-provider.factory';

const PROVIDER_ALIAS_MAP: Record<LlmProviderAlias, LlmProviderName> = {
  anthropic: 'claude',
  google: 'gemini',
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly providerFactory = new AiSdkProviderFactory();
  private readonly runtimeDefaults: ResolvedRuntimeLlmConfig;
  private readonly embeddingDefaults: ResolvedRuntimeEmbeddingConfig;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
    const fileConfig = nodeEnv !== 'production' ? this.loadLocalEnv(nodeEnv ?? 'dev') : {};

    this.runtimeDefaults = this.resolveRuntimeDefaults(fileConfig);
    this.embeddingDefaults = this.resolveEmbeddingDefaults(fileConfig, this.runtimeDefaults);

    this.logger.log(
      `AI Service initialized: provider=${this.runtimeDefaults.provider}, model=${this.runtimeDefaults.model}, embeddingProvider=${this.embeddingDefaults.provider}, embeddingModel=${this.embeddingDefaults.model}`,
    );
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.providerFactory.createEmbeddingModel(this.embeddingDefaults);
      const result = await embed({
        model,
        value: text,
      });
      return result.embedding;
    } catch (error) {
      if (error instanceof LlmConfigurationError) {
        throw error;
      }
      throw new LlmCallError(
        `Embedding generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async callAgent(prompt: string, context?: unknown): Promise<string> {
    const messages: LlmMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt },
    ];

    if (context !== undefined) {
      messages.splice(1, 0, {
        role: 'system',
        content: `Context: ${JSON.stringify(context)}`,
      });
    }

    try {
      const runtimeConfig = this.resolveRuntimeCallSettings();
      const model = this.providerFactory.createLanguageModel(runtimeConfig);
      const result = await generateText({
        model,
        messages: this.toModelMessages(messages),
        temperature: runtimeConfig.temperature ?? 0.7,
        maxOutputTokens: runtimeConfig.maxOutputTokens ?? 500,
        topP: runtimeConfig.topP,
        topK: runtimeConfig.topK,
        stopSequences: runtimeConfig.stopSequences,
        seed: runtimeConfig.seed,
        presencePenalty: runtimeConfig.presencePenalty,
        frequencyPenalty: runtimeConfig.frequencyPenalty,
        providerOptions: this.toProviderOptions(runtimeConfig.providerOptions),
      });

      return result.text;
    } catch (error) {
      if (error instanceof LlmConfigurationError) {
        throw error;
      }
      throw new LlmCallError(
        `LLM text generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async streamChat(
    messages: LlmMessage[],
    options?: LlmStreamChatOptions,
  ): Promise<AsyncIterable<LlmStreamChunk>> {
    try {
      const runtimeConfig = this.resolveRuntimeCallSettings(options?.llm);
      const model = this.providerFactory.createLanguageModel(runtimeConfig);

      const result = streamText({
        model,
        messages: this.toModelMessages(messages),
        tools: this.toAiSdkTools(options?.tools),
        abortSignal: options?.signal,
        temperature: runtimeConfig.temperature,
        maxOutputTokens: runtimeConfig.maxOutputTokens,
        topP: runtimeConfig.topP,
        topK: runtimeConfig.topK,
        stopSequences: runtimeConfig.stopSequences,
        seed: runtimeConfig.seed,
        presencePenalty: runtimeConfig.presencePenalty,
        frequencyPenalty: runtimeConfig.frequencyPenalty,
        providerOptions: this.toProviderOptions(runtimeConfig.providerOptions),
      });

      return this.mapStream(result.fullStream);
    } catch (error) {
      if (error instanceof LlmConfigurationError) {
        throw error;
      }
      throw new LlmCallError(
        `LLM streaming failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private resolveRuntimeDefaults(fileConfig: Record<string, string>): ResolvedRuntimeLlmConfig {
    const providerRaw =
      fileConfig.LLM_PROVIDER ??
      this.configService.get<string>('LLM_PROVIDER') ??
      process.env.LLM_PROVIDER ??
      'openai-compatible';

    const provider = this.normalizeProvider(providerRaw);
    const model =
      fileConfig.LLM_MODEL ??
      this.configService.get<string>('LLM_MODEL') ??
      process.env.LLM_MODEL ??
      fileConfig.OPENAI_MODEL ??
      this.configService.get<string>('OPENAI_MODEL') ??
      process.env.OPENAI_MODEL ??
      'gpt-4.1-mini';

    return {
      provider,
      model,
      apiKey: this.resolveProviderApiKey(provider, fileConfig),
      baseURL: this.resolveProviderBaseUrl(provider, fileConfig),
    };
  }

  private resolveEmbeddingDefaults(
    fileConfig: Record<string, string>,
    runtimeDefaults: ResolvedRuntimeLlmConfig,
  ): ResolvedRuntimeEmbeddingConfig {
    const providerRaw =
      fileConfig.LLM_EMBEDDING_PROVIDER ??
      this.configService.get<string>('LLM_EMBEDDING_PROVIDER') ??
      process.env.LLM_EMBEDDING_PROVIDER ??
      runtimeDefaults.provider;

    const provider = this.normalizeProvider(providerRaw);

    const model =
      fileConfig.LLM_EMBEDDING_MODEL ??
      this.configService.get<string>('LLM_EMBEDDING_MODEL') ??
      process.env.LLM_EMBEDDING_MODEL ??
      fileConfig.OPENAI_EMBEDDING_MODEL ??
      this.configService.get<string>('OPENAI_EMBEDDING_MODEL') ??
      process.env.OPENAI_EMBEDDING_MODEL ??
      'text-embedding-3-small';

    const apiKey =
      fileConfig.LLM_EMBEDDING_API_KEY ??
      this.configService.get<string>('LLM_EMBEDDING_API_KEY') ??
      process.env.LLM_EMBEDDING_API_KEY ??
      this.resolveProviderApiKey(provider, fileConfig);

    const baseURL =
      fileConfig.LLM_EMBEDDING_BASE_URL ??
      this.configService.get<string>('LLM_EMBEDDING_BASE_URL') ??
      process.env.LLM_EMBEDDING_BASE_URL ??
      this.resolveProviderBaseUrl(provider, fileConfig);

    return {
      provider,
      model,
      apiKey,
      baseURL,
    };
  }

  private resolveRuntimeCallSettings(override?: LlmTextOptions['llm']): ResolvedRuntimeLlmConfig {
    const provider = override?.provider ?? this.runtimeDefaults.provider;
    const model = override?.model ?? this.runtimeDefaults.model;

    if (!provider || !model) {
      throw new LlmConfigurationError(
        'llm_provider_not_configured',
        'LLM provider/model is not configured.',
      );
    }

    const providerOptions = this.normalizeProviderOptions(override?.providerOptions);

    return {
      provider,
      model,
      apiKey: this.runtimeDefaults.apiKey,
      baseURL: this.runtimeDefaults.baseURL,
      temperature: override?.temperature,
      maxOutputTokens: override?.maxOutputTokens,
      topP: override?.topP,
      topK: override?.topK,
      stopSequences: override?.stopSequences,
      seed: override?.seed,
      presencePenalty: override?.presencePenalty,
      frequencyPenalty: override?.frequencyPenalty,
      providerOptions,
    };
  }

  private resolveProviderApiKey(
    provider: LlmProviderName,
    fileConfig: Record<string, string>,
  ): string | undefined {
    const fromCommon =
      fileConfig.LLM_API_KEY ??
      this.configService.get<string>('LLM_API_KEY') ??
      process.env.LLM_API_KEY;

    if (fromCommon) {
      return fromCommon;
    }

    if (provider === 'openai' || provider === 'openai-compatible') {
      return (
        fileConfig.OPENAI_API_KEY ??
        this.configService.get<string>('OPENAI_API_KEY') ??
        process.env.OPENAI_API_KEY
      );
    }

    if (provider === 'claude') {
      return (
        fileConfig.ANTHROPIC_API_KEY ??
        this.configService.get<string>('ANTHROPIC_API_KEY') ??
        process.env.ANTHROPIC_API_KEY
      );
    }

    if (provider === 'gemini') {
      return (
        fileConfig.GOOGLE_GENERATIVE_AI_API_KEY ??
        this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY') ??
        process.env.GOOGLE_GENERATIVE_AI_API_KEY
      );
    }

    return undefined;
  }

  private resolveProviderBaseUrl(
    provider: LlmProviderName,
    fileConfig: Record<string, string>,
  ): string | undefined {
    const fromCommon =
      fileConfig.LLM_BASE_URL ??
      this.configService.get<string>('LLM_BASE_URL') ??
      process.env.LLM_BASE_URL;

    if (fromCommon) {
      return fromCommon;
    }

    if (provider === 'openai' || provider === 'openai-compatible') {
      return (
        fileConfig.OPENAI_BASE_URL ??
        this.configService.get<string>('OPENAI_BASE_URL') ??
        process.env.OPENAI_BASE_URL
      );
    }

    if (provider === 'claude') {
      return (
        fileConfig.ANTHROPIC_BASE_URL ??
        this.configService.get<string>('ANTHROPIC_BASE_URL') ??
        process.env.ANTHROPIC_BASE_URL
      );
    }

    if (provider === 'gemini') {
      return (
        fileConfig.GOOGLE_GENERATIVE_AI_BASE_URL ??
        this.configService.get<string>('GOOGLE_GENERATIVE_AI_BASE_URL') ??
        process.env.GOOGLE_GENERATIVE_AI_BASE_URL
      );
    }

    return undefined;
  }

  private normalizeProvider(rawProvider: string): LlmProviderName {
    const normalized = rawProvider.trim().toLowerCase();

    if (normalized in PROVIDER_ALIAS_MAP) {
      return PROVIDER_ALIAS_MAP[normalized as LlmProviderAlias];
    }

    if (
      normalized === 'openai' ||
      normalized === 'claude' ||
      normalized === 'gemini' ||
      normalized === 'openai-compatible'
    ) {
      return normalized;
    }

    throw new LlmConfigurationError('unsupported_llm_provider', `Unsupported LLM provider: ${rawProvider}`);
  }

  private toModelMessages(messages: LlmMessage[]): ModelMessage[] {
    return messages.map((message): ModelMessage => {
      const content = typeof message.content === 'string' ? message.content : '';

      if (message.role === 'tool') {
        return {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: String(message.tool_call_id ?? ''),
              toolName: typeof message.name === 'string' && message.name.length > 0 ? message.name : 'tool',
              output: this.toToolResultOutput(content),
            },
          ],
        };
      }

      if (message.role === 'assistant' && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
        const parts: Array<
          | { type: 'text'; text: string }
          | { type: 'tool-call'; toolCallId: string; toolName: string; input: JSONValue }
        > = [];
        if (content.length > 0) {
          parts.push({ type: 'text', text: content });
        }

        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function?.name ?? '';
          if (!toolName) {
            continue;
          }

          parts.push({
            type: 'tool-call',
            toolCallId: toolCall.id ?? '',
            toolName,
            input: this.parseJsonValue(toolCall.function?.arguments) ?? {},
          });
        }

        return {
          role: 'assistant',
          content: parts,
        };
      }

      if (message.role === 'assistant') {
        return {
          role: 'assistant',
          content,
        };
      }

      if (message.role === 'system') {
        return {
          role: 'system',
          content,
        };
      }

      return {
        role: 'user',
        content,
      };
    });
  }

  private toAiSdkTools(tools?: LlmToolDefinition[]): Record<string, ReturnType<typeof tool>> | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    const toolSet: Record<string, ReturnType<typeof tool>> = {};
    for (const item of tools) {
      if (!item.name) {
        continue;
      }
      toolSet[item.name] = tool({
        description: item.description,
        inputSchema: jsonSchema(this.toToolInputSchema(item.parameters)),
      });
    }

    return Object.keys(toolSet).length > 0 ? toolSet : undefined;
  }

  private async *mapStream(
    stream: AsyncIterable<TextStreamPart<ToolSet>>,
  ): AsyncGenerator<LlmStreamChunk> {
    const toolCallOrder = new Map<string, number>();

    for await (const part of stream) {
      if (part.type === 'text-delta') {
        yield {
          choices: [
            {
              delta: { content: part.text },
            },
          ],
        };
        continue;
      }

      if (part.type === 'tool-input-start') {
        const index = toolCallOrder.size;
        toolCallOrder.set(part.id, index);
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    id: part.id,
                    type: 'function',
                    index,
                    function: {
                      name: part.toolName,
                      arguments: '',
                    },
                  },
                ],
              },
            },
          ],
        };
        continue;
      }

      if (part.type === 'tool-input-delta') {
        const index = toolCallOrder.get(part.id) ?? 0;
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    id: part.id,
                    type: 'function',
                    index,
                    function: {
                      arguments: part.delta,
                    },
                  },
                ],
              },
            },
          ],
        };
        continue;
      }

      if (part.type === 'finish') {
        yield {
          choices: [
            {
              delta: {},
              finish_reason: part.finishReason,
            },
          ],
        };
        continue;
      }

      if (part.type === 'error') {
        throw new LlmCallError(
          `LLM stream part error: ${part.error instanceof Error ? part.error.message : String(part.error)}`,
        );
      }
    }
  }

  private parseJsonValue(value: unknown): JSONValue | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return this.isJsonValue(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  private toToolResultOutput(value: string):
    | { type: 'json'; value: JSONValue }
    | { type: 'text'; value: string } {
    const parsed = this.parseJsonValue(value);
    if (parsed !== undefined) {
      return {
        type: 'json',
        value: parsed,
      };
    }

    return {
      type: 'text',
      value,
    };
  }

  private toToolInputSchema(parameters: unknown): JSONSchema7 {
    if (this.isRecord(parameters)) {
      return parameters as JSONSchema7;
    }
    return { type: 'object', properties: {} };
  }

  private toProviderOptions(
    options: LlmProviderOptions | undefined,
  ): Record<string, Record<string, JSONValue>> | undefined {
    if (!options || Object.keys(options).length === 0) {
      return undefined;
    }

    const resolved: Record<string, Record<string, JSONValue>> = {};
    for (const [provider, rawOptions] of Object.entries(options)) {
      const normalized = this.toJsonObject(rawOptions);
      if (normalized) {
        resolved[provider] = normalized;
      }
    }

    return Object.keys(resolved).length > 0 ? resolved : undefined;
  }

  private toJsonObject(value: unknown): Record<string, JSONValue> | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const output: Record<string, JSONValue> = {};
    for (const [key, item] of Object.entries(value)) {
      if (this.isJsonValue(item)) {
        output[key] = item;
      }
    }

    return output;
  }

  private normalizeProviderOptions(options: LlmProviderOptions | undefined): LlmProviderOptions | undefined {
    if (!options || Object.keys(options).length === 0) {
      return undefined;
    }

    const normalized: LlmProviderOptions = {};

    for (const [rawKey, value] of Object.entries(options)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }

      const key = this.normalizeProviderOptionKey(rawKey);
      normalized[key] = {
        ...value,
      };
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
  }

  private normalizeProviderOptionKey(key: string): string {
    const normalized = key.trim();

    if (normalized === 'claude') {
      return 'anthropic';
    }
    if (normalized === 'gemini') {
      return 'google';
    }
    if (normalized === 'openai-compatible' || normalized === 'openai_compatible') {
      return 'openaiCompatible';
    }

    return normalized;
  }

  private loadLocalEnv(nodeEnv: string): Record<string, string> {
    const envNames = [nodeEnv];
    if (nodeEnv === 'dev') {
      envNames.push('development');
    }
    if (nodeEnv === 'development') {
      envNames.push('dev');
    }

    const baseNames = envNames.flatMap((name) => [`.env.${name}`, `.env.${name}.local`]);
    const shared = ['.env', '.env.local'];
    const candidates = [...shared, ...baseNames];

    const cwd = process.cwd();
    const inPackage = path.basename(cwd) === 'server-nestjs';
    const resolved = [
      ...candidates.map((file) => path.resolve(cwd, file)),
      ...(!inPackage
        ? candidates.map((file) => path.resolve(cwd, 'packages/server-nestjs', file))
        : []),
    ];

    let merged: Record<string, string> = {};
    for (const candidate of resolved) {
      if (!fs.existsSync(candidate)) {
        continue;
      }
      const content = fs.readFileSync(candidate, 'utf8');
      merged = { ...merged, ...dotenv.parse(content) };
    }

    return merged;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private isJsonValue(value: unknown): value is JSONValue {
    if (value === null) {
      return true;
    }

    const valueType = typeof value;
    if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
      return true;
    }

    if (Array.isArray(value)) {
      return value.every((item) => this.isJsonValue(item));
    }

    if (!this.isRecord(value)) {
      return false;
    }

    return Object.values(value).every((item) => this.isJsonValue(item));
  }
}
