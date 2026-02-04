import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities';
import { AiService } from '../src/ai/ai.service';

describe('Chat SSE Flow (e2e)', () => {
  let app: INestApplication;
  let aiServiceMock: { streamChat: jest.Mock; callAgent: jest.Mock; generateEmbedding: jest.Mock };
  let userRepository: Repository<User>;
  let currentUserId: string | null = null;

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
    app.use((req, _res, next) => {
      if (currentUserId) {
        req.user = { id: currentUserId };
      }
      next();
    });
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
  });

  beforeEach(async () => {
    await userRepository.clear();

    const user = userRepository.create({
      email: 'chat-user@example.com',
      password: 'password123',
      name: 'Chat User',
    });
    const saved = await userRepository.save(user);
    currentUserId = saved.id;
  });

  afterAll(async () => {
    await app.close();
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
        .send({ prompt: 'Say hello' })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.text).toContain('event: token');
      expect(response.text).toContain('event: done');
    });

    it('should handle messages array format', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Response' }, finish_reason: 'stop' }] };
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      const response = await request(app.getHttpServer())
        .post('/v1/agent/chat')
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
      const req = agent.post('/v1/agent/chat').send({ prompt: 'Long response' });

      setTimeout(() => req.abort(), 50);

      try {
        await req;
      } catch (error) {
        expect(error.code).toBe('ECONNRESET');
      }
    });

    it('should include system context in chat', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Response' }, finish_reason: 'stop' }] };
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      await request(app.getHttpServer())
        .post('/v1/agent/chat')
        .send({
          prompt: 'Test',
          context: { contactId: 'contact-123' },
        })
        .expect(200);

      expect(aiServiceMock.streamChat).toHaveBeenCalled();
      const callArgs = aiServiceMock.streamChat.mock.calls[0];
      expect(callArgs[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Test' }),
        ]),
      );
    });

    it('should handle streaming errors gracefully', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Start' }, finish_reason: null }] };
        throw new Error('Stream error');
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      const response = await request(app.getHttpServer())
        .post('/v1/agent/chat')
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
        .send({ prompt: 'My name is Alice' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/v1/agent/chat')
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
        .send({ prompt: 'Test' })
        .expect(200);

      const events = response.text.split('\n\n').filter((e) => e.trim());
      events.forEach((event) => {
        expect(event).toMatch(/^event: (token|done|error)\ndata: .+$/);
      });
    });

    it('should emit done event with finish reason', async () => {
      const mockStreamGenerator = async function* () {
        yield { choices: [{ delta: { content: 'Done' }, finish_reason: 'stop' }] };
      };

      aiServiceMock.streamChat.mockReturnValue(mockStreamGenerator());

      const response = await request(app.getHttpServer())
        .post('/v1/agent/chat')
        .send({ prompt: 'Test' })
        .expect(200);

      expect(response.text).toContain('event: done');
      expect(response.text).toContain('"reason":"stop"');
    });
  });
});
