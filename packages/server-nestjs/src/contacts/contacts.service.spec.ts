import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, QueryFailedError, In } from 'typeorm';
import { Contact, ContactFact, ContactTodo, ContactBrief, Event, Conversation, ConversationArchive, Message, ToolConfirmation } from '../entities';

describe('ContactsService', () => {
  let service: ContactsService;
  let contactRepository: jest.Mocked<Repository<Contact>>;

  // Mock test data
  const mockUserId = 'test-user-id';
  const mockContactId = 'contact-1';

  const mockContact: Contact = {
    id: mockContactId,
    name: '张伟',
    email: 'zhangwei@example.com',
    phone: '13800138000',
    company: '某投资公司',
    position: '合伙人',
    tags: ['投资人', '重要'],
    note: '测试备注',
    profile: { wechat: 'zhangwei_wx' },
    alias: null,
    userId: mockUserId,
    events: [],
    facts: [],
    todos: [],
    briefs: [],
    conversations: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockContactWithRelations: Contact = {
    ...mockContact,
    events: [
      {
        id: 'event-1',
        title: '项目讨论',
        description: '讨论了Q1投资计划',
        eventDate: new Date('2026-01-28'),
        contactId: mockContactId,
        embedding: null,
        sourceConversationId: null,
        sourceMessageIds: null,
        details: null,
        createdAt: new Date('2026-01-28'),
        updatedAt: new Date('2026-01-28'),
        contact: null,
      },
    ],
    facts: [
      {
        id: 'fact-1',
        content: '专注AI领域投资',
        contactId: mockContactId,
        sourceConversationId: 'conv-1',
        createdAt: new Date('2026-01-01'),
        contact: null,
      },
    ],
    todos: [
      {
        id: 'todo-1',
        content: '发送项目BP',
        contactId: mockContactId,
        dueAt: new Date('2026-02-01'),
        sourceConversationId: 'conv-1',
        createdAt: new Date('2026-01-01'),
        contact: null,
      },
    ],
    conversations: [],
  };

  beforeEach(async () => {
    // Create mock repository
    const mockRepositoryFactory = {
      provide: getRepositoryToken(Contact),
      useFactory: () => ({
        create: jest.fn(),
        save: jest.fn(),
        findAndCount: jest.fn(),
        findOne: jest.fn(),
        manager: {
          transaction: jest.fn(),
          getRepository: jest.fn(),
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactsService, mockRepositoryFactory],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    contactRepository = module.get(getRepositoryToken(Contact));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new contact successfully', async () => {
      const createDto = {
        name: '李明',
        email: 'liming@example.com',
        phone: '13900139000',
        company: 'ABC公司',
        position: 'CTO',
        tags: ['合作伙伴'],
      };

      contactRepository.create.mockReturnValue(mockContact);
      contactRepository.save.mockResolvedValue(mockContact);

      const result = await service.create(createDto, mockUserId);

      expect(contactRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '李明',
          email: 'liming@example.com',
          userId: mockUserId,
        }),
      );
      expect(contactRepository.save).toHaveBeenCalledWith(mockContact);
      expect(result).toEqual(mockContact);
    });

    it('should create a contact without userId', async () => {
      const createDto = { name: '王芳' };

      contactRepository.create.mockReturnValue(mockContact);
      contactRepository.save.mockResolvedValue(mockContact);

      await service.create(createDto);

      expect(contactRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null }),
      );
    });

    it('should throw BadRequestException when name is missing', async () => {
      const createDto = { email: 'test@example.com' };

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        new BadRequestException('displayName is required'),
      );

      expect(contactRepository.create).not.toHaveBeenCalled();
      expect(contactRepository.save).not.toHaveBeenCalled();
    });

    it('should handle profile data correctly', async () => {
      const createDto = {
        name: '测试用户',
        profile: { wechat: 'test_wx', linkedin: 'test-linkedin' },
      };

      contactRepository.create.mockReturnValue(mockContact);
      contactRepository.save.mockResolvedValue(mockContact);

      await service.create(createDto, mockUserId);

      expect(contactRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: { wechat: 'test_wx', linkedin: 'test-linkedin' },
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated contacts for a user', async () => {
      const mockContacts = [mockContact, { ...mockContact, id: 'contact-2', name: '李明' }];
      const mockTotal = 2;

      (contactRepository.findAndCount as jest.Mock).mockResolvedValue([
        mockContacts,
        mockTotal,
      ]);

      const result = await service.findAll(mockUserId, 1, 10);

      expect(contactRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({ items: mockContacts, total: mockTotal });
    });

    it('should return all contacts when userId is not provided', async () => {
      const mockContacts = [mockContact];
      const mockTotal = 1;

      (contactRepository.findAndCount as jest.Mock).mockResolvedValue([
        mockContacts,
        mockTotal,
      ]);

      const result = await service.findAll(undefined, 1, 10);

      expect(contactRepository.findAndCount).toHaveBeenCalledWith({
        where: undefined,
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({ items: mockContacts, total: mockTotal });
    });

    it('should handle pagination correctly', async () => {
      const mockContacts = [mockContact];
      const mockTotal = 25;

      (contactRepository.findAndCount as jest.Mock).mockResolvedValue([mockContacts, mockTotal]);

      const result = await service.findAll(mockUserId, 2, 10);

      expect(contactRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        skip: 10,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result.total).toBe(25);
    });

    it('should return empty array when no contacts exist', async () => {
      (contactRepository.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

      const result = await service.findAll(mockUserId, 1, 10);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a contact with relations', async () => {
      contactRepository.findOne.mockResolvedValue(mockContactWithRelations);

      const result = await service.findOne(mockContactId, mockUserId);

      expect(contactRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockContactId, userId: mockUserId },
        relations: ['events', 'conversations'],
      });
      expect(result).toEqual(mockContactWithRelations);
    });

    it('should return a contact without userId filter', async () => {
      contactRepository.findOne.mockResolvedValue(mockContact);

      const result = await service.findOne(mockContactId);

      expect(contactRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockContactId },
        relations: ['events', 'conversations'],
      });
      expect(result).toEqual(mockContact);
    });

    it('should throw NotFoundException when contact not found', async () => {
      contactRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id', mockUserId)).rejects.toThrow(
        new NotFoundException('Contact not found'),
      );
    });

    it('should throw NotFoundException for different user', async () => {
      contactRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockContactId, 'different-user-id')).rejects.toThrow(
        new NotFoundException('Contact not found'),
      );
    });
  });

  describe('update', () => {
    it('should update contact fields successfully', async () => {
      const updateDto = {
        name: '张伟更新',
        email: 'newemail@example.com',
        tags: ['更新标签'],
      };

      const updatedContact = { ...mockContact, ...updateDto };

      contactRepository.findOne.mockResolvedValue(mockContact);
      contactRepository.save.mockResolvedValue(updatedContact);

      const result = await service.update(mockContactId, updateDto, mockUserId);

      expect(contactRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockContactId, userId: mockUserId },
        relations: ['events', 'conversations'],
      });
      expect(contactRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '张伟更新',
          email: 'newemail@example.com',
          tags: ['更新标签'],
        }),
      );
      expect(result).toEqual(updatedContact);
    });

    it('should partially update contact', async () => {
      const updateDto = { phone: '13999999999' };

      const updatedContact = { ...mockContact, phone: '13999999999' };

      contactRepository.findOne.mockResolvedValue(mockContact);
      contactRepository.save.mockResolvedValue(updatedContact);

      const result = await service.update(mockContactId, updateDto, mockUserId);

      expect(result.phone).toBe('13999999999');
      expect(result.name).toBe(mockContact.name); // unchanged
    });

    it('should throw NotFoundException when updating non-existent contact', async () => {
      contactRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: '新名字' }, mockUserId),
      ).rejects.toThrow(new NotFoundException('Contact not found'));

      expect(contactRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getContactContext', () => {
    beforeEach(() => {
      contactRepository.findOne.mockResolvedValue(mockContactWithRelations);
    });

    it('should return complete contact context', async () => {
      const result = await service.getContactContext(mockContactId, mockUserId);

      expect(contactRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockContactId, userId: mockUserId },
        relations: ['events', 'conversations', 'facts', 'todos'],
      });

      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('facts');
      expect(result).toHaveProperty('todos');
      expect(result).toHaveProperty('recentEvents');
      expect(result).toHaveProperty('stableFacts');
      expect(result).toHaveProperty('openActions');
    });

    it('should map facts correctly', async () => {
      const result = await service.getContactContext(mockContactId, mockUserId);

      expect(result.facts).toHaveLength(1);
      expect(result.facts[0]).toEqual({
        id: 'fact-1',
        content: '专注AI领域投资',
        conversationId: 'conv-1',
        createdAt: mockContactWithRelations.facts![0].createdAt,
      });
    });

    it('should map todos correctly', async () => {
      const result = await service.getContactContext(mockContactId, mockUserId);

      expect(result.todos).toHaveLength(1);
      expect(result.todos[0]).toEqual({
        id: 'todo-1',
        content: '发送项目BP',
        dueDate: new Date('2026-02-01').toISOString(),
        conversationId: 'conv-1',
        createdAt: mockContactWithRelations.todos![0].createdAt,
      });
    });

    it('should map recent events correctly', async () => {
      const result = await service.getContactContext(mockContactId, mockUserId);

      expect(result.recentEvents).toHaveLength(1);
      expect(result.recentEvents[0]).toEqual({
        id: 'event-1',
        title: '项目讨论',
        summary: '讨论了Q1投资计划',
        occurredAt: new Date('2026-01-28'),
        occurred_at: new Date('2026-01-28'),
      });
    });

    it('should create stableFacts from facts', async () => {
      const result = await service.getContactContext(mockContactId, mockUserId);

      expect(result.stableFacts).toHaveLength(1);
      expect(result.stableFacts[0]).toEqual({ content: '专注AI领域投资' });
    });

    it('should create openActions from todos', async () => {
      const result = await service.getContactContext(mockContactId, mockUserId);

      expect(result.openActions).toHaveLength(1);
      expect(result.openActions[0]).toEqual({
        id: 'todo-1',
        suggestion_reason: '发送项目BP',
        due_at: new Date('2026-02-01').toISOString(),
      });
    });

    it('should handle contact without relations', async () => {
      contactRepository.findOne.mockResolvedValue(mockContact);

      const result = await service.getContactContext(mockContactId, mockUserId);

      expect(result.events).toEqual([]);
      expect(result.facts).toEqual([]);
      expect(result.todos).toEqual([]);
      expect(result.recentEvents).toEqual([]);
      expect(result.stableFacts).toEqual([]);
      expect(result.openActions).toEqual([]);
    });

    it('should throw NotFoundException for non-existent contact', async () => {
      contactRepository.findOne.mockResolvedValue(null);

      await expect(service.getContactContext('non-existent-id', mockUserId)).rejects.toThrow(
        new NotFoundException('Contact not found'),
      );
    });

    it('should handle null dueAt in todos', async () => {
      const contactWithNullDueAt = {
        ...mockContactWithRelations,
        todos: [
          {
            id: 'todo-1',
            content: '无截止日期任务',
            contactId: mockContactId,
            dueAt: null,
            sourceConversationId: null,
            createdAt: new Date('2026-01-01'),
            contact: null,
          },
        ],
      };

      contactRepository.findOne.mockResolvedValue(contactWithNullDueAt);

      const result = await service.getContactContext(mockContactId, mockUserId);

      expect(result.todos[0].dueDate).toBeNull();
      expect(result.openActions[0].due_at).toBeNull();
    });

    it('should sort events by date descending', async () => {
      const contactWithMultipleEvents = {
        ...mockContactWithRelations,
        events: [
          {
            id: 'event-1',
            title: '早期事件',
            description: 'desc1',
            eventDate: new Date('2026-01-01'),
            contactId: mockContactId,
            embedding: null,
            sourceConversationId: null,
            sourceMessageIds: null,
            details: null,
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
            contact: null,
          },
          {
            id: 'event-2',
            title: '晚期事件',
            description: 'desc2',
            eventDate: new Date('2026-02-01'),
            contactId: mockContactId,
            embedding: null,
            sourceConversationId: null,
            sourceMessageIds: null,
            details: null,
            createdAt: new Date('2026-02-01'),
            updatedAt: new Date('2026-02-01'),
            contact: null,
          },
        ],
      };

      contactRepository.findOne.mockResolvedValue(contactWithMultipleEvents);

      const result = await service.getContactContext(mockContactId, mockUserId);

      expect(result.events[0].title).toBe('晚期事件');
      expect(result.events[1].title).toBe('早期事件');
    });
  });

  describe('remove', () => {
    const mockTransactionManager = {
      getRepository: jest.fn(),
    };

    const mockContactRepo = {
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const mockConversationRepo = {
      find: jest.fn(),
      delete: jest.fn(),
    };

    const mockMessageRepo = {
      delete: jest.fn(),
    };

    const mockArchiveRepo = {
      delete: jest.fn(),
    };

    const mockToolConfirmationRepo = {
      delete: jest.fn(),
    };

    const mockEventRepo = {
      delete: jest.fn(),
    };

    const mockFactRepo = {
      delete: jest.fn(),
    };

    const mockTodoRepo = {
      delete: jest.fn(),
    };

    const mockBriefRepo = {
      delete: jest.fn(),
    };

    beforeEach(() => {
      mockTransactionManager.getRepository.mockImplementation((entity) => {
        if (entity === Contact) return mockContactRepo;
        if (entity === Conversation) return mockConversationRepo;
        if (entity === Message) return mockMessageRepo;
        if (entity === ConversationArchive) return mockArchiveRepo;
        if (entity === ToolConfirmation) return mockToolConfirmationRepo;
        if (entity === Event) return mockEventRepo;
        if (entity === ContactFact) return mockFactRepo;
        if (entity === ContactTodo) return mockTodoRepo;
        if (entity === ContactBrief) return mockBriefRepo;
      });

      (contactRepository.manager.transaction as jest.Mock).mockImplementation(
        (callback) => callback(mockTransactionManager),
      );

      mockContactRepo.findOne.mockResolvedValue(mockContact);
      mockConversationRepo.find.mockResolvedValue([]);
    });

    it('should delete contact successfully', async () => {
      await service.remove(mockContactId, mockUserId);

      expect(mockContactRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockContactId, userId: mockUserId },
      });

      expect(mockConversationRepo.find).toHaveBeenCalledWith({
        select: { id: true },
        where: { contactId: mockContactId },
      });

      expect(mockEventRepo.delete).toHaveBeenCalledWith({ contactId: mockContactId });
      expect(mockFactRepo.delete).toHaveBeenCalledWith({ contactId: mockContactId });
      expect(mockTodoRepo.delete).toHaveBeenCalledWith({ contactId: mockContactId });
      expect(mockBriefRepo.delete).toHaveBeenCalledWith({ contactId: mockContactId });
      expect(mockContactRepo.delete).toHaveBeenCalledWith({ id: mockContactId });
    });

    it('should delete contact with related conversations', async () => {
      const mockConversations = [
        { id: 'conv-1' },
        { id: 'conv-2' },
      ];

      mockConversationRepo.find.mockResolvedValue(mockConversations);

      await service.remove(mockContactId, mockUserId);

      expect(mockMessageRepo.delete).toHaveBeenCalled();
      expect(mockArchiveRepo.delete).toHaveBeenCalled();
      expect(mockToolConfirmationRepo.delete).toHaveBeenCalled();
      expect(mockConversationRepo.delete).toHaveBeenCalled();

      // Verify the delete was called with In operator containing conversation IDs
      const messageDeleteCall = mockMessageRepo.delete.mock.calls[0][0];
      expect(messageDeleteCall.conversationId).toBeDefined();
    });

    it('should throw NotFoundException when contact not found', async () => {
      mockContactRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id', mockUserId)).rejects.toThrow(
        new NotFoundException('Contact not found'),
      );
    });

    it('should handle foreign key constraint errors', async () => {
      const driverError = {
        code: '23503',
        constraint: 'fk_constraint_name',
      };

      const queryFailedError = new QueryFailedError('query', [], driverError);

      mockContactRepo.findOne.mockResolvedValue(mockContact);
      mockBriefRepo.delete.mockRejectedValue(queryFailedError);

      await expect(service.remove(mockContactId, mockUserId)).rejects.toThrow(
        new ConflictException('Contact deletion blocked by foreign key constraint: fk_constraint_name'),
      );
    });

    it('should delete contact without userId', async () => {
      mockConversationRepo.find.mockResolvedValue([]);
      mockBriefRepo.delete.mockResolvedValue(null);

      await service.remove(mockContactId);

      expect(mockContactRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockContactId },
      });
    });

    it('should not delete conversations when contact has no conversations', async () => {
      mockConversationRepo.find.mockResolvedValue([]);
      mockBriefRepo.delete.mockResolvedValue(null);

      await service.remove(mockContactId, mockUserId);

      expect(mockMessageRepo.delete).not.toHaveBeenCalled();
      expect(mockArchiveRepo.delete).not.toHaveBeenCalled();
      expect(mockToolConfirmationRepo.delete).not.toHaveBeenCalled();
      expect(mockConversationRepo.delete).not.toHaveBeenCalled();
    });

    it('should re-throw unknown errors', async () => {
      const unknownError = new Error('Unknown error');

      // Create fresh transaction mock for this test
      const freshTransactionManager = {
        getRepository: jest.fn(),
      };

      const freshContactRepo = {
        findOne: jest.fn().mockResolvedValue(mockContact),
        delete: jest.fn(),
      };

      const freshConversationRepo = {
        find: jest.fn().mockResolvedValue([]),
        delete: jest.fn(),
      };

      const freshBriefRepo = {
        delete: jest.fn().mockRejectedValue(unknownError),
      };

      const freshEventRepo = { delete: jest.fn().mockResolvedValue(null) };
      const freshFactRepo = { delete: jest.fn().mockResolvedValue(null) };
      const freshTodoRepo = { delete: jest.fn().mockResolvedValue(null) };
      const freshMessageRepo = { delete: jest.fn() };
      const freshArchiveRepo = { delete: jest.fn() };
      const freshToolConfirmationRepo = { delete: jest.fn() };

      freshTransactionManager.getRepository.mockImplementation((entity) => {
        if (entity === Contact) return freshContactRepo;
        if (entity === Conversation) return freshConversationRepo;
        if (entity === Message) return freshMessageRepo;
        if (entity === ConversationArchive) return freshArchiveRepo;
        if (entity === ToolConfirmation) return freshToolConfirmationRepo;
        if (entity === Event) return freshEventRepo;
        if (entity === ContactFact) return freshFactRepo;
        if (entity === ContactTodo) return freshTodoRepo;
        if (entity === ContactBrief) return freshBriefRepo;
      });

      (contactRepository.manager.transaction as jest.Mock).mockImplementationOnce(
        (callback) => callback(freshTransactionManager),
      );

      await expect(service.remove(mockContactId, mockUserId)).rejects.toThrow('Unknown error');
    });

    it('should handle deletion in transaction', async () => {
      await service.remove(mockContactId, mockUserId);

      expect(contactRepository.manager.transaction).toHaveBeenCalled();

      const transactionCallback = (contactRepository.manager.transaction as jest.Mock).mock.calls[0][0];
      expect(typeof transactionCallback).toBe('function');
    });
  });
});
