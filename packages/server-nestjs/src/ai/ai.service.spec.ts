import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { embed, generateText, streamText } from 'ai';
import fs from 'fs';
import { AiService } from './ai.service';
import { AiSdkProviderFactory } from './providers/ai-sdk-provider.factory';
import { LlmCallError, LlmConfigurationError } from './providers/llm-config.types';
import type { LlmMessage } from './providers/llm-types';

jest.mock('ai', () => ({
  embed: jest.fn(),
  generateText: jest.fn(),
  streamText: jest.fn(),
  jsonSchema: jest.fn((schema: unknown) => schema),
  tool: jest.fn((definition: unknown) => definition),
}));

type ConfigMap = Record<string, string | undefined>;

const mockedEmbed = jest.mocked(embed);
const mockedGenerateText = jest.mocked(generateText);
const mockedStreamText = jest.mocked(streamText);

describe('AiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function createService(configValues: ConfigMap): Promise<AiService> {
    const configService: Partial<ConfigService> = {
      get: jest.fn((key: string) => configValues[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    return module.get<AiService>(AiService);
  }

  function createTextStream(parts: unknown[]): AsyncIterable<unknown> {
    return (async function* streamGenerator() {
      for (const part of parts) {
        yield part;
      }
    })();
  }

  it('uses default provider/model from config', async () => {
    const createLanguageModelSpy = jest
      .spyOn(AiSdkProviderFactory.prototype, 'createLanguageModel')
      .mockReturnValue({} as never);

    mockedGenerateText.mockResolvedValue({
      text: 'ok',
    } as never);

    const service = await createService({
      NODE_ENV: 'test',
      LLM_PROVIDER: 'openai',
      LLM_MODEL: 'gpt-4.1-mini',
      LLM_API_KEY: 'openai-test-key',
    });

    const result = await service.callAgent('hello');

    expect(result).toBe('ok');
    expect(createLanguageModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        model: 'gpt-4.1-mini',
      }),
    );
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 500,
        temperature: 0.7,
      }),
    );
  });

  it('supports request-level llm override and providerOptions alias normalization', async () => {
    const createLanguageModelSpy = jest
      .spyOn(AiSdkProviderFactory.prototype, 'createLanguageModel')
      .mockReturnValue({} as never);

    mockedStreamText.mockReturnValue({
      fullStream: createTextStream([
        { type: 'text-delta', text: 'A' },
        { type: 'text-delta', text: 'B' },
        { type: 'finish', finishReason: 'stop' },
      ]),
    } as never);

    const service = await createService({
      NODE_ENV: 'test',
      LLM_PROVIDER: 'openai',
      LLM_MODEL: 'gpt-4.1-mini',
      LLM_API_KEY: 'openai-test-key',
    });

    const messages: LlmMessage[] = [{ role: 'user', content: 'hello' }];
    const stream = await service.streamChat(messages, {
      llm: {
        provider: 'claude',
        model: 'claude-3-7-sonnet',
        providerOptions: {
          claude: { thinking: { type: 'enabled', budgetTokens: 512 } },
          gemini: { safetySettings: [{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }] },
          'openai-compatible': { foo: 'bar' },
        },
      },
    });

    const chunks: unknown[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(3);
    expect(createLanguageModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'claude',
        model: 'claude-3-7-sonnet',
        providerOptions: {
          anthropic: { thinking: { type: 'enabled', budgetTokens: 512 } },
          google: { safetySettings: [{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }] },
          openaiCompatible: { foo: 'bar' },
        },
      }),
    );
    expect(mockedStreamText).toHaveBeenCalled();
  });

  it('uses independent embedding provider config', async () => {
    const createEmbeddingModelSpy = jest
      .spyOn(AiSdkProviderFactory.prototype, 'createEmbeddingModel')
      .mockReturnValue({} as never);

    mockedEmbed.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
    } as never);

    const service = await createService({
      NODE_ENV: 'test',
      LLM_PROVIDER: 'openai',
      LLM_MODEL: 'gpt-4.1-mini',
      LLM_API_KEY: 'openai-test-key',
      LLM_EMBEDDING_PROVIDER: 'gemini',
      LLM_EMBEDDING_MODEL: 'text-embedding-004',
      GOOGLE_GENERATIVE_AI_API_KEY: 'google-test-key',
    });

    const embedding = await service.generateEmbedding('hello');

    expect(embedding).toEqual([0.1, 0.2, 0.3]);
    expect(createEmbeddingModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'gemini',
        model: 'text-embedding-004',
      }),
    );
  });

  it('throws llm_provider_not_configured when provider key is missing', async () => {
    const previousLlmApiKey = process.env.LLM_API_KEY;
    const previousOpenAiApiKey = process.env.OPENAI_API_KEY;
    delete process.env.LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const service = await createService({
        NODE_ENV: 'test',
        LLM_PROVIDER: 'openai',
        LLM_MODEL: 'gpt-4.1-mini',
      });

      await expect(service.callAgent('hello')).rejects.toMatchObject<LlmConfigurationError>({
        code: 'llm_provider_not_configured',
      });
    } finally {
      if (previousLlmApiKey !== undefined) {
        process.env.LLM_API_KEY = previousLlmApiKey;
      }
      if (previousOpenAiApiKey !== undefined) {
        process.env.OPENAI_API_KEY = previousOpenAiApiKey;
      }
    }
  });

  it('throws llm_call_failed when streamText throws unknown error', async () => {
    jest
      .spyOn(AiSdkProviderFactory.prototype, 'createLanguageModel')
      .mockReturnValue({} as never);

    mockedStreamText.mockImplementation(() => {
      throw new Error('network failed');
    });

    const service = await createService({
      NODE_ENV: 'test',
      LLM_PROVIDER: 'openai',
      LLM_MODEL: 'gpt-4.1-mini',
      LLM_API_KEY: 'openai-test-key',
    });

    await expect(service.streamChat([{ role: 'user', content: 'hello' }])).rejects.toBeInstanceOf(LlmCallError);
  });
});
