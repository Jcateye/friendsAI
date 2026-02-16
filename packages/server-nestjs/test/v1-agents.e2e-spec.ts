import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { User, Contact, Conversation } from '../src/entities';
import { ActionOutcomeLog } from '../src/v3-entities/action-outcome-log.entity';
import { cleanupDatabase } from './db-cleanup';

/**
 * V1 Agents End-to-End Integration Tests
 *
 * 测试场景覆盖:
 * 1. contact_insight 增强输出测试
 * 2. network_action 增强输出测试
 * 3. 事件追踪闭环测试 (suggestion_shown -> accepted -> message_sent)
 * 4. 飞书工具执行测试
 *
 * @author Test Engineer
 * @version 1.0.0
 */
describe('V1 Agents E2E Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let contactRepository: Repository<Contact>;
  let conversationRepository: Repository<Conversation>;
  let actionLogRepository: Repository<ActionOutcomeLog>;

  let currentUserId: string;
  let authHeader: { Authorization: string };
  let testContactId: string;
  let testConversationId: string;

  // 辅助方法: 创建测试用户
  const createTestUser = async (email: string): Promise<User> => {
    const user = userRepository.create({
      email,
      password: 'hashed_password',
      name: 'Test User',
    });
    return await userRepository.save(user);
  };

  // 辅助方法: 创建测试联系人
  const createTestContact = async (userId: string, overrides: Partial<Contact> = {}): Promise<Contact> => {
    const contact = contactRepository.create({
      userId,
      name: overrides.name ?? 'Test Contact',
      email: overrides.email ?? 'contact@example.com',
      company: overrides.company ?? 'Test Company',
      position: overrides.position ?? 'Engineer',
      profile: overrides.profile ?? { bio: 'Test bio' },
      tags: overrides.tags ?? ['friend', 'work'],
      ...overrides,
    });
    return await contactRepository.save(contact);
  };

  // 辅助方法: 创建测试会话
  const createTestConversation = async (userId: string, contactId?: string): Promise<Conversation> => {
    const conversation = conversationRepository.create({
      userId,
      contactId,
      title: 'Test Conversation',
      content: 'Test conversation content for agent analysis',
      status: 'active',
    });
    return await conversationRepository.save(conversation);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    contactRepository = moduleFixture.get<Repository<Contact>>(getRepositoryToken(Contact));
    conversationRepository = moduleFixture.get<Repository<Conversation>>(
      getRepositoryToken(Conversation),
    );
    actionLogRepository = moduleFixture.get<Repository<ActionOutcomeLog>>(
      getRepositoryToken(ActionOutcomeLog),
    );
  });

  beforeEach(async () => {
    await cleanupDatabase(dataSource);

    // 创建测试用户并获取认证 token
    const registerResponse = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: `agent-test-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
        password: 'password123',
        name: 'Agent Test User',
      })
      .expect(200);

    currentUserId = registerResponse.body.user.id as string;
    authHeader = { Authorization: `Bearer ${registerResponse.body.accessToken as string}` };

    // 创建测试数据
    const contact = await createTestContact(currentUserId, {
      name: 'Alice Wang',
      email: 'alice@example.com',
      company: 'Tech Corp',
      position: 'Product Manager',
    });
    testContactId = contact.id;

    const conversation = await createTestConversation(currentUserId, testContactId);
    testConversationId = conversation.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. contact_insight 增强输出测试', () => {
    it('应该返回包含 priority_score, reason_tags, relationship_risk_level 的增强洞察', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/agent/run')
        .set(authHeader)
        .send({
          agentId: 'contact_insight',
          input: {
            userId: currentUserId,
            contactId: testContactId,
            depth: 'standard',
          },
        })
        .expect(200);

      // 验证基本响应结构
      expect(response.body).toMatchObject({
        runId: expect.any(String),
        agentId: 'contact_insight',
        operation: null,
        cached: expect.any(Boolean),
        generatedAt: expect.any(String),
        generatedAtMs: expect.any(Number),
        data: expect.any(Object),
      });

      const data = response.body.data as Record<string, unknown>;

      // 验证增强输出字段存在
      expect(data).toHaveProperty('profileSummary');
      expect(data).toHaveProperty('priority_score');
      expect(typeof (data.priority_score as number)).toBe('number');
      expect(data.priority_score as number).toBeGreaterThanOrEqual(0);
      expect(data.priority_score as number).toBeLessThanOrEqual(100);

      expect(data).toHaveProperty('reason_tags');
      expect(Array.isArray(data.reason_tags)).toBe(true);

      expect(data).toHaveProperty('relationship_risk_level');
      expect(['low', 'medium', 'high']).toContain(data.relationship_risk_level as string);

      // 验证标准字段
      expect(data).toHaveProperty('relationshipSignals');
      expect(Array.isArray(data.relationshipSignals)).toBe(true);

      expect(data).toHaveProperty('opportunities');
      expect(Array.isArray(data.opportunities)).toBe(true);

      expect(data).toHaveProperty('risks');
      expect(Array.isArray(data.risks)).toBe(true);

      expect(data).toHaveProperty('suggestedActions');
      expect(Array.isArray(data.suggestedActions)).toBe(true);

      expect(data).toHaveProperty('openingLines');
      expect(Array.isArray(data.openingLines)).toBe(true);

      // 验证元数据
      expect(data).toHaveProperty('sourceHash');
      expect(data).toHaveProperty('generatedAt');
    });

    it('应该支持不同深度级别 (brief, standard, deep)', async () => {
      const depths: Array<'brief' | 'standard' | 'deep'> = ['brief', 'standard', 'deep'];

      for (const depth of depths) {
        const response = await request(app.getHttpServer())
          .post('/v1/agent/run')
          .set(authHeader)
          .send({
            agentId: 'contact_insight',
            input: {
              userId: currentUserId,
              contactId: testContactId,
              depth,
            },
          })
          .expect(200);

        expect(response.body.data).toHaveProperty('profileSummary');
        expect(response.body.data).toHaveProperty('priority_score');
      }
    });

    it('应该在缓存时返回相同的数据', async () => {
      // 第一次请求
      const firstResponse = await request(app.getHttpServer())
        .post('/v1/agent/run')
        .set(authHeader)
        .send({
          agentId: 'contact_insight',
          input: {
            userId: currentUserId,
            contactId: testContactId,
          },
          options: { useCache: true },
        })
        .expect(200);

      // 第二次请求应该命中缓存
      const secondResponse = await request(app.getHttpServer())
        .post('/v1/agent/run')
        .set(authHeader)
        .send({
          agentId: 'contact_insight',
          input: {
            userId: currentUserId,
            contactId: testContactId,
          },
          options: { useCache: true },
        })
        .expect(200);

      // 第二次应该是缓存结果
      expect(secondResponse.body.cached).toBe(true);
      expect(secondResponse.body.snapshotId).toBeDefined();

      // 数据应该一致
      expect((secondResponse.body.data as Record<string, unknown>).sourceHash).toBe(
        (firstResponse.body.data as Record<string, unknown>).sourceHash,
      );
    });

    it('应该处理不存在的联系人', async () => {
      const fakeContactId = crypto.randomUUID();

      await request(app.getHttpServer())
        .post('/v1/agent/run')
        .set(authHeader)
        .send({
          agentId: 'contact_insight',
          input: {
            userId: currentUserId,
            contactId: fakeContactId,
          },
        })
        .expect(404);
    });
  });

  describe('2. network_action 增强输出测试', () => {
    beforeEach(async () => {
      // 为 network_action 测试创建更多联系人
      await createTestContact(currentUserId, {
        name: 'Bob Zhang',
        email: 'bob@example.com',
        company: 'Design Studio',
      });
      await createTestContact(currentUserId, {
        name: 'Carol Li',
        email: 'carol@example.com',
        company: 'Marketing Pro',
      });
    });

    it('应该返回包含 timing_reason, value_first_suggestion, followup_plan 的增强网络行动建议', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/agent/run')
        .set(authHeader)
        .send({
          agentId: 'network_action',
          input: {
            userId: currentUserId,
            limit: 5,
          },
        })
        .expect(200);

      // 验证基本响应结构
      expect(response.body).toMatchObject({
        runId: expect.any(String),
        agentId: 'network_action',
        data: expect.any(Object),
      });

      const data = response.body.data as Record<string, unknown>;

      // 验证增强输出字段
      expect(data).toHaveProperty('followUps');
      expect(Array.isArray(data.followUps)).toBe(true);

      if ((data.followUps as Array<unknown>).length > 0) {
        const firstFollowUp = (data.followUps as Array<Record<string, unknown>>)[0];

        // 验证增强字段
        expect(firstFollowUp).toHaveProperty('contactId');
        expect(firstFollowUp).toHaveProperty('contactName');
        expect(firstFollowUp).toHaveProperty('timing_reason');
        expect(typeof firstFollowUp.timing_reason).toBe('string');

        expect(firstFollowUp).toHaveProperty('value_first_suggestion');
        expect(typeof firstFollowUp.value_first_suggestion).toBe('string');

        expect(firstFollowUp).toHaveProperty('followup_plan');
        expect(typeof firstFollowUp.followup_plan).toBe('string');

        // 验证标准字段
        expect(firstFollowUp).toHaveProperty('priority');
        expect(['high', 'medium', 'low']).toContain(firstFollowUp.priority as string);
      }

      // 验证 recommendations 增强字段
      expect(data).toHaveProperty('recommendations');
      expect(Array.isArray(data.recommendations)).toBe(true);

      if ((data.recommendations as Array<unknown>).length > 0) {
        const firstRec = (data.recommendations as Array<Record<string, unknown>>)[0];
        expect(firstRec).toHaveProperty('reason');
        expect(typeof firstRec.reason).toBe('string');
      }

      // 验证标准字段
      expect(data).toHaveProperty('synthesis');
      expect(typeof data.synthesis).toBe('string');

      expect(data).toHaveProperty('nextActions');
      expect(Array.isArray(data.nextActions)).toBe(true);

      // 验证元数据
      expect(data).toHaveProperty('metadata');
      expect((data.metadata as Record<string, unknown>).cached).toBeDefined();
      expect((data.metadata as Record<string, unknown>).sourceHash).toBeDefined();
      expect((data.metadata as Record<string, unknown>).generatedAt).toBeDefined();
    });

    it('应该支持限制返回数量', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/agent/run')
        .set(authHeader)
        .send({
          agentId: 'network_action',
          input: {
            userId: currentUserId,
            limit: 2,
          },
        })
        .expect(200);

      const data = response.body.data as Record<string, unknown>;
      const followUps = data.followUps as Array<unknown>;

      expect(followUps.length).toBeLessThanOrEqual(2);
    });

    it('应该处理空联系人列表情况', async () => {
      // 创建一个没有联系人的新用户
      const newUser = await createTestUser(
        `empty-user-${Date.now()}@example.com`,
      );

      const loginResponse = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: newUser.email,
          password: 'password123',
        })
        .expect(200);

      const newAuthHeader = {
        Authorization: `Bearer ${loginResponse.body.accessToken as string}`,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/agent/run')
        .set(newAuthHeader)
        .send({
          agentId: 'network_action',
          input: {
            userId: newUser.id,
          },
        })
        .expect(200);

      const data = response.body.data as Record<string, unknown>;
      expect(data).toHaveProperty('followUps');
      expect((data.followUps as Array<unknown>).length).toBe(0);
      expect(data).toHaveProperty('synthesis');
      expect((data.synthesis as string)).toContain('暂无联系人');
    });

    it('应该支持 forceRefresh 跳过缓存', async () => {
      // 第一次请求
      await request(app.getHttpServer())
        .post('/v1/agent/run')
        .set(authHeader)
        .send({
          agentId: 'network_action',
          input: {
            userId: currentUserId,
          },
        })
        .expect(200);

      // 第二次请求强制刷新
      const response = await request(app.getHttpServer())
        .post('/v1/agent/run')
        .set(authHeader)
        .send({
          agentId: 'network_action',
          input: {
            userId: currentUserId,
          },
          options: { forceRefresh: true },
        })
        .expect(200);

      const data = response.body.data as Record<string, unknown>;
      expect((data.metadata as Record<string, unknown>).cached).toBe(false);
    });
  });

  describe('3. 事件追踪闭环测试', () => {
    it('应该完成 suggestion_shown -> suggestion_accepted -> message_sent 事件链路', async () => {
      const suggestionId = `suggestion_${Date.now()}`;

      // 1. 记录 suggestion_shown 事件
      const shownResponse = await request(app.getHttpServer())
        .post('/v1/actions/track')
        .set(authHeader)
        .send({
          eventType: 'shown',
          eventData: {
            agentId: 'network_action',
            suggestionId,
            suggestionType: 'followup',
            content: {
              contactName: 'Alice Wang',
              suggestedAction: 'Send a message about the upcoming conference',
            },
          },
        })
        .expect(200);

      expect(shownResponse.body.success).toBe(true);

      // 验证事件已记录
      const shownLogs = await actionLogRepository.find({
        where: {
          userId: currentUserId,
          actionType: 'suggestion_shown',
          suggestionId,
        },
      });
      expect(shownLogs.length).toBeGreaterThanOrEqual(1);

      // 2. 记录 suggestion_accepted 事件
      const acceptedResponse = await request(app.getHttpServer())
        .post('/v1/actions/track')
        .set(authHeader)
        .send({
          eventType: 'accepted',
          eventData: {
            suggestionId,
          },
        })
        .expect(200);

      expect(acceptedResponse.body.success).toBe(true);

      const acceptedLogs = await actionLogRepository.find({
        where: {
          userId: currentUserId,
          actionType: 'suggestion_accepted',
          suggestionId,
        },
      });
      expect(acceptedLogs.length).toBeGreaterThanOrEqual(1);

      // 3. 记录 message_sent 事件
      const messageId = `msg_${Date.now()}`;
      const sentResponse = await request(app.getHttpServer())
        .post('/v1/actions/track')
        .set(authHeader)
        .send({
          eventType: 'sent',
          eventData: {
            suggestionId,
            messageId,
            recipientId: testContactId,
            recipientType: 'contact',
            channel: 'manual',
            contentPreview: 'Hi Alice, hope you are doing well!',
          },
        })
        .expect(200);

      expect(sentResponse.body.success).toBe(true);

      const sentLogs = await actionLogRepository.find({
        where: {
          userId: currentUserId,
          actionType: 'message_sent',
          messageId,
        },
      });
      expect(sentLogs.length).toBeGreaterThanOrEqual(1);

      // 验证事件链完整性
      const allLogs = await actionLogRepository.find({
        where: { userId: currentUserId, suggestionId },
        order: { actionTimestamp: 'ASC' },
      });

      const actionTypes = allLogs.map((log) => log.actionType);
      expect(actionTypes).toContain('suggestion_shown');
      expect(actionTypes).toContain('suggestion_accepted');
      expect(actionTypes).toContain('message_sent');
    });

    it('应该正确计算每周指标', async () => {
      // 创建多个事件
      const suggestionId = `suggestion_${Date.now()}`;

      // 创建 3 个展示事件
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/v1/actions/track')
          .set(authHeader)
          .send({
            eventType: 'shown',
            eventData: {
              agentId: 'contact_insight',
              suggestionId: `${suggestionId}_${i}`,
              suggestionType: 'followup',
              content: {},
            },
          })
          .expect(200);
      }

      // 创建 2 个采纳事件
      await request(app.getHttpServer())
        .post('/v1/actions/track')
        .set(authHeader)
        .send({
          eventType: 'accepted',
          eventData: { suggestionId: `${suggestionId}_0` },
        })
        .expect(200);

      await request(app.getHttpServer())
        .post('/v1/actions/track')
        .set(authHeader)
        .send({
          eventType: 'accepted',
          eventData: { suggestionId: `${suggestionId}_1` },
        })
        .expect(200);

      // 创建 1 个发送事件
      await request(app.getHttpServer())
        .post('/v1/actions/track')
        .set(authHeader)
        .send({
          eventType: 'sent',
          eventData: {
            suggestionId: `${suggestionId}_0`,
            messageId: `msg_${Date.now()}`,
            recipientId: testContactId,
            recipientType: 'contact',
            channel: 'feishu',
            contentPreview: 'Test message',
          },
        })
        .expect(200);

      // 查询每周指标
      const metricsResponse = await request(app.getHttpServer())
        .get('/v1/metrics/weekly')
        .set(authHeader)
        .query({ days: 7 })
        .expect(200);

      // 验证指标
      expect(metricsResponse.body).toHaveProperty('actionCompletionRate');
      expect(metricsResponse.body).toHaveProperty('replyRate');
      expect(metricsResponse.body).toHaveProperty('followupRate');
      expect(metricsResponse.body).toHaveProperty('totalSuggestions');
      expect(metricsResponse.body).toHaveProperty('totalAccepted');
      expect(metricsResponse.body).toHaveProperty('totalSent');
      expect(metricsResponse.body).toHaveProperty('totalReplied');

      // 验证计算结果
      expect(metricsResponse.body.totalSuggestions).toBeGreaterThanOrEqual(3);
      expect(metricsResponse.body.totalAccepted).toBeGreaterThanOrEqual(2);
      expect(metricsResponse.body.totalSent).toBeGreaterThanOrEqual(1);

      // 验证采纳率
      const expectedRate = metricsResponse.body.totalAccepted / metricsResponse.body.totalSuggestions;
      expect(metricsResponse.body.actionCompletionRate).toBeCloseTo(expectedRate, 1);
    });

    it('应该处理 message_replied 事件', async () => {
      const suggestionId = `suggestion_${Date.now()}`;
      const messageId = `msg_${Date.now()}`;

      // 先发送消息
      await request(app.getHttpServer())
        .post('/v1/actions/track')
        .set(authHeader)
        .send({
          eventType: 'sent',
          eventData: {
            suggestionId,
            messageId,
            recipientId: testContactId,
            recipientType: 'contact',
            channel: 'feishu',
            contentPreview: 'Original message',
          },
        })
        .expect(200);

      // 记录回复
      const replyResponse = await request(app.getHttpServer())
        .post('/v1/actions/track')
        .set(authHeader)
        .send({
          eventType: 'replied',
          eventData: {
            messageSentId: messageId,
            replyPreview: 'Thanks for reaching out!',
          },
        })
        .expect(200);

      expect(replyResponse.body.success).toBe(true);

      const replyLogs = await actionLogRepository.find({
        where: { actionType: 'message_replied' },
      });
      expect(replyLogs.length).toBeGreaterThanOrEqual(1);
    });

    it('应该处理 followup_completed 事件', async () => {
      const suggestionId = `suggestion_${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/v1/actions/track')
        .set(authHeader)
        .send({
          eventType: 'followup_completed',
          eventData: {
            suggestionId,
            completionType: 'manual',
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const logs = await actionLogRepository.find({
        where: {
          userId: currentUserId,
          actionType: 'followup_completed',
        },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].outcomeType).toBe('partial');
      expect(logs[0].outcomeReason).toBe('manual_followup');
    });

    it('应该拒绝未知的事件类型', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/actions/track')
        .set(authHeader)
        .send({
          eventType: 'unknown_type',
          eventData: {},
        })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unknown event type');
    });
  });

  describe('4. 飞书工具执行测试', () => {
    it('应该完成创建确认请求 -> 确认执行 -> 验证结果的完整流程', async () => {
      // 1. 创建工具确认请求
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .set(authHeader)
        .send({
          toolName: 'feishu_send_message',
          payload: {
            receive_id: 'ou_test_user_123',
            msg_type: 'text',
            content: { text: 'Test message from friendsAI' },
          },
        })
        .expect(201);

      const confirmationId = createResponse.body.id;
      expect(confirmationId).toBeDefined();
      expect(createResponse.body.status).toBe('pending');
      expect(createResponse.body.toolName).toBe('feishu_send_message');

      // 2. 查询待确认列表
      const listResponse = await request(app.getHttpServer())
        .get('/v1/tool-confirmations?status=pending')
        .set(authHeader)
        .expect(200);

      const pendingConfirmation = listResponse.body.find(
        (c: { id: string }) => c.id === confirmationId,
      );
      expect(pendingConfirmation).toBeDefined();
      expect(pendingConfirmation.toolName).toBe('feishu_send_message');

      // 3. 确认执行
      const confirmResponse = await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .set(authHeader)
        .expect(200);

      expect(confirmResponse.body.status).toBe('confirmed');
      expect(confirmResponse.body.executedAt).toBeDefined();

      // 4. 验证工具执行结果
      const verifyResponse = await request(app.getHttpServer())
        .get(`/v1/tool-confirmations/${confirmationId}`)
        .set(authHeader)
        .expect(200);

      expect(verifyResponse.body.status).toBe('confirmed');
      expect(verifyResponse.body.executedAt).toBeDefined();
    });

    it('应该支持创建交互式卡片消息确认', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .set(authHeader)
        .send({
          toolName: 'feishu_send_card',
          payload: {
            receive_id: 'ou_test_user_456',
            msg_type: 'interactive',
            card: {
              config: { wide_screen_mode: true },
              elements: [
                {
                  tag: 'div',
                  text: {
                    content: '**Meeting Reminder**\nTomorrow at 2:00 PM',
                    tag: 'lark_md',
                  },
                },
                {
                  tag: 'action',
                  actions: [
                    {
                      tag: 'button',
                      text: { content: 'Confirm', tag: 'plain_text' },
                      type: 'primary',
                    },
                  ],
                },
              ],
            },
          },
        })
        .expect(201);

      expect(response.body.toolName).toBe('feishu_send_card');
      expect(response.body.payload.msg_type).toBe('interactive');
      expect(response.body.status).toBe('pending');
    });

    it('应该支持批量创建确认请求', async () => {
      const confirmations = [];

      // 创建多个确认
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/v1/tool-confirmations')
          .set(authHeader)
          .send({
            toolName: 'feishu_send_message',
            payload: {
              receive_id: `ou_test_user_${i}`,
              msg_type: 'text',
              content: { text: `Message ${i}` },
            },
          })
          .expect(201);

        confirmations.push(response.body);
      }

      expect(confirmations.length).toBe(3);

      // 验证列表返回所有待确认项
      const listResponse = await request(app.getHttpServer())
        .get('/v1/tool-confirmations?status=pending')
        .set(authHeader)
        .expect(200);

      expect(listResponse.body.length).toBeGreaterThanOrEqual(3);
    });

    it('应该支持拒绝工具执行', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .set(authHeader)
        .send({
          toolName: 'feishu_send_message',
          payload: {
            receive_id: 'ou_test_user',
            msg_type: 'text',
            content: { text: 'Test' },
          },
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      const rejectResponse = await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/reject`)
        .set(authHeader)
        .send({ reason: 'User cancelled the action' })
        .expect(200);

      expect(rejectResponse.body.status).toBe('rejected');
      expect(rejectResponse.body.error).toBe('User cancelled the action');

      // 验证状态
      const verifyResponse = await request(app.getHttpServer())
        .get(`/v1/tool-confirmations/${confirmationId}`)
        .set(authHeader)
        .expect(200);

      expect(verifyResponse.body.status).toBe('rejected');
      expect(verifyResponse.body.executedAt).toBeNull();
    });

    it('应该记录飞书工具执行事件到 action_outcome_log', async () => {
      const confirmationId = `feishu_test_${Date.now()}`;

      // 模拟飞书消息发送成功后的事件记录
      const logEntry = actionLogRepository.create({
        userId: currentUserId,
        contactId: testContactId,
        agentName: 'feishu-message-service',
        actionType: 'message_sent',
        actionMetadata: {
          recipientOpenId: 'ou_test_user',
          msgType: 'text',
          confirmationId,
        },
        outcomeType: 'success',
        outcomeReason: 'message_sent',
        actionTimestamp: new Date(),
        responseTimeSeconds: null,
        platform: 'feishu',
        messageId: `feishu_msg_${Date.now()}`,
        conversationId: null,
        suggestionId: null,
        followupRequired: true,
        followupDeadline: null,
        conversionScore: null,
        metadata: {
          eventCategory: 'feishu_message',
        },
      });

      await actionLogRepository.save(logEntry);

      // 验证事件已记录
      const logs = await actionLogRepository.find({
        where: {
          userId: currentUserId,
          agentName: 'feishu-message-service',
          actionType: 'message_sent',
        },
      });

      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].platform).toBe('feishu');
      expect(logs[0].outcomeType).toBe('success');
    });

    it('应该防止重复确认', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .set(authHeader)
        .send({
          toolName: 'log_action',
          payload: { message: 'Test' },
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      // 第一次确认
      await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .set(authHeader)
        .expect(200);

      // 第二次确认应该失败
      await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .set(authHeader)
        .expect(400);
    });

    it('应该防止拒绝已确认的工具', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .set(authHeader)
        .send({
          toolName: 'log_action',
          payload: { message: 'Test' },
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      // 先确认
      await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .set(authHeader)
        .expect(200);

      // 尝试拒绝应该失败
      await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/reject`)
        .set(authHeader)
        .expect(400);
    });
  });

  describe('5. 综合 Agent 列表查询测试', () => {
    it('应该返回所有可用的 Agent 列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/agent/list')
        .set(authHeader)
        .expect(200);

      expect(response.body).toHaveProperty('agents');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.agents)).toBe(true);

      const agentIds = response.body.agents.map((a: { id: string }) => a.id);
      expect(agentIds).toContain('contact_insight');
      expect(agentIds).toContain('network_action');
      expect(agentIds).toContain('archive_brief');
      expect(agentIds).toContain('title_summary');
      expect(agentIds).toContain('chat_conversation');
    });

    it('应该包含 Agent 的详细信息', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/agent/list')
        .set(authHeader)
        .expect(200);

      const contactInsight = response.body.agents.find(
        (a: { id: string }) => a.id === 'contact_insight',
      );

      expect(contactInsight).toBeDefined();
      expect(contactInsight).toHaveProperty('name');
      expect(contactInsight).toHaveProperty('description');
      expect(contactInsight).toHaveProperty('status');
      expect(contactInsight).toHaveProperty('usage');
      expect(contactInsight).toHaveProperty('endpoint');
    });
  });
});
