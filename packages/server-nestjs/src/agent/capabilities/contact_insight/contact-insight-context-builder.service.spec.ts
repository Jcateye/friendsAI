import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactInsightContextBuilder } from './contact-insight-context-builder.service';
import { Contact } from '../../../entities/contact.entity';
import { Conversation } from '../../../entities/conversation.entity';
import { Event } from '../../../entities/event.entity';
import { ContactFact } from '../../../entities/contact-fact.entity';
import { ContactTodo } from '../../../entities/contact-todo.entity';

describe('ContactInsightContextBuilder', () => {
  let service: ContactInsightContextBuilder;
  let contactRepository: jest.Mocked<Repository<Contact>>;
  let conversationRepository: jest.Mocked<Repository<Conversation>>;
  let eventRepository: jest.Mocked<Repository<Event>>;
  let factRepository: jest.Mocked<Repository<ContactFact>>;
  let todoRepository: jest.Mocked<Repository<ContactTodo>>;

  const mockContact: Contact = {
    id: 'contact-123',
    userId: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Corp',
    position: 'CEO',
    tags: ['vip', 'prospect'],
    note: 'Met at conference',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as Contact;

  const mockConversations: Conversation[] = [
    {
      id: 'conv-1',
      userId: 'user-123',
      contactId: 'contact-123',
      title: 'Product Discussion',
      content: 'Discussed pricing',
      summary: 'Pricing inquiry',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    } as Conversation,
    {
      id: 'conv-2',
      userId: 'user-123',
      contactId: 'contact-123',
      title: 'Follow-up Call',
      content: 'Checked in',
      summary: 'Follow-up',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10'),
    } as Conversation,
  ];

  const mockEvents: Event[] = [
    {
      id: 'event-1',
      contactId: 'contact-123',
      title: 'Coffee Chat',
      description: 'Monthly catch-up',
      eventDate: new Date('2024-01-20'),
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
    } as Event,
  ];

  const mockFacts: ContactFact[] = [
    {
      id: 'fact-1',
      contactId: 'contact-123',
      content: 'Prefers morning meetings',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10'),
    } as ContactFact,
  ];

  const mockTodos: ContactTodo[] = [
    {
      id: 'todo-1',
      contactId: 'contact-123',
      content: 'Send proposal',
      status: 'pending',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10'),
    } as ContactTodo,
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactInsightContextBuilder,
        {
          provide: getRepositoryToken(Contact),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Conversation),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ContactFact),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ContactTodo),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContactInsightContextBuilder>(ContactInsightContextBuilder);
    contactRepository = module.get(getRepositoryToken(Contact));
    conversationRepository = module.get(getRepositoryToken(Conversation));
    eventRepository = module.get(getRepositoryToken(Event));
    factRepository = module.get(getRepositoryToken(ContactFact));
    todoRepository = module.get(getRepositoryToken(ContactTodo));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildContext', () => {
    it('should build context with standard depth', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue(mockConversations);
      eventRepository.find.mockResolvedValue(mockEvents);
      factRepository.find.mockResolvedValue(mockFacts);
      todoRepository.find.mockResolvedValue(mockTodos);

      const result = await service.buildContext(userId, contactId, 'standard');

      expect(result.contact).toEqual({
        id: 'contact-123',
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        position: 'CEO',
        tags: ['vip', 'prospect'],
        note: 'Met at conference',
        lastInteractionAt: new Date('2024-01-15'),
      });

      expect(result.recentInteractions).toHaveLength(2);
      expect(result.recentInteractions[0].id).toBe('conv-1');

      expect(result.archivedData.events).toHaveLength(1);
      expect(result.archivedData.facts).toHaveLength(1);
      expect(result.archivedData.todos).toHaveLength(1);

      expect(result.depth).toBe('standard');

      expect(conversationRepository.find).toHaveBeenCalledWith({
        where: { contactId, userId },
        order: { createdAt: 'DESC' },
        take: 10, // standard depth limit
      });
    });

    it('should build context with brief depth', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue(mockConversations);
      eventRepository.find.mockResolvedValue(mockEvents);
      factRepository.find.mockResolvedValue(mockFacts);
      todoRepository.find.mockResolvedValue(mockTodos);

      const result = await service.buildContext(userId, contactId, 'brief');

      expect(result.depth).toBe('brief');

      expect(conversationRepository.find).toHaveBeenCalledWith({
        where: { contactId, userId },
        order: { createdAt: 'DESC' },
        take: 5, // brief depth limit
      });

      expect(eventRepository.find).toHaveBeenCalledWith({
        where: { contactId },
        order: { createdAt: 'DESC' },
        take: 10, // brief archive limit
      });
    });

    it('should build context with deep depth', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue(mockConversations);
      eventRepository.find.mockResolvedValue(mockEvents);
      factRepository.find.mockResolvedValue(mockFacts);
      todoRepository.find.mockResolvedValue(mockTodos);

      const result = await service.buildContext(userId, contactId, 'deep');

      expect(result.depth).toBe('deep');

      expect(conversationRepository.find).toHaveBeenCalledWith({
        where: { contactId, userId },
        order: { createdAt: 'DESC' },
        take: 20, // deep depth limit
      });

      expect(eventRepository.find).toHaveBeenCalledWith({
        where: { contactId },
        order: { createdAt: 'DESC' },
        take: 50, // deep archive limit
      });
    });

    it('should throw NotFoundException when contact not found', async () => {
      const userId = 'user-123';
      const contactId = 'non-existent';

      contactRepository.findOne.mockResolvedValue(null);

      await expect(service.buildContext(userId, contactId)).rejects.toThrow(NotFoundException);
      await expect(service.buildContext(userId, contactId)).rejects.toThrow(
        'Contact non-existent not found'
      );
    });

    it('should handle contact with no interactions', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue([]);
      eventRepository.find.mockResolvedValue([]);
      factRepository.find.mockResolvedValue([]);
      todoRepository.find.mockResolvedValue([]);

      const result = await service.buildContext(userId, contactId);

      expect(result.recentInteractions).toHaveLength(0);
      expect(result.archivedData.events).toHaveLength(0);
      expect(result.archivedData.facts).toHaveLength(0);
      expect(result.archivedData.todos).toHaveLength(0);
      expect(result.contact.lastInteractionAt).toBeNull();
    });

    it('should set lastInteractionAt from most recent conversation', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue(mockConversations);
      eventRepository.find.mockResolvedValue([]);
      factRepository.find.mockResolvedValue([]);
      todoRepository.find.mockResolvedValue([]);

      const result = await service.buildContext(userId, contactId);

      expect(result.contact.lastInteractionAt).toEqual(new Date('2024-01-15'));
    });

    it('should load archived data in parallel', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue([]);

      const findPromises = [
        eventRepository.find({ where: { contactId }, order: { createdAt: 'DESC' }, take: 20 }),
        factRepository.find({ where: { contactId }, order: { createdAt: 'DESC' }, take: 20 }),
        todoRepository.find({ where: { contactId }, order: { createdAt: 'DESC' }, take: 20 }),
      ];

      // All three should be called
      eventRepository.find.mockResolvedValue(mockEvents);
      factRepository.find.mockResolvedValue(mockFacts);
      todoRepository.find.mockResolvedValue(mockTodos);

      await service.buildContext(userId, contactId);

      expect(eventRepository.find).toHaveBeenCalled();
      expect(factRepository.find).toHaveBeenCalled();
      expect(todoRepository.find).toHaveBeenCalled();
    });

    it('should limit conversations based on depth', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue([]);
      eventRepository.find.mockResolvedValue([]);
      factRepository.find.mockResolvedValue([]);
      todoRepository.find.mockResolvedValue([]);

      // Test brief depth
      await service.buildContext(userId, contactId, 'brief');
      expect(conversationRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );

      // Test standard depth
      jest.clearAllMocks();
      await service.buildContext(userId, contactId, 'standard');
      expect(conversationRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );

      // Test deep depth
      jest.clearAllMocks();
      await service.buildContext(userId, contactId, 'deep');
      expect(conversationRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 })
      );
    });

    it('should map conversation data correctly', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue(mockConversations);
      eventRepository.find.mockResolvedValue([]);
      factRepository.find.mockResolvedValue([]);
      todoRepository.find.mockResolvedValue([]);

      const result = await service.buildContext(userId, contactId);

      expect(result.recentInteractions).toEqual([
        {
          id: 'conv-1',
          summary: 'Pricing inquiry',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'conv-2',
          summary: 'Follow-up',
          createdAt: new Date('2024-01-10'),
        },
      ]);
    });

    it('should map event data correctly', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue([]);
      eventRepository.find.mockResolvedValue(mockEvents);
      factRepository.find.mockResolvedValue([]);
      todoRepository.find.mockResolvedValue([]);

      const result = await service.buildContext(userId, contactId);

      expect(result.archivedData.events).toEqual([
        {
          id: 'event-1',
          type: 'event',
          title: 'Coffee Chat',
          description: 'Monthly catch-up',
          eventDate: new Date('2024-01-20'),
        },
      ]);
    });

    it('should map fact data correctly', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue([]);
      eventRepository.find.mockResolvedValue([]);
      factRepository.find.mockResolvedValue(mockFacts);
      todoRepository.find.mockResolvedValue([]);

      const result = await service.buildContext(userId, contactId);

      expect(result.archivedData.facts).toEqual([
        {
          id: 'fact-1',
          content: 'Prefers morning meetings',
        },
      ]);
    });

    it('should map todo data correctly', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue([]);
      eventRepository.find.mockResolvedValue([]);
      factRepository.find.mockResolvedValue([]);
      todoRepository.find.mockResolvedValue(mockTodos);

      const result = await service.buildContext(userId, contactId);

      expect(result.archivedData.todos).toEqual([
        {
          id: 'todo-1',
          content: 'Send proposal',
          status: 'pending',
        },
      ]);
    });

    it('should handle null summary in conversations', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      const conversationsWithNullSummary = [
        {
          ...mockConversations[0],
          summary: null,
        },
      ];

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue(conversationsWithNullSummary);
      eventRepository.find.mockResolvedValue([]);
      factRepository.find.mockResolvedValue([]);
      todoRepository.find.mockResolvedValue([]);

      const result = await service.buildContext(userId, contactId);

      expect(result.recentInteractions[0].summary).toBeNull();
    });

    it('should default to standard depth when not specified', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue([]);
      eventRepository.find.mockResolvedValue([]);
      factRepository.find.mockResolvedValue([]);
      todoRepository.find.mockResolvedValue([]);

      // Not passing depth parameter
      const result = await service.buildContext(userId, contactId);

      expect(result.depth).toBe('standard');
    });
  });

  describe('data validation', () => {
    it('should only load contacts belonging to the user', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue([]);
      eventRepository.find.mockResolvedValue([]);
      factRepository.find.mockResolvedValue([]);
      todoRepository.find.mockResolvedValue([]);

      await service.buildContext(userId, contactId);

      expect(contactRepository.findOne).toHaveBeenCalledWith({
        where: { id: contactId, userId },
      });
    });

    it('should only load conversations belonging to the user', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue([]);
      eventRepository.find.mockResolvedValue([]);
      factRepository.find.mockResolvedValue([]);
      todoRepository.find.mockResolvedValue([]);

      await service.buildContext(userId, contactId);

      expect(conversationRepository.find).toHaveBeenCalledWith({
        where: { contactId, userId },
        order: { createdAt: 'DESC' },
        take: 10,
      });
    });
  });
});
