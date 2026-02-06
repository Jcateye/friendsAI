import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './db-cleanup';

describe('Tool Confirmations (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authHeader: { Authorization: string };
  const post = (path: string) => request(app.getHttpServer()).post(path).set(authHeader);
  const get = (path: string) => request(app.getHttpServer()).get(path).set(authHeader);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();

    dataSource = moduleFixture.get(DataSource);
  });

  beforeEach(async () => {
    await cleanupDatabase(dataSource);

    const registerResponse = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: `tool-user-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
        password: 'password123',
        name: 'Tool User',
      })
      .expect(200);

    authHeader = { Authorization: `Bearer ${registerResponse.body.accessToken as string}` };
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/tool-confirmations - 创建待确认工具', () => {
    it('应该创建一个待确认的工具执行', async () => {
      const response = await post('/v1/tool-confirmations')
        .send({
          toolName: 'send_message',
          payload: {
            to: 'alice@example.com',
            subject: 'Meeting tomorrow',
            body: 'Can we meet at 2pm?',
          },
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.toolName).toBe('send_message');
      expect(response.body.status).toBe('pending');
      expect(response.body.payload).toEqual({
        to: 'alice@example.com',
        subject: 'Meeting tomorrow',
        body: 'Can we meet at 2pm?',
      });
    });

    it('应该允许空 payload 创建确认', async () => {
      const response = await post('/v1/tool-confirmations')
        .send({
          toolName: 'send_message',
        })
        .expect(201);

      expect(response.body.status).toBe('pending');
    });

    it('应该支持创建飞书消息确认', async () => {
      const response = await post('/v1/tool-confirmations')
        .send({
          toolName: 'feishu_send_message',
          payload: {
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
        })
        .expect(201);

      expect(response.body.toolName).toBe('feishu_send_message');
      expect(response.body.payload.msg_type).toBe('interactive');
    });
  });

  describe('GET /v1/tool-confirmations - 列出待确认工具', () => {
    it('应该返回所有待确认的工具', async () => {
      // 创建多个待确认工具
      await post('/v1/tool-confirmations')
        .send({
          toolName: 'send_email',
          payload: { to: 'user1@example.com' },
        })
        .expect(201);

      await post('/v1/tool-confirmations')
        .send({
          toolName: 'create_event',
          payload: { title: 'Team meeting' },
        })
        .expect(201);

      const response = await get('/v1/tool-confirmations')
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body[0].status).toBe('pending');
    });

    it('应该支持按状态过滤', async () => {
      const createResponse = await post('/v1/tool-confirmations')
        .send({
          toolName: 'test_tool',
          payload: { param: 'value' },
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      // 确认工具执行
      await post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(200);

      // 查询已确认的工具
      const confirmedResponse = await get('/v1/tool-confirmations?status=confirmed')
        .expect(200);

      expect(confirmedResponse.body.length).toBeGreaterThanOrEqual(1);
      expect(confirmedResponse.body[0].status).toBe('confirmed');

      // 查询待确认的工具
      const pendingResponse = await get('/v1/tool-confirmations?status=pending')
        .expect(200);

      expect(pendingResponse.body.every((item: any) => item.status === 'pending')).toBe(true);
    });

  });

  describe('POST /v1/tool-confirmations/:id/confirm - 确认工具执行', () => {
    it('应该确认并执行工具', async () => {
      const createResponse = await post('/v1/tool-confirmations')
        .send({
          toolName: 'log_action',
          payload: { message: 'Test log' },
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      const confirmResponse = await post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(200);

      expect(confirmResponse.body.status).toBe('confirmed');
      expect(confirmResponse.body.executedAt).toBeDefined();
    });

    it('应该返回工具执行结果', async () => {
      const createResponse = await post('/v1/tool-confirmations')
        .send({
          toolName: 'calculate_sum',
          payload: { a: 10, b: 20 },
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      const confirmResponse = await post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(200);

      expect(confirmResponse.body.result).toBeDefined();
    });

    it('应该拒绝已确认的工具重复确认', async () => {
      const createResponse = await post('/v1/tool-confirmations')
        .send({
          toolName: 'test_tool',
          payload: {},
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      // 第一次确认
      await post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(200);

      // 第二次确认应该失败
      await post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(400);
    });
  });

  describe('POST /v1/tool-confirmations/:id/reject - 拒绝工具执行', () => {
    it('应该拒绝工具执行', async () => {
      const createResponse = await post('/v1/tool-confirmations')
        .send({
          toolName: 'delete_data',
          payload: { id: 'dangerous-123' },
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      const rejectResponse = await post(`/v1/tool-confirmations/${confirmationId}/reject`)
        .send({ reason: '操作过于危险，用户取消' })
        .expect(200);

      expect(rejectResponse.body.status).toBe('rejected');
      expect(rejectResponse.body.error).toBe('操作过于危险，用户取消');
    });

    it('应该拒绝已执行的工具拒绝操作', async () => {
      const createResponse = await post('/v1/tool-confirmations')
        .send({
          toolName: 'test_tool',
          payload: {},
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      // 先确认
      await post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(200);

      // 再拒绝应该失败
      await post(`/v1/tool-confirmations/${confirmationId}/reject`)
        .expect(400);
    });
  });

  describe('完整的工具确认工作流', () => {
    it('应该完成从创建到确认执行的完整流程', async () => {
      // 1. AI 检测到需要工具调用
      const createResponse = await post('/v1/tool-confirmations')
        .send({
          toolName: 'send_feishu_message',
          payload: {
            receive_id: 'ou_user123',
            msg_type: 'text',
            content: { text: '会议将在10分钟后开始' },
          },
        })
        .expect(201);

      const confirmationId = createResponse.body.id;
      expect(createResponse.body.status).toBe('pending');

      // 2. 用户查看待确认列表
      const listResponse = await get('/v1/tool-confirmations?status=pending')
        .expect(200);

      const pendingConfirmation = listResponse.body.find(
        (c: any) => c.id === confirmationId,
      );
      expect(pendingConfirmation).toBeDefined();
      expect(pendingConfirmation.toolName).toBe('send_feishu_message');

      // 3. 用户确认执行
      const confirmResponse = await post(`/v1/tool-confirmations/${confirmationId}/confirm`)
        .expect(200);

      expect(confirmResponse.body.status).toBe('confirmed');
      expect(confirmResponse.body.executedAt).toBeDefined();

      // 4. 验证工具已执行
      const verifyResponse = await get(`/v1/tool-confirmations/${confirmationId}`)
        .expect(200);

      expect(verifyResponse.body.status).toBe('confirmed');
    });

    it('应该完成从创建到拒绝的完整流程', async () => {
      // 1. 创建待确认工具
      const createResponse = await post('/v1/tool-confirmations')
        .send({
          toolName: 'delete_contact',
          payload: { contactId: 'contact-789' },
        })
        .expect(201);

      const confirmationId = createResponse.body.id;

      // 2. 用户决定拒绝
      const rejectResponse = await post(`/v1/tool-confirmations/${confirmationId}/reject`)
        .send({ reason: '这个联系人还需要保留' })
        .expect(200);

      expect(rejectResponse.body.status).toBe('rejected');

      // 3. 验证工具未执行
      const verifyResponse = await get(`/v1/tool-confirmations/${confirmationId}`)
        .expect(200);

      expect(verifyResponse.body.status).toBe('rejected');
      expect(verifyResponse.body.executedAt).toBeNull();
    });
  });
});
