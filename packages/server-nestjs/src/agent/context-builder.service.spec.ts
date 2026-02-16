import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContextBuilderService } from './context-builder.service';
import { VectorService } from '../ai/vector/vector.service';
import { User, Contact, Conversation, ConnectorToken } from '../entities';
import { BuildContextParams } from './context-builder.types';

describe('ContextBuilderService', () => {
  let service: ContextBuilderService;
  let userRepository: Repository<User>;
  let contactRepository: Repository<Contact>;
  let conversationRepository: Repository<Conversation>;
  let connectorTokenRepository: Repository<ConnectorToken>;
  let vectorService: VectorService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    phone: '+1234567890',
    name: 'Test User',
  };

  const mockContacts = [
    {
      id: 'contact-1',
      name: 'Alice Wang',
      email: 'alice@example.com',
      phone: '+1111111111',
      company: 'TechCorp',
      position: 'Engineer',
      profile: null,
      tags: ['vip', 'partner'],
      userId: 'user-123',
      user: null,
      events: [],
      conversations: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    },
    {
      id: 'contact-2',
      name: 'Bob Chen',
      email: 'bob@example.com',
      phone: '+2222222222',
      company: 'StartupInc',
      position: 'Manager',
      profile: null,
      tags: ['client'],
      userId: 'user-123',
      user: null,
      events: [],
      conversations: [],
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-04'),
    },
  ];

  const mockConversations = [
    {
      id: 'conv-1',
      content: 'Hello, how are you?',
      embedding: null,
      parsedData: { sentiment: 'positive' },
      isArchived: false,
      userId: 'user-123',
      user: null,
      contactId: 'contact-1',
      contact: null,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: 'conv-2',
      content: 'Project update meeting',
      embedding: null,
      parsedData: null,
      isArchived: false,
      userId: 'user-123',
      user: null,
      contactId: 'contact-2',
      contact: null,
      createdAt: new Date('2024-01-02T14:00:00Z'),
      updatedAt: new Date('2024-01-02T14:00:00Z'),
    },
  ];

  const mockConnectorTokens = [
    {
      id: 'token-1',
      connectorType: 'google',
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      tokenType: 'Bearer',
      scope: 'email profile',
      expiresAt: new Date('2025-01-01'),
      metadata: { provider: 'oauth2' },
      userId: 'user-123',
      user: mockUser as User,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockContactRepository = {
    find: jest.fn(),
  };

  const mockConversationRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockConnectorTokenRepository = {
    find: jest.fn(),
  };

  const mockVectorService = {
    aiService: {
      generateEmbedding: jest.fn(() => Promise.resolve(mockEmbedding)),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextBuilderService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Contact), useValue: mockContactRepository },
        { provide: getRepositoryToken(Conversation), useValue: mockConversationRepository },
        { provide: getRepositoryToken(ConnectorToken), useValue: mockConnectorTokenRepository },
        { provide: VectorService, useValue: mockVectorService },
      ],
    }).compile();

    service = module.get<ContextBuilderService>(ContextBuilderService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    contactRepository = module.get<Repository<Contact>>(getRepositoryToken(Contact));
    conversationRepository = module.get<Repository<Conversation>>(getRepositoryToken(Conversation));
    connectorTokenRepository = module.get<Repository<ConnectorToken>>(
      getRepositoryToken(ConnectorToken),
    );
    vectorService = module.get<VectorService>(VectorService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildGlobalContext', () => {
    it('should build global context with user info', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockContactRepository.find.mockResolvedValue([]);
      mockConnectorTokenRepository.find.mockResolvedValue([]);

      const result = await service.buildGlobalContext({
        userId: 'user-123',
        includeContacts: false,
        includeConnectors: false,
      });

      expect(result.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        phone: '+1234567890',
        name: 'Test User',
      });
      expect(result.contacts).toBeUndefined();
      expect(result.connectors).toBeUndefined();
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.buildGlobalContext({
          userId: 'non-existent-user',
        }),
      ).rejects.toThrow('User not found: non-existent-user');
    });

    it('should include contacts when includeContacts is true', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockContactRepository.find.mockResolvedValue(mockContacts);
      mockConnectorTokenRepository.find.mockResolvedValue([]);

      const result = await service.buildGlobalContext({
        userId: 'user-123',
        includeContacts: true,
        includeConnectors: false,
        contactsLimit: 50,
      });

      expect(result.contacts).toHaveLength(2);
      expect(result.contacts![0]).toEqual({
        id: 'contact-1',
        name: 'Alice Wang',
        initial: 'A',
        avatarColor: expect.any(String),
        company: 'TechCorp',
        role: 'Engineer',
        tags: ['vip', 'partner'],
      });
      expect(contactRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        take: 50,
        order: { updatedAt: 'DESC' },
      });
    });

    it('should include connectors when includeConnectors is true', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockContactRepository.find.mockResolvedValue([]);
      mockConnectorTokenRepository.find.mockResolvedValue(mockConnectorTokens);

      const result = await service.buildGlobalContext({
        userId: 'user-123',
        includeContacts: false,
        includeConnectors: true,
      });

      expect(result.connectors).toHaveLength(1);
      expect(result.connectors![0]).toEqual({
        type: 'google',
        id: 'token-1',
        name: 'google',
        enabled: true,
      });
    });
  });

  describe('buildSessionContext', () => {
    it('should build session context with basic info', async () => {
      const result = await service.buildSessionContext({
        sessionId: 'session-456',
        userId: 'user-123',
        includeHistory: false,
        useVectorSearch: false,
      });

      expect(result.sessionId).toBe('session-456');
      expect(result.history).toBeUndefined();
      expect(result.references).toBeUndefined();
    });

    it('should include conversation history when includeHistory is true', async () => {
      mockConversationRepository.find.mockResolvedValue(mockConversations);

      const result = await service.buildSessionContext({
        sessionId: 'session-456',
        conversationId: 'conv-1',
        userId: 'user-123',
        includeHistory: true,
        historyLimit: 20,
        useVectorSearch: false,
      });

      expect(result.conversationId).toBe('conv-1');
      expect(result.history).toHaveLength(2);
      expect(result.history![0]).toEqual({
        id: 'conv-1',
        role: 'user',
        content: 'Hello, how are you?',
        createdAt: '2024-01-01T10:00:00.000Z',
        metadata: { sentiment: 'positive' },
      });
      expect(conversationRepository.find).toHaveBeenCalledWith({
        where: { id: 'conv-1', userId: 'user-123' },
        take: 20,
        order: { createdAt: 'DESC' },
      });
    });

    it('should perform vector search when useVectorSearch is true', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockConversations[0]]),
      };

      mockConversationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.buildSessionContext({
        sessionId: 'session-456',
        userId: 'user-123',
        includeHistory: false,
        useVectorSearch: true,
        vectorSearchQuery: 'project discussion',
        vectorSearchLimit: 5,
      });

      expect(result.references).toBeDefined();
      expect(result.references!.length).toBeGreaterThan(0);
      expect(vectorService.aiService.generateEmbedding).toHaveBeenCalledWith('project discussion');
    });
  });

  describe('buildRequestContext', () => {
    it('should build request context with all params', async () => {
      const result = await service.buildRequestContext({
        requestId: 'req-789',
        traceId: 'trace-abc',
        input: 'User query text',
        channel: 'web',
        metadata: { source: 'dashboard' },
      });

      expect(result).toEqual({
        requestId: 'req-789',
        traceId: 'trace-abc',
        input: 'User query text',
        channel: 'web',
        metadata: { source: 'dashboard' },
      });
    });

    it('should build request context with minimal params', async () => {
      const result = await service.buildRequestContext({
        requestId: 'req-789',
      });

      expect(result).toEqual({
        requestId: 'req-789',
        traceId: undefined,
        input: undefined,
        channel: undefined,
        metadata: undefined,
      });
    });
  });

  describe('buildContext', () => {
    it('should build complete three-layer context', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockContactRepository.find.mockResolvedValue(mockContacts);
      mockConversationRepository.find.mockResolvedValue(mockConversations);
      mockConnectorTokenRepository.find.mockResolvedValue(mockConnectorTokens);

      const params: BuildContextParams = {
        userId: 'user-123',
        sessionId: 'session-456',
        requestId: 'req-789',
        conversationId: 'conv-1',
        options: {
          includeContacts: true,
          includeHistory: true,
          includeConnectors: true,
          historyLimit: 20,
          contactsLimit: 50,
          useVectorSearch: false,
        },
        requestContext: {
          input: 'Hello world',
          channel: 'web',
        },
      };

      const result = await service.buildContext(params);

      expect(result.global).toBeDefined();
      expect(result.global.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        phone: '+1234567890',
        name: 'Test User',
      });
      expect(result.global.contacts).toHaveLength(2);
      expect(result.global.connectors).toHaveLength(1);

      expect(result.session).toBeDefined();
      expect(result.session.sessionId).toBe('session-456');
      expect(result.session.conversationId).toBe('conv-1');
      expect(result.session.history).toHaveLength(2);

      expect(result.request).toBeDefined();
      expect(result.request.requestId).toBe('req-789');
      expect(result.request.input).toBe('Hello world');
      expect(result.request.channel).toBe('web');
    });

    it('should build context with minimal options', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const params: BuildContextParams = {
        userId: 'user-123',
        sessionId: 'session-456',
        requestId: 'req-789',
      };

      const result = await service.buildContext(params);

      expect(result.global).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.request).toBeDefined();
    });

    it('should handle parallel context building', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockContactRepository.find.mockResolvedValue(mockContacts);
      mockConversationRepository.find.mockResolvedValue(mockConversations);
      mockConnectorTokenRepository.find.mockResolvedValue(mockConnectorTokens);

      const startTime = Date.now();

      await service.buildContext({
        userId: 'user-123',
        sessionId: 'session-456',
        requestId: 'req-789',
        options: {
          includeContacts: true,
          includeHistory: true,
          includeConnectors: true,
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000);
      expect(userRepository.findOne).toHaveBeenCalled();
      expect(contactRepository.find).toHaveBeenCalled();
      expect(connectorTokenRepository.find).toHaveBeenCalled();
    });
  });

  describe('mapContactToClient', () => {
    it('should map contact entity to client format', () => {
      const contact = mockContacts[0] as Contact;
      const result = service['mapContactToClient'](contact);

      expect(result).toEqual({
        id: 'contact-1',
        name: 'Alice Wang',
        initial: 'A',
        avatarColor: expect.any(String),
        company: 'TechCorp',
        role: 'Engineer',
        tags: ['vip', 'partner'],
      });
    });

    it('should handle null fields correctly', () => {
      const contact = {
        ...mockContacts[0],
        company: null,
        position: null,
        tags: null,
      } as Contact;

      const result = service['mapContactToClient'](contact);

      expect(result.company).toBeUndefined();
      expect(result.role).toBeUndefined();
      expect(result.tags).toBeUndefined();
    });
  });

  describe('generateAvatarColor', () => {
    it('should generate consistent color for same ID', () => {
      const color1 = service['generateAvatarColor']('contact-1');
      const color2 = service['generateAvatarColor']('contact-1');

      expect(color1).toBe(color2);
      expect(color1).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should generate different colors for different IDs', () => {
      const color1 = service['generateAvatarColor']('contact-1');
      const color2 = service['generateAvatarColor']('contact-2');

      expect(color1).toMatch(/^#[0-9A-F]{6}$/i);
      expect(color2).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});
