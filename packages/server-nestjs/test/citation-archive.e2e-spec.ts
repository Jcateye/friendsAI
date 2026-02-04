import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { User, Contact, Conversation } from '../src/entities';
import { AiService } from '../src/ai/ai.service';

describe('Citation and Archive Features (e2e)', () => {
  let app: INestApplication;
  let aiServiceMock: { callAgent: jest.Mock; generateEmbedding: jest.Mock };
  let userRepository: Repository<User>;
  let contactRepository: Repository<Contact>;
  let conversationRepository: Repository<Conversation>;
  let currentUserId: string | null = null;

  beforeAll(async () => {
    aiServiceMock = {
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
    contactRepository = moduleFixture.get<Repository<Contact>>(getRepositoryToken(Contact));
    conversationRepository = moduleFixture.get<Repository<Conversation>>(
      getRepositoryToken(Conversation),
    );
  });

  beforeEach(async () => {
    await conversationRepository.clear();
    await contactRepository.clear();
    await userRepository.clear();

    const user = userRepository.create({
      email: 'citation-user@example.com',
      password: 'password123',
      name: 'Citation User',
    });
    const saved = await userRepository.save(user);
    currentUserId = saved.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('引用高亮功能', () => {
    describe('POST /v1/chat/messages - 创建带引用的消息', () => {
      it('应该创建包含引用范围的聊天消息', async () => {
        const response = await request(app.getHttpServer())
          .post('/v1/chat/messages')
          .send({
            conversationId: 'conv-123',
            content: '根据我们上次讨论的项目进度，下周三需要完成开发任务',
            role: 'assistant',
            citations: [
              {
                id: 'cite-1',
                start: 3,
                end: 15,
                targetId: 'msg-previous-1',
              },
            ],
          })
          .expect(201);

        expect(response.body.id).toBeDefined();
        expect(response.body.content).toBe('根据我们上次讨论的项目进度，下周三需要完成开发任务');
        expect(response.body.citations).toBeDefined();
        expect(response.body.citations).toHaveLength(1);
        expect(response.body.citations[0]).toEqual({
          id: 'cite-1',
          start: 3,
          end: 15,
          targetId: 'msg-previous-1',
        });
      });

      it('应该支持多个引用范围', async () => {
        const response = await request(app.getHttpServer())
          .post('/v1/chat/messages')
          .send({
            conversationId: 'conv-456',
            content: 'Alice 提到的技术方案和 Bob 建议的时间安排都很合理',
            role: 'assistant',
            citations: [
              {
                id: 'cite-1',
                start: 0,
                end: 5,
                targetId: 'contact-alice',
              },
              {
                id: 'cite-2',
                start: 8,
                end: 12,
                targetId: 'msg-tech-proposal',
              },
              {
                id: 'cite-3',
                start: 14,
                end: 17,
                targetId: 'contact-bob',
              },
              {
                id: 'cite-4',
                start: 20,
                end: 25,
                targetId: 'msg-schedule',
              },
            ],
          })
          .expect(201);

        expect(response.body.citations).toHaveLength(4);
      });

      it('应该验证引用范围的有效性', async () => {
        const response = await request(app.getHttpServer())
          .post('/v1/chat/messages')
          .send({
            conversationId: 'conv-789',
            content: '测试消息',
            role: 'assistant',
            citations: [
              {
                id: 'cite-invalid',
                start: 100, // 超出内容长度
                end: 200,
                targetId: 'target-1',
              },
            ],
          })
          .expect(400);

        expect(response.body.message).toContain('引用范围无效');
      });

      it('应该处理没有引用的普通消息', async () => {
        const response = await request(app.getHttpServer())
          .post('/v1/chat/messages')
          .send({
            conversationId: 'conv-normal',
            content: '这是一条普通消息',
            role: 'user',
          })
          .expect(201);

        expect(response.body.citations).toBeUndefined();
      });
    });

    describe('GET /v1/chat/messages/:id - 获取消息及引用', () => {
      it('应该返回消息的引用信息', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/v1/chat/messages')
          .send({
            conversationId: 'conv-get',
            content: '引用测试内容',
            role: 'assistant',
            citations: [
              {
                id: 'cite-get-1',
                start: 0,
                end: 4,
                targetId: 'target-abc',
              },
            ],
          })
          .expect(201);

        const messageId = createResponse.body.id;

        const getResponse = await request(app.getHttpServer())
          .get(`/v1/chat/messages/${messageId}`)
          .expect(200);

        expect(getResponse.body.citations).toBeDefined();
        expect(getResponse.body.citations[0].id).toBe('cite-get-1');
        expect(getResponse.body.citations[0].targetId).toBe('target-abc');
      });
    });

    describe('GET /v1/chat/conversations/:id/messages - 获取对话中的所有消息', () => {
      it('应该返回对话中所有消息及其引用', async () => {
        const conversationId = 'conv-all-messages';

        await request(app.getHttpServer())
          .post('/v1/chat/messages')
          .send({
            conversationId,
            content: '第一条消息',
            role: 'user',
          })
          .expect(201);

        await request(app.getHttpServer())
          .post('/v1/chat/messages')
          .send({
            conversationId,
            content: '第二条消息，引用了第一条',
            role: 'assistant',
            citations: [
              {
                id: 'cite-ref-1',
                start: 8,
                end: 11,
                targetId: 'msg-1',
              },
            ],
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .get(`/v1/chat/conversations/${conversationId}/messages`)
          .expect(200);

        expect(response.body.length).toBe(2);
        expect(response.body[1].citations).toBeDefined();
      });
    });
  });

  describe('归档功能', () => {
    describe('POST /v1/conversations/:id/archive - 归档对话', () => {
      it('应该将对话标记为归档并提取结构化信息', async () => {
        const contact = await contactRepository.save(
          contactRepository.create({
            name: 'Alice Wang',
            email: 'alice@example.com',
            userId: currentUserId,
          }),
        );

        const conversation = await conversationRepository.save(
          conversationRepository.create({
            content: '和 Alice 讨论了新项目的技术方案，决定下周三开会评审',
            userId: currentUserId,
          }),
        );

        aiServiceMock.callAgent.mockResolvedValueOnce(
          JSON.stringify({
            recognizedPeople: [{ id: contact.id, name: 'Alice Wang' }],
            newEvents: [
              {
                type: 'meeting',
                title: '技术方案评审会',
                date: '2026-02-12',
                time: '14:00',
                participants: ['Alice Wang'],
              },
            ],
            extractedFacts: [
              {
                type: 'project_update',
                content: '新项目技术方案讨论',
                confidence: 0.95,
              },
            ],
            todoItems: [
              {
                content: '准备技术方案评审材料',
                suggestedDate: '2026-02-11',
                priority: 'high',
              },
            ],
          }),
        );

        const response = await request(app.getHttpServer())
          .post(`/v1/conversations/${conversation.id}/archive`)
          .expect(200);

        expect(response.body.status).toBe('archived');
        expect(response.body.archiveResult).toBeDefined();
        expect(response.body.archiveResult.recognizedPeople).toHaveLength(1);
        expect(response.body.archiveResult.newEvents).toHaveLength(1);
        expect(response.body.archiveResult.extractedFacts).toHaveLength(1);
        expect(response.body.archiveResult.todoItems).toHaveLength(1);
      });

      it('应该拒绝已归档对话的重复归档', async () => {
        const conversation = await conversationRepository.save(
          conversationRepository.create({
            content: '测试对话',
            userId: currentUserId,
            status: 'archived',
          }),
        );

        await request(app.getHttpServer())
          .post(`/v1/conversations/${conversation.id}/archive`)
          .expect(409);
      });
    });

    describe('GET /v1/conversations - 获取对话列表', () => {
      it('应该支持按状态过滤对话', async () => {
        await conversationRepository.save([
          conversationRepository.create({
            content: '待归档对话 1',
            userId: currentUserId,
            status: 'pending',
          }),
          conversationRepository.create({
            content: '待归档对话 2',
            userId: currentUserId,
            status: 'pending',
          }),
          conversationRepository.create({
            content: '已归档对话',
            userId: currentUserId,
            status: 'archived',
          }),
        ]);

        const pendingResponse = await request(app.getHttpServer())
          .get('/v1/conversations?status=pending')
          .expect(200);

        expect(pendingResponse.body.length).toBe(2);
        expect(pendingResponse.body.every((c: any) => c.status === 'pending')).toBe(true);

        const archivedResponse = await request(app.getHttpServer())
          .get('/v1/conversations?status=archived')
          .expect(200);

        expect(archivedResponse.body.length).toBe(1);
        expect(archivedResponse.body[0].status).toBe('archived');
      });

      it('应该支持按日期过滤对话', async () => {
        const today = new Date().toISOString().split('T')[0];

        await conversationRepository.save(
          conversationRepository.create({
            content: '今天的对话',
            userId: currentUserId,
            createdAt: new Date(),
          }),
        );

        const response = await request(app.getHttpServer())
          .get(`/v1/conversations?date=${today}`)
          .expect(200);

        expect(response.body.length).toBeGreaterThanOrEqual(1);
      });

      it('应该支持按关键词搜索对话', async () => {
        await conversationRepository.save([
          conversationRepository.create({
            content: '讨论项目进度和技术方案',
            userId: currentUserId,
          }),
          conversationRepository.create({
            content: '安排明天的会议',
            userId: currentUserId,
          }),
        ]);

        const response = await request(app.getHttpServer())
          .get('/v1/conversations?search=项目')
          .expect(200);

        expect(response.body.length).toBeGreaterThanOrEqual(1);
        expect(response.body[0].content).toContain('项目');
      });
    });

    describe('GET /v1/conversations/:id/archive-result - 获取归档结果', () => {
      it('应该返回对话的归档分析结果', async () => {
        const contact = await contactRepository.save(
          contactRepository.create({
            name: 'Bob Chen',
            email: 'bob@example.com',
            userId: currentUserId,
          }),
        );

        const archiveResult = {
          recognizedPeople: [{ id: contact.id, name: 'Bob Chen' }],
          newEvents: [
            {
              type: 'meeting',
              title: '产品评审',
              date: '2026-02-10',
            },
          ],
          extractedFacts: [],
          todoItems: [
            {
              content: '准备产品 Demo',
              suggestedDate: '2026-02-09',
              priority: 'medium',
            },
          ],
        };

        const conversation = await conversationRepository.save(
          conversationRepository.create({
            content: '和 Bob 讨论产品评审安排',
            userId: currentUserId,
            status: 'archived',
            archiveResult: archiveResult,
          }),
        );

        const response = await request(app.getHttpServer())
          .get(`/v1/conversations/${conversation.id}/archive-result`)
          .expect(200);

        expect(response.body.recognizedPeople).toHaveLength(1);
        expect(response.body.recognizedPeople[0].name).toBe('Bob Chen');
        expect(response.body.newEvents).toHaveLength(1);
        expect(response.body.todoItems).toHaveLength(1);
      });

      it('应该拒绝未归档对话的归档结果查询', async () => {
        const conversation = await conversationRepository.save(
          conversationRepository.create({
            content: '未归档对话',
            userId: currentUserId,
            status: 'pending',
          }),
        );

        await request(app.getHttpServer())
          .get(`/v1/conversations/${conversation.id}/archive-result`)
          .expect(400);
      });
    });

    describe('PATCH /v1/conversations/:id/archive-result - 编辑归档结果', () => {
      it('应该允许用户编辑归档结果', async () => {
        const archiveResult = {
          recognizedPeople: [],
          newEvents: [
            {
              type: 'meeting',
              title: '原始会议标题',
              date: '2026-02-10',
            },
          ],
          extractedFacts: [],
          todoItems: [],
        };

        const conversation = await conversationRepository.save(
          conversationRepository.create({
            content: '测试对话',
            userId: currentUserId,
            status: 'archived',
            archiveResult: archiveResult,
          }),
        );

        const response = await request(app.getHttpServer())
          .patch(`/v1/conversations/${conversation.id}/archive-result`)
          .send({
            newEvents: [
              {
                type: 'meeting',
                title: '修改后的会议标题',
                date: '2026-02-11',
                time: '15:00',
              },
            ],
          })
          .expect(200);

        expect(response.body.archiveResult.newEvents[0].title).toBe('修改后的会议标题');
        expect(response.body.archiveResult.newEvents[0].date).toBe('2026-02-11');
      });
    });

    describe('完整的归档工作流', () => {
      it('应该完成从创建对话到归档确认的完整流程', async () => {
        // 1. 创建联系人
        const contact = await contactRepository.save(
          contactRepository.create({
            name: 'Charlie Li',
            email: 'charlie@example.com',
            company: 'Tech Corp',
            userId: currentUserId,
          }),
        );

        // 2. 创建对话记录
        const createResponse = await request(app.getHttpServer())
          .post('/v1/conversations')
          .send({
            content: '和 Charlie 讨论了 Q2 季度规划，他提到团队需要扩招 3 人，下周五需要提交预算申请',
          })
          .expect(201);

        const conversationId = createResponse.body.id;
        expect(createResponse.body.status).toBe('pending');

        // 3. AI 分析并生成归档预览
        aiServiceMock.callAgent.mockResolvedValueOnce(
          JSON.stringify({
            recognizedPeople: [
              {
                id: contact.id,
                name: 'Charlie Li',
                company: 'Tech Corp',
              },
            ],
            newEvents: [
              {
                type: 'deadline',
                title: '提交预算申请',
                date: '2026-02-14',
                description: 'Q2 团队扩招预算',
              },
            ],
            extractedFacts: [
              {
                type: 'team_update',
                content: '团队计划扩招 3 人',
                relatedContact: contact.id,
                confidence: 0.92,
              },
              {
                type: 'project_info',
                content: 'Q2 季度规划讨论',
                relatedContact: contact.id,
                confidence: 0.88,
              },
            ],
            todoItems: [
              {
                content: '准备 Q2 团队扩招预算申请',
                suggestedDate: '2026-02-13',
                priority: 'high',
                assignee: 'me',
              },
            ],
          }),
        );

        const previewResponse = await request(app.getHttpServer())
          .get(`/v1/conversations/${conversationId}/archive-preview`)
          .expect(200);

        expect(previewResponse.body.recognizedPeople).toHaveLength(1);
        expect(previewResponse.body.newEvents).toHaveLength(1);
        expect(previewResponse.body.extractedFacts).toHaveLength(2);
        expect(previewResponse.body.todoItems).toHaveLength(1);

        // 4. 用户编辑归档结果（可选）
        const editedResult = {
          ...previewResponse.body,
          todoItems: [
            {
              content: '准备 Q2 团队扩招预算申请',
              suggestedDate: '2026-02-12', // 提前一天
              priority: 'urgent', // 提高优先级
              assignee: 'me',
            },
          ],
        };

        // 5. 确认归档
        const archiveResponse = await request(app.getHttpServer())
          .post(`/v1/conversations/${conversationId}/archive`)
          .send({ archiveResult: editedResult })
          .expect(200);

        expect(archiveResponse.body.status).toBe('archived');
        expect(archiveResponse.body.archiveResult.todoItems[0].priority).toBe('urgent');

        // 6. 验证归档后的数据
        const verifyResponse = await request(app.getHttpServer())
          .get(`/v1/conversations/${conversationId}`)
          .expect(200);

        expect(verifyResponse.body.status).toBe('archived');
        expect(verifyResponse.body.archiveResult).toBeDefined();

        // 7. 查询已归档对话列表
        const archivedListResponse = await request(app.getHttpServer())
          .get('/v1/conversations?status=archived')
          .expect(200);

        const archivedConversation = archivedListResponse.body.find(
          (c: any) => c.id === conversationId,
        );
        expect(archivedConversation).toBeDefined();
      });
    });
  });

  describe('引用与归档结合场景', () => {
    it('应该在归档时保留消息的引用信息', async () => {
      const conversationId = 'conv-citation-archive';

      // 创建带引用的消息
      await request(app.getHttpServer())
        .post('/v1/chat/messages')
        .send({
          conversationId,
          content: '根据 Alice 的建议，我们需要调整项目时间表',
          role: 'assistant',
          citations: [
            {
              id: 'cite-alice',
              start: 2,
              end: 7,
              targetId: 'contact-alice',
            },
          ],
        })
        .expect(201);

      // 归档对话
      const conversation = await conversationRepository.save(
        conversationRepository.create({
          id: conversationId,
          content: '关于项目时间表的讨论',
          userId: currentUserId,
        }),
      );

      aiServiceMock.callAgent.mockResolvedValueOnce(
        JSON.stringify({
          recognizedPeople: [{ name: 'Alice' }],
          newEvents: [],
          extractedFacts: [
            {
              type: 'decision',
              content: '调整项目时间表',
              citations: ['cite-alice'],
            },
          ],
          todoItems: [],
        }),
      );

      const archiveResponse = await request(app.getHttpServer())
        .post(`/v1/conversations/${conversation.id}/archive`)
        .expect(200);

      expect(archiveResponse.body.archiveResult.extractedFacts[0].citations).toBeDefined();
      expect(archiveResponse.body.archiveResult.extractedFacts[0].citations).toContain(
        'cite-alice',
      );
    });

    it('应该支持通过引用跳转到原始消息', async () => {
      const conversationId = 'conv-jump';

      const msg1Response = await request(app.getHttpServer())
        .post('/v1/chat/messages')
        .send({
          conversationId,
          content: '原始技术建议内容',
          role: 'user',
        })
        .expect(201);

      const msg1Id = msg1Response.body.id;

      await request(app.getHttpServer())
        .post('/v1/chat/messages')
        .send({
          conversationId,
          content: '关于技术建议的后续讨论',
          role: 'assistant',
          citations: [
            {
              id: 'cite-tech',
              start: 2,
              end: 6,
              targetId: msg1Id,
            },
          ],
        })
        .expect(201);

      // 通过引用获取原始消息
      const targetResponse = await request(app.getHttpServer())
        .get(`/v1/chat/messages/${msg1Id}`)
        .expect(200);

      expect(targetResponse.body.content).toBe('原始技术建议内容');
    });
  });
});
