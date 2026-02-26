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

  it('normalizes claude baseURL to include /v1 when custom endpoint misses version segment', async () => {
    const createLanguageModelSpy = jest
      .spyOn(AiSdkProviderFactory.prototype, 'createLanguageModel')
      .mockReturnValue({} as never);

    mockedStreamText.mockReturnValue({
      fullStream: createTextStream([{ type: 'finish', finishReason: 'stop' }]),
    } as never);

    const service = await createService({
      NODE_ENV: 'test',
      LLM_PROVIDER: 'claude',
      LLM_MODEL: 'glm-4.7-flash',
      ANTHROPIC_API_KEY: 'anthropic-test-key',
      ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
    });

    const stream = await service.streamChat([{ role: 'user', content: 'hello' }]);
    for await (const _chunk of stream) {
      // consume stream
    }

    expect(createLanguageModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'claude',
        model: 'glm-4.7-flash',
        baseURL: 'https://api.z.ai/api/anthropic/v1',
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

  it('uses provider-specific credentials when request overrides provider', async () => {
    const createLanguageModelSpy = jest
      .spyOn(AiSdkProviderFactory.prototype, 'createLanguageModel')
      .mockReturnValue({} as never);

    mockedStreamText.mockReturnValue({
      fullStream: createTextStream([{ type: 'finish', finishReason: 'stop' }]),
    } as never);

    const service = await createService({
      NODE_ENV: 'test',
      LLM_PROVIDER: 'claude',
      LLM_MODEL: 'claude-3-5-haiku-latest',
      ANTHROPIC_API_KEY: 'anthropic-test-key',
      OPENAI_API_KEY: 'openai-test-key',
      OPENAI_BASE_URL: 'https://api.openai-proxy.local/v1',
    });

    const stream = await service.streamChat([{ role: 'user', content: 'hello' }], {
      llm: {
        provider: 'openai',
        model: 'gpt-4.1-mini',
      },
    });
    for await (const _chunk of stream) {
      // consume stream
    }

    expect(createLanguageModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        model: 'gpt-4.1-mini',
        apiKey: 'openai-test-key',
        baseURL: 'https://api.openai-proxy.local/v1',
      }),
    );
  });

  it('uses provider-key credentials when providerKey is specified', async () => {
    const createLanguageModelSpy = jest
      .spyOn(AiSdkProviderFactory.prototype, 'createLanguageModel')
      .mockReturnValue({} as never);

    mockedStreamText.mockReturnValue({
      fullStream: createTextStream([{ type: 'finish', finishReason: 'stop' }]),
    } as never);

    const service = await createService({
      NODE_ENV: 'test',
      LLM_PROVIDER: 'openai-compatible',
      LLM_MODEL: 'glm-4.5-air',
      OPENAI_API_KEY: 'global-openai-key',
      OPENAI_BASE_URL: 'https://global.example/v1',
      AGENT_LLM_PROVIDER_ZHIPU_PROXY_API_KEY: 'zhipu-key',
      AGENT_LLM_PROVIDER_ZHIPU_PROXY_BASE_URL: 'https://zhipu-proxy.example/v1',
    });

    const stream = await service.streamChat([{ role: 'user', content: 'hello' }], {
      llm: {
        provider: 'openai-compatible',
        providerKey: 'zhipu_proxy',
        model: 'glm-4.5',
      },
    });
    for await (const _chunk of stream) {
      // consume stream
    }

    expect(createLanguageModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai-compatible',
        providerKey: 'zhipu_proxy',
        model: 'glm-4.5',
        apiKey: 'zhipu-key',
        baseURL: 'https://zhipu-proxy.example/v1',
      }),
    );
  });

  it('requires provider-key api key for custom providerKey', async () => {
    const service = await createService({
      NODE_ENV: 'test',
      LLM_PROVIDER: 'openai-compatible',
      LLM_MODEL: 'glm-4.5-air',
      OPENAI_API_KEY: 'global-openai-key',
      OPENAI_BASE_URL: 'https://global.example/v1',
    });

    await expect(
      service.streamChat([{ role: 'user', content: 'hello' }], {
        llm: {
          provider: 'openai-compatible',
          providerKey: 'zhipu_proxy',
          model: 'glm-4.5',
        },
      }),
    ).rejects.toMatchObject<LlmConfigurationError>({
      code: 'llm_provider_not_configured',
    });
  });

  it('prefers request-level baseURL when provided', async () => {
    const createLanguageModelSpy = jest
      .spyOn(AiSdkProviderFactory.prototype, 'createLanguageModel')
      .mockReturnValue({} as never);

    mockedStreamText.mockReturnValue({
      fullStream: createTextStream([{ type: 'finish', finishReason: 'stop' }]),
    } as never);

    const service = await createService({
      NODE_ENV: 'test',
      LLM_PROVIDER: 'openai-compatible',
      LLM_MODEL: 'glm-4.5-air',
      OPENAI_API_KEY: 'global-openai-key',
      OPENAI_BASE_URL: 'https://global.example/v1',
    });

    const stream = await service.streamChat([{ role: 'user', content: 'hello' }], {
      llm: {
        provider: 'openai-compatible',
        model: 'glm-4.5',
        baseURL: 'https://catalog-config.example/v1',
      },
    });
    for await (const _chunk of stream) {
      // consume stream
    }

    expect(createLanguageModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai-compatible',
        model: 'glm-4.5',
        baseURL: 'https://catalog-config.example/v1',
      }),
    );
  });

  it('filters reasoning-delta and only emits visible text content', async () => {
    jest
      .spyOn(AiSdkProviderFactory.prototype, 'createLanguageModel')
      .mockReturnValue({} as never);

    mockedStreamText.mockReturnValue({
      fullStream: createTextStream([
        { type: 'text-delta', text: 'A' },
        { type: 'reasoning-delta', text: 'internal reasoning' },
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

    const stream = await service.streamChat([{ role: 'user', content: 'hello' }]);

    const chunks: Array<Record<string, unknown>> = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Record<string, unknown>);
    }

    expect(chunks).toHaveLength(3);

    const visibleContents = chunks
      .map((chunk) => (chunk.choices as Array<{ delta?: { content?: string } }>)?.[0]?.delta?.content)
      .filter((content): content is string => typeof content === 'string');

    expect(visibleContents).toEqual(['A', 'B']);
    expect(JSON.stringify(chunks)).not.toContain('internal reasoning');
    expect(
      (chunks[2].choices as Array<{ finish_reason?: string }>)?.[0]?.finish_reason,
    ).toBe('stop');
  });

  it('includes reasoning-delta as <think> block when includeReasoning is enabled', async () => {
    jest
      .spyOn(AiSdkProviderFactory.prototype, 'createLanguageModel')
      .mockReturnValue({} as never);

    mockedStreamText.mockReturnValue({
      fullStream: createTextStream([
        { type: 'text-delta', text: 'A' },
        { type: 'reasoning-delta', text: 'internal reasoning' },
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

    const stream = await service.streamChat([{ role: 'user', content: 'hello' }], {
      includeReasoning: true,
    });

    const chunks: Array<Record<string, unknown>> = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Record<string, unknown>);
    }

    const visibleContents = chunks
      .map((chunk) => (chunk.choices as Array<{ delta?: { content?: string } }>)?.[0]?.delta?.content)
      .filter((content): content is string => typeof content === 'string');

    expect(visibleContents).toEqual(['A', '<think>internal reasoning', '</think>', 'B']);
    expect(chunks[1].__reasoning).toBe(true);
    expect(chunks[2].__reasoning).toBe(true);
    expect(
      (chunks[4].choices as Array<{ finish_reason?: string }>)?.[0]?.finish_reason,
    ).toBe('stop');
  });

  it('retries stream when first attempt fails with rate-limit before output', async () => {
    jest
      .spyOn(AiSdkProviderFactory.prototype, 'createLanguageModel')
      .mockReturnValue({} as never);

    mockedStreamText
      .mockReturnValueOnce({
        fullStream: createTextStream([
          { type: 'error', error: new Error('Rate limit reached for requests') },
        ]),
      } as never)
      .mockReturnValueOnce({
        fullStream: createTextStream([
          { type: 'text-delta', text: '重试成功' },
          { type: 'finish', finishReason: 'stop' },
        ]),
      } as never);

    const service = await createService({
      NODE_ENV: 'test',
      LLM_PROVIDER: 'claude',
      LLM_MODEL: 'glm-4.7-flash',
      ANTHROPIC_API_KEY: 'anthropic-test-key',
      ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic/v1',
    });

    const stream = await service.streamChat([{ role: 'user', content: 'hello' }]);
    const chunks: Array<Record<string, unknown>> = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Record<string, unknown>);
    }

    const visibleContents = chunks
      .map((chunk) => (chunk.choices as Array<{ delta?: { content?: string } }>)?.[0]?.delta?.content)
      .filter((content): content is string => typeof content === 'string');

    expect(visibleContents).toEqual(['重试成功']);
    expect(mockedStreamText).toHaveBeenCalledTimes(2);
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

    mockedStreamText.mockReturnValue({
      fullStream: createTextStream([{ type: 'error', error: new Error('network failed') }]),
    } as never);

    const service = await createService({
      NODE_ENV: 'test',
      LLM_PROVIDER: 'openai',
      LLM_MODEL: 'gpt-4.1-mini',
      LLM_API_KEY: 'openai-test-key',
    });

    const stream = await service.streamChat([{ role: 'user', content: 'hello' }]);

    const consume = async () => {
      for await (const _chunk of stream) {
        // consume stream
      }
    };

    await expect(consume()).rejects.toBeInstanceOf(LlmCallError);
  });
});
