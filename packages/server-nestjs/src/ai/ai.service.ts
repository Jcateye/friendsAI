import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private model: string;
  private embeddingModel: string;

  constructor(private configService: ConfigService) {
    const { apiKey, baseUrl, model, embeddingModel } = this.resolveOpenAiConfig();
    if (!apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured.');
    }
    this.openai = new OpenAI({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    });
    this.model = model;
    this.embeddingModel = embeddingModel;
    this.logger.log(`AI Service initialized: model=${model}, embedding=${embeddingModel}, baseUrl=${baseUrl || 'https://api.openai.com/v1 (default)'}`);
  }

  private resolveOpenAiConfig(): {
    apiKey: string | undefined;
    baseUrl: string | undefined;
    model: string;
    embeddingModel: string;
  } {
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
    const useEnvFile = nodeEnv !== 'production';
    const fileConfig = useEnvFile ? this.loadLocalEnv(nodeEnv ?? 'dev') : {};

    const apiKey =
      fileConfig.OPENAI_API_KEY ??
      this.configService.get<string>('OPENAI_API_KEY') ??
      process.env.OPENAI_API_KEY;
    const baseUrl =
      fileConfig.OPENAI_BASE_URL ??
      this.configService.get<string>('OPENAI_BASE_URL') ??
      process.env.OPENAI_BASE_URL ??
      undefined;
    const model =
      fileConfig.OPENAI_MODEL ??
      this.configService.get<string>('OPENAI_MODEL') ??
      process.env.OPENAI_MODEL ??
      'gpt-4.1-mini';
    const embeddingModel =
      fileConfig.OPENAI_EMBEDDING_MODEL ??
      this.configService.get<string>('OPENAI_EMBEDDING_MODEL') ??
      process.env.OPENAI_EMBEDDING_MODEL ??
      'text-embedding-ada-002';

    return { apiKey, baseUrl, model, embeddingModel };
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
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new InternalServerErrorException('Failed to generate embedding.');
    }
  }

  async callAgent(prompt: string, context?: any): Promise<string> {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ];

      if (context) {
        messages.splice(1, 0, { role: 'system', content: `Context: ${JSON.stringify(context)}` });
      }

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0].message?.content || '';
    } catch (error) {
      console.error('Error calling AI agent:', error);
      throw new InternalServerErrorException('Failed to call AI agent.');
    }
  }

  async streamChat(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      signal?: AbortSignal;
      tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
    }
  ): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    try {
      return await this.openai.chat.completions.create(
        {
          model: options?.model ?? this.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
          stream: true,
          tools: options?.tools,
          tool_choice: options?.tools && options.tools.length > 0 ? 'auto' : undefined,
        },
        options?.signal ? { signal: options.signal } : undefined,
      );
    } catch (error) {
      console.error('Error streaming AI agent:', error);
      throw new InternalServerErrorException('Failed to stream AI agent.');
    }
  }
}
