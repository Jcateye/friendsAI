import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import type {
  LlmMessage,
  LlmStreamChatOptions,
  LlmStreamChunk,
} from './providers/llm-types';
import type { LlmProvider } from './providers/llm-provider.interface';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly provider: LlmProvider;
  private readonly model: string;
  private readonly embeddingModel: string;

  constructor(private configService: ConfigService) {
    const { provider, apiKey, baseUrl, model, embeddingModel } = this.resolveLlmConfig();
    if (!apiKey) {
      throw new InternalServerErrorException('LLM_API_KEY is not configured.');
    }
    this.provider = this.createProvider(provider, {
      apiKey,
      baseUrl,
      model,
      embeddingModel,
    });
    this.model = model;
    this.embeddingModel = embeddingModel;
    this.logger.log(
      `AI Service initialized: provider=${this.provider.name}, model=${model}, embedding=${embeddingModel}, baseUrl=${baseUrl || 'https://api.openai.com/v1 (default)'}`,
    );
  }

  private resolveLlmConfig(): {
    provider: string;
    apiKey: string | undefined;
    baseUrl: string | undefined;
    model: string;
    embeddingModel: string;
  } {
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
    const useEnvFile = nodeEnv !== 'production';
    const fileConfig = useEnvFile ? this.loadLocalEnv(nodeEnv ?? 'dev') : {};

    const provider =
      fileConfig.LLM_PROVIDER ??
      this.configService.get<string>('LLM_PROVIDER') ??
      process.env.LLM_PROVIDER ??
      'openai-compatible';
    const apiKey =
      fileConfig.LLM_API_KEY ??
      this.configService.get<string>('LLM_API_KEY') ??
      process.env.LLM_API_KEY ??
      fileConfig.OPENAI_API_KEY ??
      this.configService.get<string>('OPENAI_API_KEY') ??
      process.env.OPENAI_API_KEY;
    const baseUrl =
      fileConfig.LLM_BASE_URL ??
      this.configService.get<string>('LLM_BASE_URL') ??
      process.env.LLM_BASE_URL ??
      fileConfig.OPENAI_BASE_URL ??
      this.configService.get<string>('OPENAI_BASE_URL') ??
      process.env.OPENAI_BASE_URL ??
      undefined;
    const model =
      fileConfig.LLM_MODEL ??
      this.configService.get<string>('LLM_MODEL') ??
      process.env.LLM_MODEL ??
      fileConfig.OPENAI_MODEL ??
      this.configService.get<string>('OPENAI_MODEL') ??
      process.env.OPENAI_MODEL ??
      'gpt-4.1-mini';
    const embeddingModel =
      fileConfig.LLM_EMBEDDING_MODEL ??
      this.configService.get<string>('LLM_EMBEDDING_MODEL') ??
      process.env.LLM_EMBEDDING_MODEL ??
      fileConfig.OPENAI_EMBEDDING_MODEL ??
      this.configService.get<string>('OPENAI_EMBEDDING_MODEL') ??
      process.env.OPENAI_EMBEDDING_MODEL ??
      'text-embedding-ada-002';

    return { provider, apiKey, baseUrl, model, embeddingModel };
  }

  private createProvider(
    providerName: string,
    config: {
      apiKey: string;
      baseUrl?: string;
      model: string;
      embeddingModel: string;
    },
  ): LlmProvider {
    if (providerName === 'openai-compatible') {
      return new OpenAiCompatibleProvider(config);
    }

    throw new InternalServerErrorException(`Unsupported LLM provider: ${providerName}`);
  }

  private loadLocalEnv(nodeEnv: string): Record<string, string> {
    const envNames = [nodeEnv];
    if (nodeEnv === 'dev') envNames.push('dev');

    const baseNames = envNames.flatMap((name) => [
      `.env.${name}`,
      `.env.${name}.local`,
    ]);
    const shared = ['.env', '.env.local'];
    // 按优先级从低到高排列，后面的覆盖前面的
    const candidates = [...shared, ...baseNames];
    const cwd = process.cwd();
    const inPackage = path.basename(cwd) === 'server-nestjs';
    const resolved = [
      ...candidates.map((file) => path.resolve(cwd, file)),
      ...(!inPackage
        ? candidates.map((file) => path.resolve(cwd, 'packages/server-nestjs', file))
        : []),
    ];

    // 合并所有存在的 env 文件，高优先级覆盖低优先级
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

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      return await this.provider.generateEmbedding(text);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new InternalServerErrorException('Failed to generate embedding.');
    }
  }

  async callAgent(prompt: string, context?: any): Promise<string> {
    try {
      const messages: LlmMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ];

      if (context) {
        messages.splice(1, 0, {
          role: 'system',
          content: `Context: ${JSON.stringify(context)}`,
        });
      }

      return await this.provider.generateText(messages, {
        model: this.model,
        temperature: 0.7,
        maxTokens: 500,
      });
    } catch (error) {
      console.error('Error calling AI agent:', error);
      throw new InternalServerErrorException('Failed to call AI agent.');
    }
  }

  async streamChat(
    messages: LlmMessage[],
    options?: LlmStreamChatOptions,
  ): Promise<AsyncIterable<LlmStreamChunk>> {
    try {
      return await this.provider.streamChat(messages, options);
    } catch (error) {
      console.error('Error streaming AI agent:', error);
      throw new InternalServerErrorException('Failed to stream AI agent.');
    }
  }
}
