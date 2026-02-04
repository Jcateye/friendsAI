import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities';

describe('Tool Confirmations (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let currentUserId: string | null = null;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
      email: 'tool-user@example.com',
      password: 'password123',
      name: 'Tool User',
    });
    const saved = await userRepository.save(user);
    currentUserId = saved.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/tool-confirmations - 创建待确认工具', () => {
    it('应该创建一个待确认的工具执行', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'send_message',
          toolArgs: {
            to: 'alice@example.com',
            subject: 'Meeting tomorrow',
            body: 'Can we meet at 2pm?',
          },
          conversationId: 'conv-123',
          reason: '用户想要发送会议邀请邮件',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.toolName).toBe('send_message');
      expect(response.body.status).toBe('pending');
      expect(response.body.toolArgs).toEqual({
        to: 'alice@example.com',
        subject: 'Meeting tomorrow',
        body: 'Can we meet at 2pm?',
      });
      expect(response.body.reason).toBe('用户想要发送会议邀请邮件');
    });

    it('应该验证必填字段', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'send_message',
          // 缺少 toolArgs
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('应该支持创建飞书消息确认', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'feishu_send_message',
          toolArgs: {
            receive_id: 'ou_123456',
            msg_type: 'interactive',
            card: {
              elements: [
                {
                  tag: 'div',
                  text: {
                    content: '**会议提醒**',
                    tag: 'lark_md',
                  },
                },
              ],
            },
          },
          conversationId: 'conv-456',
          reason: '发送飞书会议提醒卡片',
        })
        .expect(201);

      expect(response.body.toolName).toBe('feishu_send_message');
      expect(response.body.toolArgs.msg_type).toBe('interactive');
    });
  });

  describe('GET /v1/tool-confirmations - 列出待确认工具', () => {
    it('应该返回所有待确认的工具', async () => {
      // 创建多个待确认工具
      await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'send_email',
          toolArgs: { to: 'user1@example.com' },
          conversationId: 'conv-1',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'create_event',
          toolArgs: { title: 'Team meeting' },
          conversationId: 'conv-2',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/v1/tool-confirmations')
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body[0].status).toBe('pending');
    });

    it('应该支持按状态过滤', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'test_tool',
          toolArgs: { param: 'value' },
          conversationId: 'conv-3',
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      // 确认工具执行
      await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(200);

      // 查询已确认的工具
      const confirmedResponse = await request(app.getHttpServer())
        .get('/v1/tool-confirmations?status=confirmed')
        .expect(200);

      expect(confirmedResponse.body.length).toBeGreaterThanOrEqual(1);
      expect(confirmedResponse.body[0].status).toBe('confirmed');

      // 查询待确认的工具
      const pendingResponse = await request(app.getHttpServer())
        .get('/v1/tool-confirmations?status=pending')
        .expect(200);

      expect(pendingResponse.body.every((item: any) => item.status === 'pending')).toBe(true);
    });

    it('应该支持按对话ID过滤', async () => {
      await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'tool_a',
          toolArgs: {},
          conversationId: 'conv-specific',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/v1/tool-confirmations?conversationId=conv-specific')
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].conversationId).toBe('conv-specific');
    });
  });

  describe('POST /v1/tool-confirmations/:id/confirm - 确认工具执行', () => {
    it('应该确认并执行工具', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'log_action',
          toolArgs: { message: 'Test log' },
          conversationId: 'conv-confirm',
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      const confirmResponse = await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(200);

      expect(confirmResponse.body.status).toBe('confirmed');
      expect(confirmResponse.body.executedAt).toBeDefined();
    });

    it('应该返回工具执行结果', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'calculate_sum',
          toolArgs: { a: 10, b: 20 },
          conversationId: 'conv-calc',
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      const confirmResponse = await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(200);

      expect(confirmResponse.body.result).toBeDefined();
    });

    it('应该拒绝已确认的工具重复确认', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'test_tool',
          toolArgs: {},
          conversationId: 'conv-duplicate',
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      // 第一次确认
      await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(200);

      // 第二次确认应该失败
      await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(409);
    });
  });

  describe('POST /v1/tool-confirmations/:id/reject - 拒绝工具执行', () => {
    it('应该拒绝工具执行', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'delete_data',
          toolArgs: { id: 'dangerous-123' },
          conversationId: 'conv-reject',
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      const rejectResponse = await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/reject`)
        .send({ reason: '操作过于危险，用户取消' })
        .expect(200);

      expect(rejectResponse.body.status).toBe('rejected');
      expect(rejectResponse.body.rejectionReason).toBe('操作过于危险，用户取消');
    });

    it('应该拒绝已执行的工具拒绝操作', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'test_tool',
          toolArgs: {},
          conversationId: 'conv-reject-fail',
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      // 先确认
      await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(200);

      // 再拒绝应该失败
      await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/reject`)
        .expect(409);
    });
  });

  describe('完整的工具确认工作流', () => {
    it('应该完成从创建到确认执行的完整流程', async () => {
      // 1. AI 检测到需要工具调用
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'send_feishu_message',
          toolArgs: {
            receive_id: 'ou_user123',
            msg_type: 'text',
            content: { text: '会议将在10分钟后开始' },
          },
          conversationId: 'conv-workflow',
          reason: '用户需要发送会议提醒',
        })
        .expect(201);

      const confirmationId = createResponse.body.id;
      expect(createResponse.body.status).toBe('pending');

      // 2. 用户查看待确认列表
      const listResponse = await request(app.getHttpServer())
        .get('/v1/tool-confirmations?status=pending')
        .expect(200);

      const pendingConfirmation = listResponse.body.find(
        (c: any) => c.id === confirmationId,
      );
      expect(pendingConfirmation).toBeDefined();
      expect(pendingConfirmation.toolName).toBe('send_feishu_message');

      // 3. 用户确认执行
      const confirmResponse = await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(200);

      expect(confirmResponse.body.status).toBe('confirmed');
      expect(confirmResponse.body.executedAt).toBeDefined();

      // 4. 验证工具已执行
      const verifyResponse = await request(app.getHttpServer())
        .get(`/v1/tool-confirmations/${confirmationId}`)
        .expect(200);

      expect(verifyResponse.body.status).toBe('confirmed');
    });

    it('应该完成从创建到拒绝的完整流程', async () => {
      // 1. 创建待确认工具
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tool-confirmations')
        .send({
          toolName: 'delete_contact',
          toolArgs: { contactId: 'contact-789' },
          conversationId: 'conv-reject-workflow',
          reason: 'AI 建议删除重复联系人',
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      // 2. 用户决定拒绝
      const rejectResponse = await request(app.getHttpServer())
        .post(`/v1/tool-confirmations/${confirmationId}/reject`)
        .send({ reason: '这个联系人还需要保留' })
        .expect(200);

      expect(rejectResponse.body.status).toBe('rejected');

      // 3. 验证工具未执行
      const verifyResponse = await request(app.getHttpServer())
        .get(`/v1/tool-confirmations/${confirmationId}`)
        .expect(200);

      expect(verifyResponse.body.status).toBe('rejected');
      expect(verifyResponse.body.executedAt).toBeUndefined();
    });
  });
});
