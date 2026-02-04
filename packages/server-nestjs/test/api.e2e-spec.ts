import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { Contact, Conversation, Event, User } from '../src/entities';

describe('API (e2e)', () => {
  let app: INestApplication;
  let aiServiceMock: { callAgent: jest.Mock; generateEmbedding: jest.Mock };
  let userRepository: Repository<User>;
  let contactRepository: Repository<Contact>;
  let conversationRepository: Repository<Conversation>;
  let eventRepository: Repository<Event>;
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
    conversationRepository = moduleFixture.get<Repository<Conversation>>(getRepositoryToken(Conversation));
    eventRepository = moduleFixture.get<Repository<Event>>(getRepositoryToken(Event));
  });

  beforeEach(async () => {
    await conversationRepository.clear();
    await eventRepository.clear();
    await contactRepository.clear();
    await userRepository.clear();

    const user = userRepository.create({
      email: 'current-user@example.com',
      password: 'irrelevant',
      name: 'Current User',
    });
    const saved = await userRepository.save(user);
    currentUserId = saved.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / returns hello', async () => {
    await request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });

  it('POST /auth/register and POST /auth/login', async () => {
    const email = 'alice@example.com';
    const password = 'password123';

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, name: 'Alice' })
      .expect(201);

    expect(registerResponse.body.id).toBeDefined();
    expect(registerResponse.body.email).toBe(email);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(loginResponse.body.id).toBeDefined();
    expect(loginResponse.body.email).toBe(email);
  });

  it('POST /auth/register rejects duplicate emails', async () => {
    const email = 'duplicate@example.com';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(409);
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'missing@example.com', password: 'nope' })
      .expect(401);
  });

  it('contacts CRUD flow', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/contacts')
      .send({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+1-555-0101',
        company: 'Analytical Engines',
        position: 'Engineer',
        tags: ['math', 'ai'],
      })
      .expect(201);

    const contactId = createResponse.body.id as string;
    expect(contactId).toBeDefined();

    const listResponse = await request(app.getHttpServer())
      .get('/contacts?page=1&limit=10')
      .expect(200);

    expect(listResponse.body.total).toBe(1);
    expect(listResponse.body.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/contacts/${contactId}`)
      .expect(200);

    expect(getResponse.body.name).toBe('Ada Lovelace');

    const updateResponse = await request(app.getHttpServer())
      .patch(`/contacts/${contactId}`)
      .send({ company: 'Ada Labs' })
      .expect(200);

    expect(updateResponse.body.company).toBe('Ada Labs');

    await request(app.getHttpServer())
      .delete(`/contacts/${contactId}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/contacts/${contactId}`)
      .expect(404);
  });

  it('conversations create and fetch', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/conversations')
      .send({ content: 'Met at the conference, follow up next week.' })
      .expect(201);

    const conversationId = createResponse.body.id as string;
    expect(conversationId).toBeDefined();

    const listResponse = await request(app.getHttpServer())
      .get('/conversations')
      .expect(200);

    expect(listResponse.body).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/conversations/${conversationId}`)
      .expect(200);

    expect(getResponse.body.content).toContain('Met at the conference');
  });

  it('events create and list by contact', async () => {
    const contact = await contactRepository.save(
      contactRepository.create({
        name: 'Grace Hopper',
        email: 'grace@example.com',
        userId: currentUserId,
      }),
    );

    const eventResponse = await request(app.getHttpServer())
      .post('/events')
      .send({
        title: 'Lunch meeting',
        description: 'Discussed project timeline.',
        contactId: contact.id,
        details: { location: 'Cafe' },
      })
      .expect(201);

    expect(eventResponse.body.title).toBe('Lunch meeting');

    const listResponse = await request(app.getHttpServer())
      .get(`/events/contact/${contact.id}`)
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
  });

  it('briefings endpoints return generated content', async () => {
    const contact = await contactRepository.save(
      contactRepository.create({
        name: 'Linus Torvalds',
        email: 'linus@example.com',
        userId: currentUserId,
      }),
    );

    aiServiceMock.callAgent.mockResolvedValueOnce('Briefing content');

    const briefingResponse = await request(app.getHttpServer())
      .get(`/briefings/contact/${contact.id}`)
      .expect(200);

    expect(briefingResponse.text).toContain('Briefing content');

    aiServiceMock.callAgent.mockResolvedValueOnce('Refreshed briefing');

    const refreshResponse = await request(app.getHttpServer())
      .post(`/briefings/contact/${contact.id}/refresh`)
      .expect(201);

    expect(refreshResponse.text).toContain('Refreshed briefing');
  });

  it('action panel dashboard returns follow ups and recommendations', async () => {
    await contactRepository.save(
      contactRepository.create({
        name: 'Ada Lovelace',
        email: 'ada@actionpanel.test',
        company: 'Ada Labs',
        userId: currentUserId,
      }),
    );

    aiServiceMock.callAgent.mockResolvedValueOnce(
      JSON.stringify([
        {
          contactName: 'Ada Lovelace',
          reason: 'Important collaborator',
          openingLine: 'Hope you are well!',
        },
      ]),
    );

    const response = await request(app.getHttpServer())
      .get('/action-panel/dashboard')
      .expect(200);

    expect(response.body.followUps).toHaveLength(1);
    expect(response.body.recommendedContacts).toHaveLength(1);
    expect(response.body.recommendedContacts[0].contact.name).toBe('Ada Lovelace');
    expect(response.body.recommendedContacts[0].reason).toBe('Important collaborator');
  });
});
