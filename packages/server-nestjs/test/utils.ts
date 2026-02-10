/**
 * Test utilities for NestJS backend tests
 *
 * Provides factory functions for creating test entities and mock repositories.
 * These utilities help reduce boilerplate in test files.
 */

import { Repository } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { Contact } from '../src/entities/contact.entity';
import { Conversation } from '../src/entities/conversation.entity';
import { Message } from '../src/entities/message.entity';
import { Event } from '../src/entities/event.entity';
import { ContactFact } from '../src/entities/contact-fact.entity';
import { ContactTodo } from '../src/entities/contact-todo.entity';
import { ContactBrief } from '../src/entities/contact-brief.entity';

/**
 * Creates a test User with default values that can be overridden
 */
export const createTestUser = (overrides: Partial<User> = {}): User => {
  const user = new User();
  user.id = overrides.id || crypto.randomUUID();
  user.email = overrides.email ?? 'test@example.com';
  user.phone = overrides.phone ?? null;
  user.password = overrides.password ?? 'hashed-password';
  user.name = overrides.name ?? 'Test User';
  user.createdAt = overrides.createdAt ?? new Date();
  user.updatedAt = overrides.updatedAt ?? new Date();
  return user;
};

/**
 * Creates a test Contact with default values that can be overridden
 */
export const createTestContact = (overrides: Partial<Contact> = {}): Contact => {
  const contact = new Contact();
  contact.id = overrides.id || crypto.randomUUID();
  contact.name = overrides.name ?? 'Test Contact';
  contact.alias = overrides.alias ?? null;
  contact.email = overrides.email ?? 'contact@example.com';
  contact.phone = overrides.phone ?? null;
  contact.company = overrides.company ?? null;
  contact.position = overrides.position ?? null;
  contact.profile = overrides.profile ?? { bio: 'Test profile' };
  contact.tags = overrides.tags ?? ['friend', 'work'];
  contact.note = overrides.note ?? null;
  contact.user = overrides.user ?? null;
  contact.userId = overrides.userId ?? null;
  contact.createdAt = overrides.createdAt ?? new Date();
  contact.updatedAt = overrides.updatedAt ?? new Date();
  return contact;
};

/**
 * Creates a test Conversation with default values that can be overridden
 */
export const createTestConversation = (overrides: Partial<Conversation> & { user?: User; userId?: string } = {}): Conversation => {
  const conversation = new Conversation();
  conversation.id = overrides.id || crypto.randomUUID();
  conversation.title = overrides.title ?? 'Test Conversation';
  conversation.content = overrides.content ?? 'Test content';
  conversation.embedding = overrides.embedding ?? null;
  conversation.parsedData = overrides.parsedData ?? {};
  conversation.isArchived = overrides.isArchived ?? false;
  conversation.status = overrides.status ?? 'active';
  conversation.user = overrides.user ?? createTestUser({ id: overrides.userId });
  conversation.userId = overrides.userId ?? conversation.user.id;
  conversation.contact = overrides.contact ?? null;
  conversation.contactId = overrides.contactId ?? null;
  conversation.createdAt = overrides.createdAt ?? new Date();
  conversation.updatedAt = overrides.updatedAt ?? new Date();
  return conversation;
};

/**
 * Creates a test Message with default values that can be overridden
 */
export const createTestMessage = (overrides: Partial<Message> = {}): Message => {
  const message = new Message();
  message.id = overrides.id || crypto.randomUUID();
  message.role = overrides.role ?? 'user';
  message.content = overrides.content ?? 'Test message';
  message.metadata = overrides.metadata ?? null;
  message.citations = overrides.citations ?? null;
  message.conversationId = overrides.conversationId ?? 'test-conversation-id';
  message.createdAtMs = overrides.createdAtMs ?? Date.now();
  message.status = overrides.status ?? 'active';
  message.createdAt = overrides.createdAt ?? new Date();
  return message;
};

/**
 * Creates a test Event with default values that can be overridden
 */
export const createTestEvent = (overrides: Partial<Event> = {}): Event => {
  const event = new Event();
  event.id = overrides.id || crypto.randomUUID();
  event.title = overrides.title ?? 'Test Event';
  event.description = overrides.description ?? 'Test description';
  event.details = overrides.details ?? { startTime: new Date().toISOString() };
  event.eventDate = overrides.eventDate ?? new Date();
  event.embedding = overrides.embedding ?? [];
  event.sourceConversationId = overrides.sourceConversationId ?? null;
  event.sourceMessageIds = overrides.sourceMessageIds ?? null;
  event.contactId = overrides.contactId ?? null;
  event.createdAt = overrides.createdAt ?? new Date();
  event.updatedAt = overrides.updatedAt ?? new Date();
  return event;
};

/**
 * Creates a test ContactFact with default values that can be overridden
 */
export const createTestContactFact = (overrides: Partial<ContactFact> = {}): ContactFact => {
  const fact = new ContactFact();
  fact.id = overrides.id || crypto.randomUUID();
  fact.content = overrides.content ?? 'Test fact';
  fact.metadata = overrides.metadata ?? null;
  fact.sourceConversationId = overrides.sourceConversationId ?? null;
  fact.sourceMessageIds = overrides.sourceMessageIds ?? null;
  fact.contactId = overrides.contactId ?? 'test-contact-id';
  fact.createdAt = overrides.createdAt ?? new Date();
  fact.updatedAt = overrides.updatedAt ?? new Date();
  return fact;
};

/**
 * Creates a test ContactTodo with default values that can be overridden
 */
export const createTestContactTodo = (overrides: Partial<ContactTodo> = {}): ContactTodo => {
  const todo = new ContactTodo();
  todo.id = overrides.id || crypto.randomUUID();
  todo.content = overrides.content ?? 'Test todo';
  todo.status = overrides.status ?? 'pending';
  todo.dueAt = overrides.dueAt ?? null;
  todo.metadata = overrides.metadata ?? null;
  todo.sourceConversationId = overrides.sourceConversationId ?? null;
  todo.sourceMessageIds = overrides.sourceMessageIds ?? null;
  todo.contactId = overrides.contactId ?? 'test-contact-id';
  todo.createdAt = overrides.createdAt ?? new Date();
  todo.updatedAt = overrides.updatedAt ?? new Date();
  return todo;
};

/**
 * Creates a test ContactBrief with default values that can be overridden
 */
export const createTestContactBrief = (overrides: Partial<ContactBrief> = {}): ContactBrief => {
  const brief = new ContactBrief();
  brief.id = overrides.id || crypto.randomUUID();
  brief.content = overrides.content ?? 'Test brief';
  brief.citations = overrides.citations ?? null;
  brief.generatedAt = overrides.generatedAt ?? new Date();
  brief.contactId = overrides.contactId ?? 'test-contact-id';
  brief.createdAt = overrides.createdAt ?? new Date();
  brief.updatedAt = overrides.updatedAt ?? new Date();
  return brief;
};

/**
 * Creates a mock TypeORM Repository with all common methods
 * This can be used as a base for specific repository mocks
 */
export const createMockRepository = () => ({
  find: jest.fn(),
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  findByIds: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  query: jest.fn(),
  createQueryBuilder: jest.fn(),
  clear: jest.fn(),
});

/**
 * Creates a mock QueryBuilder
 */
export const createMockQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  having: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
  execute: jest.fn(),
  setParameter: jest.fn().mockReturnThis(),
  setParameters: jest.fn().mockReturnThis(),
});

/**
 * Mock execution context for NestJS guards/interceptors
 */
export const createMockExecutionContext = (user?: Partial<User>) => ({
  switchToHttp: () => ({
    getRequest: () => ({
      user: user ? createTestUser(user) : undefined,
      headers: {},
      query: {},
      body: {},
      params: {},
    }),
    getResponse: () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    }),
  }),
  getClass: jest.fn(),
  getHandler: jest.fn(),
  getArgs: jest.fn(),
  getArgByIndex: jest.fn(),
  switchToRpc: jest.fn(),
  switchToWs: jest.fn(),
  getType: jest.fn(),
});

/**
 * Creates a mock JWT payload
 */
export const createMockJwtPayload = (overrides: Partial<{ userId: string; email: string }> = {}) => ({
  userId: overrides.userId ?? 'test-user-id',
  email: overrides.email ?? 'test@example.com',
  sub: overrides.userId ?? 'test-user-id',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
});
