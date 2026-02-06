import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
process.env.FEISHU_APP_ID = process.env.FEISHU_APP_ID ?? 'test-feishu-app-id';

describe('API (e2e)', () => {
  let app: INestApplication;

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  const registerUser = async (
    email: string,
    password = 'password123',
    name = 'Test User',
  ) => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password, name })
      .expect(200);
    return response.body as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string | null };
    };
  };

  const createAuthedUser = async () => {
    const email = uniqueEmail('user');
    const auth = await registerUser(email);
    return {
      email,
      accessToken: auth.accessToken,
      userId: auth.user.id,
      authHeader: { Authorization: `Bearer ${auth.accessToken}` },
    };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health is public', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
  });

  it('POST /v1/auth/register and POST /v1/auth/login', async () => {
    const email = uniqueEmail('alice');
    const password = 'password123';

    const registerResponse = await registerUser(email, password);
    expect(registerResponse.accessToken).toBeDefined();
    expect(registerResponse.refreshToken).toBeDefined();
    expect(registerResponse.user.email).toBe(email);

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ emailOrPhone: email, password })
      .expect(200);

    expect(loginResponse.body.accessToken).toBeDefined();
    expect(loginResponse.body.refreshToken).toBeDefined();
    expect(loginResponse.body.user.email).toBe(email);
  });

  it('POST /v1/auth/register rejects duplicate emails', async () => {
    const email = uniqueEmail('duplicate');

    await registerUser(email);

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password: 'password123' })
      .expect(409);
  });

  it('POST /v1/auth/login rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ emailOrPhone: 'missing@example.com', password: 'nope' })
      .expect(401);
  });

  it('POST /v1/auth/refresh issues new token and logout revokes', async () => {
    const email = uniqueEmail('refresh');
    const registerResponse = await registerUser(email);

    const refreshResponse = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: registerResponse.refreshToken })
      .expect(200);

    expect(refreshResponse.body.accessToken).toBeDefined();
    expect(refreshResponse.body.refreshToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .send({ refreshToken: registerResponse.refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: registerResponse.refreshToken })
      .expect(401);
  });

  it('Protected endpoints require Bearer token', async () => {
    await request(app.getHttpServer())
      .get('/v1/contacts')
      .expect(401);

    const registerResponse = await registerUser(uniqueEmail('guard'));

    await request(app.getHttpServer())
      .get('/v1/contacts')
      .set('Authorization', `Bearer ${registerResponse.accessToken}`)
      .expect(200);
  });

  it('Contacts endpoints support CRUD and context retrieval', async () => {
    const { authHeader } = await createAuthedUser();

    const createResponse = await request(app.getHttpServer())
      .post('/v1/contacts')
      .set(authHeader)
      .send({
        displayName: 'Alice Contact',
        email: uniqueEmail('contact'),
        company: 'FriendsAI',
        tags: ['vip', 'friend'],
      })
      .expect(201);

    const contactId = createResponse.body.id as string;
    expect(createResponse.body.name).toBe('Alice Contact');

    const listResponse = await request(app.getHttpServer())
      .get('/v1/contacts')
      .set(authHeader)
      .expect(200);
    expect(Array.isArray(listResponse.body.items)).toBe(true);
    expect(listResponse.body.items.some((item: { id: string }) => item.id === contactId)).toBe(true);

    const getResponse = await request(app.getHttpServer())
      .get(`/v1/contacts/${contactId}`)
      .set(authHeader)
      .expect(200);
    expect(getResponse.body.id).toBe(contactId);

    const patchResponse = await request(app.getHttpServer())
      .patch(`/v1/contacts/${contactId}`)
      .set(authHeader)
      .send({
        company: 'FriendsAI Labs',
        note: 'Met at conference',
      })
      .expect(200);
    expect(patchResponse.body.company).toBe('FriendsAI Labs');
    expect(patchResponse.body.note).toBe('Met at conference');

    const contextResponse = await request(app.getHttpServer())
      .get(`/v1/contacts/${contactId}/context`)
      .set(authHeader)
      .expect(200);
    expect(Array.isArray(contextResponse.body.events)).toBe(true);
    expect(Array.isArray(contextResponse.body.facts)).toBe(true);
    expect(Array.isArray(contextResponse.body.todos)).toBe(true);

    await request(app.getHttpServer())
      .delete(`/v1/contacts/${contactId}`)
      .set(authHeader)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/v1/contacts/${contactId}`)
      .set(authHeader)
      .expect(404);
  });

  it('Conversations endpoints support create/list/get/messages', async () => {
    const { authHeader } = await createAuthedUser();

    const contactResponse = await request(app.getHttpServer())
      .post('/v1/contacts')
      .set(authHeader)
      .send({ name: 'Conversation Contact' })
      .expect(201);
    const contactId = contactResponse.body.id as string;

    const createConversationResponse = await request(app.getHttpServer())
      .post('/v1/conversations')
      .set(authHeader)
      .send({
        title: 'Intro chat',
        content: 'Discussed project kickoff',
        contactId,
      })
      .expect(200);

    const conversationId = createConversationResponse.body.id as string;
    expect(createConversationResponse.body.contactId).toBe(contactId);

    const listConversationsResponse = await request(app.getHttpServer())
      .get('/v1/conversations')
      .set(authHeader)
      .expect(200);
    expect(Array.isArray(listConversationsResponse.body)).toBe(true);
    expect(listConversationsResponse.body.some((item: { id: string }) => item.id === conversationId)).toBe(true);

    const getConversationResponse = await request(app.getHttpServer())
      .get(`/v1/conversations/${conversationId}`)
      .set(authHeader)
      .expect(200);
    expect(getConversationResponse.body.id).toBe(conversationId);

    const listMessagesResponse = await request(app.getHttpServer())
      .get(`/v1/conversations/${conversationId}/messages`)
      .set(authHeader)
      .expect(200);
    expect(Array.isArray(listMessagesResponse.body)).toBe(true);

    await request(app.getHttpServer())
      .get(`/v1/conversations/${conversationId}/messages?before=not-a-date`)
      .set(authHeader)
      .expect(400);

    await request(app.getHttpServer())
      .get('/v1/conversations/00000000-0000-4000-8000-000000000000/messages')
      .set(authHeader)
      .expect(404);
  });

  it('Events endpoints support create and list by contact', async () => {
    const { authHeader } = await createAuthedUser();

    const contactResponse = await request(app.getHttpServer())
      .post('/v1/contacts')
      .set(authHeader)
      .send({ name: 'Event Contact' })
      .expect(201);
    const contactId = contactResponse.body.id as string;

    const createEventResponse = await request(app.getHttpServer())
      .post('/v1/events')
      .set(authHeader)
      .send({
        title: 'Coffee Chat',
        description: 'Weekly catch-up',
        contactId,
        details: { location: 'Downtown' },
      })
      .expect(201);
    expect(createEventResponse.body.contactId).toBe(contactId);

    const listEventsResponse = await request(app.getHttpServer())
      .get(`/v1/events/contact/${contactId}`)
      .set(authHeader)
      .expect(200);
    expect(Array.isArray(listEventsResponse.body)).toBe(true);
    expect(listEventsResponse.body[0].title).toBe('Coffee Chat');
  });

  it('Connector OAuth endpoints respond with expected payloads', async () => {
    const { authHeader } = await createAuthedUser();

    await request(app.getHttpServer())
      .get('/v1/connectors/feishu/oauth/authorize')
      .expect(401);

    const authorizeResponse = await request(app.getHttpServer())
      .get('/v1/connectors/feishu/oauth/authorize')
      .set(authHeader)
      .query({
        redirect_uri: 'https://app.example.com/callback',
        state: 'test-state',
        scope: 'contact:read',
      })
      .expect(200);

    expect(authorizeResponse.body.configured).toBe(true);
    expect(authorizeResponse.body.authorizeUrl).toContain('open.feishu.cn/open-apis/authen/v1/authorize');
    expect(authorizeResponse.body.authorizeUrl).toContain('app_id=test-feishu-app-id');
    expect(authorizeResponse.body.authorizeUrl).toContain('state=test-state');

    const callbackResponse = await request(app.getHttpServer())
      .get('/v1/connectors/feishu/oauth/callback')
      .set(authHeader)
      .query({ code: 'code-123', state: 'state-123' })
      .expect(200);
    expect(callbackResponse.body.success).toBe(true);
    expect(callbackResponse.body.code).toBe('code-123');
    expect(callbackResponse.body.state).toBe('state-123');

    const tokenResponse = await request(app.getHttpServer())
      .post('/v1/connectors/feishu/oauth/token')
      .set(authHeader)
      .send({ code: 'code-123' })
      .expect(201);
    expect(tokenResponse.body.success).toBe(false);
    expect(tokenResponse.body.code).toBe('code-123');

    const refreshResponse = await request(app.getHttpServer())
      .post('/v1/connectors/feishu/oauth/refresh')
      .set(authHeader)
      .send({ refreshToken: 'refresh-123' })
      .expect(201);
    expect(refreshResponse.body.success).toBe(false);
    expect(refreshResponse.body.refreshToken).toBe('refresh-123');
  });

  it('Action panel, briefing, and agent message query endpoints are reachable', async () => {
    const { authHeader } = await createAuthedUser();

    const dashboardResponse = await request(app.getHttpServer())
      .get('/v1/action-panel/dashboard')
      .set(authHeader)
      .expect(200);
    expect(Array.isArray(dashboardResponse.body.followUps)).toBe(true);
    expect(Array.isArray(dashboardResponse.body.recommendedContacts)).toBe(true);

    const contactResponse = await request(app.getHttpServer())
      .post('/v1/contacts')
      .set(authHeader)
      .send({ name: 'Brief Contact' })
      .expect(201);
    const contactId = contactResponse.body.id as string;

    const briefResponse = await request(app.getHttpServer())
      .get(`/v1/contacts/${contactId}/brief`)
      .set(authHeader)
      .expect(200);
    expect(briefResponse.body === null || Object.keys(briefResponse.body).length === 0).toBe(true);

    const messagesResponse = await request(app.getHttpServer())
      .get('/v1/agent/messages?conversationId=test-conversation')
      .set(authHeader)
      .expect(200);
    expect(Array.isArray(messagesResponse.body)).toBe(true);
    expect(messagesResponse.body).toHaveLength(0);
  });

  it('Conversation archive endpoints support create/apply/discard', async () => {
    const { authHeader } = await createAuthedUser();

    const conversationResponse = await request(app.getHttpServer())
      .post('/v1/conversations')
      .set(authHeader)
      .send({
        title: 'Archive conversation',
        content: 'Discussed plans for next week',
      })
      .expect(200);
    const conversationId = conversationResponse.body.id as string;

    const archiveResponse = await request(app.getHttpServer())
      .post(`/v1/conversations/${conversationId}/archive`)
      .set(authHeader)
      .send({})
      .expect(200);
    expect(archiveResponse.body.status).toBe('ready_for_review');

    const appliedResponse = await request(app.getHttpServer())
      .post(`/v1/conversation-archives/${archiveResponse.body.id}/apply`)
      .set(authHeader)
      .send({})
      .expect(200);
    expect(appliedResponse.body.status).toBe('applied');

    const anotherConversationResponse = await request(app.getHttpServer())
      .post('/v1/conversations')
      .set(authHeader)
      .send({
        title: 'Discard conversation',
        content: 'No follow-up needed',
      })
      .expect(200);

    const archiveToDiscardResponse = await request(app.getHttpServer())
      .post(`/v1/conversations/${anotherConversationResponse.body.id}/archive`)
      .set(authHeader)
      .send({})
      .expect(200);

    const discardResponse = await request(app.getHttpServer())
      .post(`/v1/conversation-archives/${archiveToDiscardResponse.body.id}/discard`)
      .set(authHeader)
      .send({})
      .expect(200);
    expect(discardResponse.body.status).toBe('discarded');
  });
});
