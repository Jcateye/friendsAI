import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import fs from 'fs';

// Mock OpenAI client
const mockOpenAI = {
  embeddings: {
    create: jest.fn(),
  },
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

describe('AiService', () => {
  let service: AiService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENAI_API_KEY') {
                return 'test-api-key';
              }
              if (key === 'OPENAI_MODEL') {
                return 'gpt-5.1-mini';
              }
              if (key === 'OPENAI_EMBEDDING_MODEL') {
                return 'text-embedding-ada-002';
              }
              if (key === 'NODE_ENV') {
                return 'test';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks before each test
    mockOpenAI.embeddings.create.mockReset();
    mockOpenAI.chat.completions.create.mockReset();

    // Directly assign mockOpenAI to the service's private openai property
    // This is a hack for testing private properties, usually preferable to inject it if possible
    (service as any)['openai'] = mockOpenAI;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw InternalServerErrorException if OPENAI_API_KEY is not configured', async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    await expect(
      Test.createTestingModule({
        providers: [
          AiService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'NODE_ENV') {
                  return 'test';
                }
                return null;
              }),
            },
          },
        ],
      }).compile(),
    ).rejects.toThrow(InternalServerErrorException);

    if (originalApiKey !== undefined) {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });


  describe('generateEmbedding', () => {
    it('should return an embedding for a given text', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockOpenAI.embeddings.create.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
      });

      const text = 'test text';
      const embedding = await service.generateEmbedding(text);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-ada-002',
        input: text,
      });
      expect(embedding).toEqual(mockEmbedding);
    });

    it('should throw InternalServerErrorException on embedding generation failure', async () => {
      mockOpenAI.embeddings.create.mockRejectedValueOnce(new Error('API error'));

      const text = 'test text';
      await expect(service.generateEmbedding(text)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('callAgent', () => {
    it('should return a response from the AI agent', async () => {
      const mockAgentResponse = 'Hello from AI';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: mockAgentResponse } }],
      });

      const prompt = 'What is NestJS?';
      const response = await service.callAgent(prompt);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-5.1-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
      expect(response).toEqual(mockAgentResponse);
    });

    it('should include context in the AI agent call', async () => {
      const mockAgentResponse = 'Response with context';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: mockAgentResponse } }],
      });

      const prompt = 'Summarize this';
      const context = { key: 'value' };
      await service.callAgent(prompt, context);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'system', content: `Context: ${JSON.stringify(context)}` },
            { role: 'user', content: prompt },
          ]),
        }),
      );
    });

    it('should throw InternalServerErrorException on AI agent call failure', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API error'));

      const prompt = 'Fail this call';
      await expect(service.callAgent(prompt)).rejects.toThrow(InternalServerErrorException);
    });

    it('should return empty string if AI agent returns no content', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: null }], // No content
      });

      const prompt = 'No content';
      const response = await service.callAgent(prompt);
      expect(response).toEqual('');
    });
  });
});
