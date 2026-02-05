import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Contact, Conversation, User } from '../src/entities';

describe('Conversation Archive Apply (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let contactRepository: Repository<Contact>;
  let conversationRepository: Repository<Conversation>;
  let currentUserId: string | null = null;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_GUARD)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
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
  });

  beforeEach(async () => {
    await conversationRepository.clear();
    await contactRepository.clear();
    await userRepository.clear();

    const user = userRepository.create({
      email: 'archive-user@example.com',
      password: 'password123',
      name: 'Archive User',
    });
    const savedUser = await userRepository.save(user);
    currentUserId = savedUser.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('applies archive and surfaces facts/todos in contact context', async () => {
    const contact = await contactRepository.save(
      contactRepository.create({
        name: 'Contact A',
        userId: currentUserId,
      }),
    );

    const conversation = await conversationRepository.save(
      conversationRepository.create({
        title: 'Conversation summary',
        content: 'Discussed lunch plans',
        userId: currentUserId,
        contactId: contact.id,
        parsedData: {
          facts: [{ key: 'favorite_food', value: 'sushi' }],
          todos: [{ description: 'Send restaurant list' }],
        },
      }),
    );

    const archiveResponse = await request(app.getHttpServer())
      .post(`/v1/conversations/${conversation.id}/archive`)
      .send({})
      .expect(200);

    const archiveId = archiveResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`/v1/conversation-archives/${archiveId}/apply`)
      .send({})
      .expect(200);

    const contextResponse = await request(app.getHttpServer())
      .get(`/v1/contacts/${contact.id}/context`)
      .expect(200);

    expect(contextResponse.body.facts.some((fact: any) => (
      typeof fact.content === 'string' && fact.content.includes('favorite_food')
    ))).toBe(true);
    expect(contextResponse.body.todos.some((todo: any) => (
      typeof todo.content === 'string' && todo.content.includes('Send restaurant list')
    ))).toBe(true);
  });
});
