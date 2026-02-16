import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import fs from 'fs';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;
  const mockProvider = {
    name: 'openai-compatible',
    generateEmbedding: jest.fn(),
    generateText: jest.fn(),
    streamChat: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'LLM_API_KEY') return 'test-api-key';
              if (key === 'LLM_MODEL') return 'gpt-4.1-mini';
              if (key === 'LLM_EMBEDDING_MODEL') return 'text-embedding-ada-002';
              if (key === 'NODE_ENV') return 'test';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    (service as any).provider = mockProvider;

    mockProvider.generateEmbedding.mockReset();
    mockProvider.generateText.mockReset();
    mockProvider.streamChat.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw when LLM_API_KEY is missing', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const prevLlmApiKey = process.env.LLM_API_KEY;
    const prevOpenAiKey = process.env.OPENAI_API_KEY;
    delete process.env.LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;

    await expect(
      Test.createTestingModule({
        providers: [
          AiService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'NODE_ENV') return 'test';
                return null;
              }),
            },
          },
        ],
      }).compile(),
    ).rejects.toThrow(InternalServerErrorException);

    if (prevLlmApiKey !== undefined) {
      process.env.LLM_API_KEY = prevLlmApiKey;
    }
    if (prevOpenAiKey !== undefined) {
      process.env.OPENAI_API_KEY = prevOpenAiKey;
    }
  });

  describe('generateEmbedding', () => {
    it('delegates to provider', async () => {
      mockProvider.generateEmbedding.mockResolvedValueOnce([0.1, 0.2]);

      const embedding = await service.generateEmbedding('hello');
      expect(mockProvider.generateEmbedding).toHaveBeenCalledWith('hello');
      expect(embedding).toEqual([0.1, 0.2]);
    });

    it('throws InternalServerErrorException on provider failure', async () => {
      mockProvider.generateEmbedding.mockRejectedValueOnce(new Error('boom'));
      await expect(service.generateEmbedding('hello')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('callAgent', () => {
    it('delegates to provider.generateText', async () => {
      mockProvider.generateText.mockResolvedValueOnce('ok');

      const result = await service.callAgent('hello');
      expect(result).toBe('ok');
      expect(mockProvider.generateText).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'hello' },
        ],
        expect.objectContaining({
          model: 'gpt-4.1-mini',
          temperature: 0.7,
          maxTokens: 500,
        }),
      );
    });

    it('includes context when provided', async () => {
      mockProvider.generateText.mockResolvedValueOnce('ok');
      await service.callAgent('hello', { key: 'value' });

      const args = mockProvider.generateText.mock.calls[0][0];
      expect(args).toEqual(
        expect.arrayContaining([
          { role: 'system', content: 'Context: {"key":"value"}' },
        ]),
      );
    });
  });
});
