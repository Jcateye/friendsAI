import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities';

describe('Feishu Integration (e2e)', () => {
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
      email: 'feishu-user@example.com',
      password: 'password123',
      name: 'Feishu User',
    });
    const saved = await userRepository.save(user);
    currentUserId = saved.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/feishu/oauth/url - 获取授权URL', () => {
    it('应该返回飞书 OAuth 授权 URL', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/feishu/oauth/url')
        .query({ redirect_uri: 'https://app.example.com/callback' })
        .expect(200);

      expect(response.body.url).toBeDefined();
      expect(response.body.url).toContain('open.feishu.cn/open-apis/authen/v1/authorize');
      expect(response.body.url).toContain('app_id=');
      expect(response.body.url).toContain('redirect_uri=');
      expect(response.body.state).toBeDefined();
    });

    it('应该包含必要的 OAuth 参数', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/feishu/oauth/url')
        .query({ redirect_uri: 'https://app.example.com/callback' })
        .expect(200);

      const url = new URL(response.body.url);
      expect(url.searchParams.get('app_id')).toBeDefined();
      expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/callback');
      expect(url.searchParams.get('state')).toBeDefined();
    });

    it('应该验证 redirect_uri 参数', async () => {
      await request(app.getHttpServer())
        .get('/v1/feishu/oauth/url')
        .expect(400);
    });
  });

  describe('POST /v1/feishu/oauth/callback - OAuth 回调', () => {
    it('应该处理授权码并返回访问令牌', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/feishu/oauth/callback')
        .send({
          code: 'mock_auth_code_123',
          state: 'mock_state_xyz',
        })
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.expires_in).toBeDefined();
      expect(response.body.user_id).toBeDefined();
    });

    it('应该拒绝无效的授权码', async () => {
      await request(app.getHttpServer())
        .post('/v1/feishu/oauth/callback')
        .send({
          code: 'invalid_code',
          state: 'mock_state',
        })
        .expect(401);
    });

    it('应该验证 state 参数防止 CSRF', async () => {
      await request(app.getHttpServer())
        .post('/v1/feishu/oauth/callback')
        .send({
          code: 'valid_code',
          state: 'tampered_state',
        })
        .expect(403);
    });
  });

  describe('GET /v1/feishu/tenant-token - 获取租户访问令牌', () => {
    it('应该返回租户访问令牌', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/feishu/tenant-token')
        .expect(200);

      expect(response.body.tenant_access_token).toBeDefined();
      expect(response.body.expire).toBeDefined();
      expect(response.body.expire).toBeGreaterThan(0);
    });

    it('应该缓存租户令牌', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/v1/feishu/tenant-token')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/v1/feishu/tenant-token')
        .expect(200);

      // 缓存生效，应该返回相同的令牌
      expect(response1.body.tenant_access_token).toBe(response2.body.tenant_access_token);
    });
  });

  describe('GET /v1/feishu/message-templates - 获取消息模板列表', () => {
    it('应该返回可用的消息模板列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/feishu/message-templates')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const template = response.body[0];
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.type).toBeDefined(); // text, interactive, etc.
      expect(template.template).toBeDefined();
    });

    it('应该支持按类型过滤模板', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/feishu/message-templates?type=interactive')
        .expect(200);

      expect(response.body.every((t: any) => t.type === 'interactive')).toBe(true);
    });
  });

  describe('POST /v1/feishu/messages/send - 发送消息', () => {
    it('应该发送文本消息', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/feishu/messages/send')
        .send({
          receive_id: 'ou_test_user_123',
          receive_id_type: 'open_id',
          msg_type: 'text',
          content: {
            text: '你好，这是一条测试消息',
          },
        })
        .expect(201);

      expect(response.body.message_id).toBeDefined();
      expect(response.body.code).toBe(0);
    });

    it('应该发送交互式卡片消息', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/feishu/messages/send')
        .send({
          receive_id: 'ou_test_user_456',
          receive_id_type: 'open_id',
          msg_type: 'interactive',
          content: {
            config: {
              wide_screen_mode: true,
            },
            elements: [
              {
                tag: 'div',
                text: {
                  content: '**会议提醒**\n明天下午 2:00 产品评审会',
                  tag: 'lark_md',
                },
              },
              {
                tag: 'action',
                actions: [
                  {
                    tag: 'button',
                    text: {
                      content: '确认参加',
                      tag: 'plain_text',
                    },
                    type: 'primary',
                  },
                ],
              },
            ],
          },
        })
        .expect(201);

      expect(response.body.message_id).toBeDefined();
    });

    it('应该使用消息模板发送', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/feishu/messages/send')
        .send({
          receive_id: 'ou_test_user_789',
          receive_id_type: 'open_id',
          template_id: 'meeting_reminder',
          template_data: {
            title: '团队周会',
            time: '2026-02-05 14:00',
            location: '会议室 A',
          },
        })
        .expect(201);

      expect(response.body.message_id).toBeDefined();
    });

    it('应该验证必填字段', async () => {
      await request(app.getHttpServer())
        .post('/v1/feishu/messages/send')
        .send({
          // 缺少 receive_id
          msg_type: 'text',
          content: { text: 'test' },
        })
        .expect(400);
    });

    it('应该处理发送失败情况', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/feishu/messages/send')
        .send({
          receive_id: 'invalid_user_id',
          receive_id_type: 'open_id',
          msg_type: 'text',
          content: { text: 'test' },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /v1/feishu/contacts - 获取联系人列表', () => {
    it('应该返回飞书联系人列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/feishu/contacts')
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.page_token).toBeDefined();
      expect(response.body.has_more).toBeDefined();

      if (response.body.items.length > 0) {
        const contact = response.body.items[0];
        expect(contact.open_id).toBeDefined();
        expect(contact.name).toBeDefined();
      }
    });

    it('应该支持分页查询', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/v1/feishu/contacts?page_size=10')
        .expect(200);

      expect(response1.body.items.length).toBeLessThanOrEqual(10);

      if (response1.body.has_more) {
        const response2 = await request(app.getHttpServer())
          .get(`/v1/feishu/contacts?page_token=${response1.body.page_token}`)
          .expect(200);

        expect(response2.body.items).toBeDefined();
      }
    });

    it('应该支持搜索联系人', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/feishu/contacts?query=张三')
        .expect(200);

      expect(response.body.items.every((c: any) => c.name.includes('张三'))).toBe(true);
    });
  });

  describe('GET /v1/feishu/contacts/:open_id - 获取联系人详情', () => {
    it('应该返回联系人详细信息', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/feishu/contacts/ou_test_user_123')
        .expect(200);

      expect(response.body.open_id).toBe('ou_test_user_123');
      expect(response.body.name).toBeDefined();
      expect(response.body.en_name).toBeDefined();
      expect(response.body.avatar).toBeDefined();
      expect(response.body.mobile).toBeDefined();
      expect(response.body.email).toBeDefined();
      expect(response.body.department_ids).toBeDefined();
    });

    it('应该处理不存在的联系人', async () => {
      await request(app.getHttpServer())
        .get('/v1/feishu/contacts/ou_nonexistent')
        .expect(404);
    });
  });

  describe('完整的飞书集成流程', () => {
    it('应该完成 OAuth → 获取联系人 → 发送消息的完整流程', async () => {
      // 1. 获取授权 URL
      const oauthUrlResponse = await request(app.getHttpServer())
        .get('/v1/feishu/oauth/url')
        .query({ redirect_uri: 'https://app.example.com/callback' })
        .expect(200);

      expect(oauthUrlResponse.body.url).toBeDefined();
      const state = oauthUrlResponse.body.state;

      // 2. 模拟用户授权并回调
      const callbackResponse = await request(app.getHttpServer())
        .post('/v1/feishu/oauth/callback')
        .send({
          code: 'mock_auth_code',
          state: state,
        })
        .expect(200);

      expect(callbackResponse.body.access_token).toBeDefined();

      // 3. 获取联系人列表
      const contactsResponse = await request(app.getHttpServer())
        .get('/v1/feishu/contacts')
        .expect(200);

      expect(contactsResponse.body.items).toBeDefined();

      if (contactsResponse.body.items.length > 0) {
        const firstContact = contactsResponse.body.items[0];

        // 4. 向联系人发送消息
        const sendResponse = await request(app.getHttpServer())
          .post('/v1/feishu/messages/send')
          .send({
            receive_id: firstContact.open_id,
            receive_id_type: 'open_id',
            msg_type: 'text',
            content: {
              text: '你好！这是来自 FriendsAI 的问候',
            },
          })
          .expect(201);

        expect(sendResponse.body.message_id).toBeDefined();
      }
    });

    it('应该支持使用模板发送会议提醒卡片', async () => {
      // 1. 获取消息模板
      const templatesResponse = await request(app.getHttpServer())
        .get('/v1/feishu/message-templates?type=interactive')
        .expect(200);

      expect(templatesResponse.body.length).toBeGreaterThan(0);
      const meetingTemplate = templatesResponse.body.find(
        (t: any) => t.id === 'meeting_reminder',
      );

      // 2. 使用模板发送消息
      const sendResponse = await request(app.getHttpServer())
        .post('/v1/feishu/messages/send')
        .send({
          receive_id: 'ou_test_user',
          receive_id_type: 'open_id',
          template_id: meetingTemplate.id,
          template_data: {
            title: '产品评审会',
            time: '明天 14:00',
            location: '3F 会议室',
            attendees: '产品团队全员',
          },
        })
        .expect(201);

      expect(sendResponse.body.message_id).toBeDefined();
    });
  });

  describe('飞书 Webhook 事件处理', () => {
    it('应该处理消息接收事件', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/feishu/webhook')
        .send({
          schema: '2.0',
          header: {
            event_id: 'event_123',
            event_type: 'im.message.receive_v1',
            app_id: 'cli_test',
            tenant_key: 'tenant_test',
          },
          event: {
            sender: {
              sender_id: {
                open_id: 'ou_sender_123',
              },
            },
            message: {
              message_id: 'msg_123',
              message_type: 'text',
              content: '{"text":"你好"}',
            },
          },
        })
        .expect(200);

      expect(response.body.challenge).toBeUndefined();
    });

    it('应该处理 URL 验证挑战', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/feishu/webhook')
        .send({
          challenge: 'test_challenge_string',
          type: 'url_verification',
        })
        .expect(200);

      expect(response.body.challenge).toBe('test_challenge_string');
    });
  });
});
