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
export const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: overrides.id || crypto.randomUUID(),
  email: overrides.email ?? 'test@example.com',
  phone: overrides.phone ?? null,
  password: overrides.password ?? 'hashed-password',
  name: overrides.name ?? 'Test User',
  contacts: [],
  conversations: [],
  toolConfirmations: [],
  connectorTokens: [],
  authSessions: [],
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
});

/**
 * Creates a test Contact with default values that can be overridden
 */
export const createTestContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: overrides.id || crypto.randomUUID(),
  name: overrides.name ?? 'Test Contact',
  alias: overrides.alias ?? null,
  email: overrides.email ?? 'contact@example.com',
  phone: overrides.phone ?? null,
  company: overrides.company ?? null,
  position: overrides.position ?? null,
  profile: overrides.profile ?? { bio: 'Test profile' },
  tags: overrides.tags ?? ['friend', 'work'],
  note: overrides.note ?? null,
  user: overrides.user ?? null,
  userId: overrides.userId ?? null,
  events: [],
  facts: [],
  todos: [],
  briefs: [],
  conversations: [],
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
});

/**
 * Creates a test Conversation with default values that can be overridden
 */
export const createTestConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: overrides.id || crypto.randomUUID(),
  title: overrides.title ?? 'Test Conversation',
  content: overrides.content ?? 'Test content',
  embedding: overrides.embedding ?? null,
  parsedData: overrides.parsedData ?? {},
  isArchived: overrides.isArchived ?? false,
  status: overrides.status ?? 'active',
  user: overrides.user ?? null,
  userId: overrides.userId ?? 'test-user-id',
  contact: overrides.contact ?? null,
  contactId: overrides.contactId ?? null,
  messages: [],
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
});

/**
 * Creates a test Message with default values that can be overridden
 */
export const createTestMessage = (overrides: Partial<Message> = {}): Message => ({
  id: overrides.id || crypto.randomUUID(),
  role: overrides.role ?? 'user',
  content: overrides.content ?? 'Test message',
  toolCalls: overrides.toolCalls ?? null,
  toolCallId: overrides.toolCallId ?? null,
  conversationId: overrides.conversationId ?? 'test-conversation-id',
  createdAt: overrides.createdAt ?? new Date(),
});

/**
 * Creates a test Event with default values that can be overridden
 */
export const createTestEvent = (overrides: Partial<Event> = {}): Event => ({
  id: overrides.id || crypto.randomUUID(),
  title: overrides.title ?? 'Test Event',
  description: overrides.description ?? 'Test description',
  startTime: overrides.startTime ?? new Date(),
  endTime: overrides.endTime ?? new Date(Date.now() + 3600000),
  location: overrides.location ?? null,
  contactId: overrides.contactId ?? null,
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
});

/**
 * Creates a test ContactFact with default values that can be overridden
 */
export const createTestContactFact = (overrides: Partial<ContactFact> = {}): ContactFact => ({
  id: overrides.id || crypto.randomUUID(),
  fact: overrides.fact ?? 'Test fact',
  source: overrides.source ?? 'test',
  contactId: overrides.contactId ?? 'test-contact-id',
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
});

/**
 * Creates a test ContactTodo with default values that can be overridden
 */
export const createTestContactTodo = (overrides: Partial<ContactTodo> = {}): ContactTodo => ({
  id: overrides.id || crypto.randomUUID(),
  todo: overrides.todo ?? 'Test todo',
  status: overrides.status ?? 'pending',
  dueDate: overrides.dueDate ?? null,
  contactId: overrides.contactId ?? 'test-contact-id',
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
});

/**
 * Creates a test ContactBrief with default values that can be overridden
 */
export const createTestContactBrief = (overrides: Partial<ContactBrief> = {}): ContactBrief => ({
  id: overrides.id || crypto.randomUUID(),
  content: overrides.content ?? 'Test brief',
  contactId: overrides.contactId ?? 'test-contact-id',
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
});

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
      user: user ? createTestUser(user) : null,
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
