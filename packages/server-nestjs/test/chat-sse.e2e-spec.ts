import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { Conversation } from '../src/entities';
import { AiService } from '../src/ai/ai.service';
import { cleanupDatabase } from './db-cleanup';

describe('Chat SSE Flow (e2e)', () => {
  let app: INestApplication;
  let aiServiceMock: { streamChat: jest.Mock; callAgent: jest.Mock; generateEmbedding: jest.Mock };
  let conversationRepository: Repository<Conversation>;
  let dataSource: DataSource;
  let currentUserId: string;
  let authHeader: { Authorization: string };
  let conversationId: string;

  beforeAll(async () => {
    aiServiceMock = {
      streamChat: jest.fn(),
      callAgent: jest.fn(),
      generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiService)
      .useValue(aiServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();

    conversationRepository = moduleFixture.get<Repository<Conversation>>(getRepositoryToken(Conversation));
    dataSource = moduleFixture.get(DataSource);
  });

  beforeEach(async () => {
    await cleanupDatabase(dataSource);
    jest.clearAllMocks();

    const registerResponse = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: `chat-user-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
        password: 'password123',
        name: 'Chat User',
      })
      .expect(200);

    currentUserId = registerResponse.body.user.id as string;
    authHeader = { Authorization: `Bearer ${registerResponse.body.accessToken as string}` };

    const conversation = conversationRepository.create({
      title: 'Chat Conversation',
      content: '',
      userId: currentUserId,
    });
    const savedConversation = await conversationRepository.save(conversation);
    conversationId = savedConversation.id;
  });

  afterAll(async () => {
    if (!app) {
      return;
    }
    try {
      await app.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('Nest could not find DataSource element')) {
        throw error;
      }
    }
  });

  describe('POST /v1/agent/chat - SSE streaming', () => {
    it('should stream chat responses via SSE', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Hello' }, finish_reason: null }] };
        yield { choices: [{ delta: { content: ' world' }, finish_reason: null }] };
        yield { choices: [{ delta: { content: '!' }, finish_reason: 'stop' }] };
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      const response = await request(app.getHttpServer())
        .post('/v1/agent/chat')
        .set(authHeader)
        .send({ prompt: 'Say hello' })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.text).toContain('event: agent.start');
      expect(response.text).toContain('event: agent.end');
    });

    it('should persist user and assistant messages', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Persisted' }, finish_reason: 'stop' }] };
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      await request(app.getHttpServer())
        .post('/v1/agent/chat')
        .set(authHeader)
        .send({ prompt: 'Persist me', conversationId })
        .expect(200);

      const messagesResponse = await request(app.getHttpServer())
        .get(`/v1/conversations/${conversationId}/messages`)
        .set(authHeader)
        .expect(200);

      expect(messagesResponse.body.length).toBeGreaterThanOrEqual(2);
      const roles = messagesResponse.body.map((item: { role: string }) => item.role);
      expect(roles).toContain('user');
      expect(roles).toContain('assistant');
    });

    it('should handle messages array format', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Response' }, finish_reason: 'stop' }] };
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      const response = await request(app.getHttpServer())
        .post('/v1/agent/chat')
        .set(authHeader)
        .send({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'How are you?' },
          ],
        })
        .expect(200);

      expect(aiServiceMock.streamChat).toHaveBeenCalled();
      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    it('should handle connection abort gracefully', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Start' }, finish_reason: null }] };
        await new Promise((resolve) => setTimeout(resolve, 100));
        yield { choices: [{ delta: { content: 'End' }, finish_reason: 'stop' }] };
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      const agent = request.agent(app.getHttpServer());
      const req = agent.post('/v1/agent/chat').set(authHeader).send({ prompt: 'Long response' });

      setTimeout(() => req.abort(), 50);

      try {
        await req;
      } catch (error) {
        expect(['ECONNRESET', 'ABORTED']).toContain(error.code);
      }
    });

    it('should include system context in chat', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Response' }, finish_reason: 'stop' }] };
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      await request(app.getHttpServer())
        .post('/v1/agent/chat')
        .set(authHeader)
        .send({
          prompt: 'Test',
          context: { contactId: 'contact-123' },
        })
        .expect(200);

      expect(aiServiceMock.streamChat).toHaveBeenCalled();
      const callArgs = aiServiceMock.streamChat.mock.calls[aiServiceMock.streamChat.mock.calls.length - 1];
      expect(callArgs[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Test' }),
        ]),
      );
    });

    it('should support vercel-ai stream protocol format', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Hello' }, finish_reason: null }] };
        yield { choices: [{ delta: {}, finish_reason: 'stop' }] };
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      const response = await request(app.getHttpServer())
        .post('/v1/agent/chat?format=vercel-ai')
        .set(authHeader)
        .send({ prompt: 'Say hello' })
        .expect(200);

      expect(response.headers['x-vercel-ai-data-stream']).toBe('v1');
      expect(response.text).toContain('0:"Hello"');
      expect(response.text).toContain('d:{"finishReason":"stop"}');
    });

    it('should handle streaming errors gracefully', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Start' }, finish_reason: null }] };
        throw new Error('Stream error');
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      const response = await request(app.getHttpServer())
        .post('/v1/agent/chat')
        .set(authHeader)
        .send({ prompt: 'Trigger error' });

      expect(response.text).toContain('event: error');
    });
  });

  describe('Chat with tool calls', () => {
    it('should handle tool calls in streaming response', async () => {
      const mockStreamGenerator = async function* () {
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    id: 'tool_123',
                    type: 'function',
                    function: { name: 'get_weather', arguments: '{"location":"NYC"}' },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
        };
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      const response = await request(app.getHttpServer())
        .post('/v1/agent/chat')
        .set(authHeader)
        .send({ prompt: 'What is the weather in NYC?' })
        .expect(200);

      expect(response.text).toBeDefined();
    });
  });

  describe('Multi-turn conversation flow', () => {
    it('should maintain conversation context across turns', async () => {
      const mockStreamGenerator1 = async function* () {
        yield { choices: [{ delta: { content: 'My name is Alice' }, finish_reason: 'stop' }] };
      };

      const mockStreamGenerator2 = async function* () {
        yield { choices: [{ delta: { content: 'Your name is Alice' }, finish_reason: 'stop' }] };
      };

      aiServiceMock.streamChat
        .mockReturnValueOnce(mockStreamGenerator1())
        .mockReturnValueOnce(mockStreamGenerator2());

      await request(app.getHttpServer())
        .post('/v1/agent/chat')
        .set(authHeader)
        .send({ prompt: 'My name is Alice' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/v1/agent/chat')
        .set(authHeader)
        .send({
          messages: [
            { role: 'user', content: 'My name is Alice' },
            { role: 'assistant', content: 'My name is Alice' },
            { role: 'user', content: 'What is my name?' },
          ],
        })
        .expect(200);

      expect(aiServiceMock.streamChat).toHaveBeenCalledTimes(2);
    });
  });

  describe('SSE event format validation', () => {
    it('should emit properly formatted SSE events', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Test' }, finish_reason: null }] };
        yield { choices: [{ delta: { content: '' }, finish_reason: 'stop' }] };
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      const response = await request(app.getHttpServer())
        .post('/v1/agent/chat')
        .set(authHeader)
        .send({ prompt: 'Test' })
        .expect(200);

      const events = response.text.split('\n\n').filter((e) => e.trim());
      events.forEach((event) => {
        expect(event).toMatch(
          /^event: (agent\.start|agent\.delta|agent\.message|tool\.state|context\.patch|agent\.end|error|ping)\ndata: .+$/
        );
      });
    });

    it('should emit done event with finish reason', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Done' }, finish_reason: 'stop' }] };
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      const response = await request(app.getHttpServer())
        .post('/v1/agent/chat')
        .set(authHeader)
        .send({ prompt: 'Test' })
        .expect(200);

      expect(response.text).toContain('event: agent.end');
      expect(response.text).toContain('"status":"succeeded"');
    });
  });
});
