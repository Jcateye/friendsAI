import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BriefingService } from '../src/briefings/briefing/briefing.service';
import { AiService } from '../src/ai/ai.service';
import { Conversation, Contact, Event, User } from '../src/entities';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

interface ContactBriefing {
  lastSummary: string;
  pendingTodos: string[];
  traits: string[];
  suggestion: string;
}

describe('BriefingService (Integration)', () => {
  let service: BriefingService;
  let aiService: AiService;
  let contactRepository: Repository<Contact>;
  let conversationRepository: Repository<Conversation>;
  let eventRepository: Repository<Event>;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BriefingService,
        {
          provide: AiService,
          useValue: {
            callAgent: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Contact),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Event),
          useValue: mockRepository(),
        },
        { 
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENAI_API_KEY') return 'mock-openai-key';
              if (key === 'OPENAI_MODEL') return 'mock-model';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BriefingService>(BriefingService);
    aiService = module.get<AiService>(AiService);
    contactRepository = module.get<Repository<Contact>>(getRepositoryToken(Contact));
    conversationRepository = module.get<Repository<Conversation>>(getRepositoryToken(Conversation));
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateBriefing', () => {
    const mockUserId = 'mock-user-id';
    const mockContactId = 'mock-contact-id';
    const mockContactName = '张三';

    const mockContact = {
      id: mockContactId,
      userId: mockUserId,
      name: mockContactName,
      email: 'zhangsan@example.com',
      phone: null,
      company: 'ABC公司',
      position: 'CEO',
      profile: {},
      tags: [],
      briefing: null,
      conversations: [],
      events: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: mockUserId, email: 'user@example.com', name: 'Mock User', password: 'hashedpassword', createdAt: new Date(), updatedAt: new Date(), contacts: [], conversations: [] } as User,
    } as Contact;

    const mockConversations = [
      { id: 'conv1', content: '今天和张三聊了Q2合作方案，他对报价有顾虑。', userId: mockUserId, contactId: mockContactId, createdAt: new Date('2026-01-28T10:00:00Z'), updatedAt: new Date('2026-01-28T10:00:00Z'), embedding: [], parsedData: {}, isArchived: false, user: { id: mockUserId, email: 'user@example.com', name: 'Mock User', password: 'hashedpassword', createdAt: new Date(), updatedAt: new Date(), contacts: [], conversations: [] } as User, contact: { id: mockContactId } as Contact },
      { id: 'conv2', content: '周五前发优化方案给张三。', userId: mockUserId, contactId: mockContactId, createdAt: new Date('2026-01-29T10:00:00Z'), updatedAt: new Date('2026-01-29T10:00:00Z'), embedding: [], parsedData: {}, isArchived: false, user: { id: mockUserId } as User, contact: { id: mockContactId } as Contact },
    ] as Conversation[];

    const mockEvents = [
      { id: 'event1', title: 'Q2合作方案讨论', description: '与张三讨论', contactId: mockContactId, createdAt: new Date('2026-01-28T10:00:00Z'), updatedAt: new Date('2026-01-28T10:00:00Z'), eventDate: new Date('2026-01-28T10:00:00Z'), embedding: [], details: {}, contact: { id: mockContactId } as Contact },
      { id: 'event2', title: '发送优化方案', description: '承诺周五前发送', contactId: mockContactId, createdAt: new Date('2026-01-29T10:00:00Z'), updatedAt: new Date('2026-01-29T10:00:00Z'), eventDate: new Date('2026-01-29T10:00:00Z'), embedding: [], details: {}, contact: { id: mockContactId } as Contact },
    ] as Event[];

    const mockContactBriefing: ContactBriefing = {
      lastSummary: '3天前讨论Q2合作方案，对方对报价有顾虑。',
      pendingTodos: ['发送优化后的报价方案（周五前）'],
      traits: ['对价格敏感', '注重性价比'],
      suggestion: '开场可问云南旅游准备如何。',
    };

    beforeEach(() => {
      (contactRepository.findOne as jest.Mock).mockResolvedValue({ ...mockContact, conversations: mockConversations, events: mockEvents });
      (aiService.callAgent as jest.Mock).mockResolvedValue(JSON.stringify(mockContactBriefing));
      (contactRepository.save as jest.Mock).mockImplementation((entity: Contact) => Promise.resolve(entity));
    });

    it('should generate and save a new briefing for the contact', async () => {
      const result = await service.generateBriefing(mockContactId, mockUserId);

      expect(contactRepository.findOne).toHaveBeenCalledWith({ where: { id: mockContactId, userId: mockUserId }, relations: ['conversations', 'events'] });
      expect(aiService.callAgent).toHaveBeenCalledWith(expect.stringContaining('Generate a concise pre-meeting briefing'), undefined);
      expect(result).toBeDefined();
      expect(result).toEqual(mockContactBriefing);
      expect(contactRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: mockContactId,
        briefing: mockContactBriefing,
      }));
    });

    it('should handle AI response not being valid JSON', async () => {
      (aiService.callAgent as jest.Mock).mockResolvedValue('Not a JSON response');
      const result = await service.generateBriefing(mockContactId, mockUserId);
      expect(result).toBeDefined();
      expect(result.lastSummary).toEqual('AI简报生成失败，请稍后重试。');
      expect(contactRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: mockContactId,
        briefing: expect.objectContaining({ lastSummary: 'AI简报生成失败，请稍后重试。' }),
      }));
    });

    it('should throw NotFoundException if contact is not found', async () => {
      (contactRepository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.generateBriefing(mockContactId, mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('refreshBriefing', () => {
    const mockUserId = 'mock-user-id';
    const mockContactId = 'mock-contact-id';
    const mockContactBriefing: ContactBriefing = {
      lastSummary: 'Refreshed summary.',
      pendingTodos: [],
      traits: [],
      suggestion: 'Refreshed suggestion.',
    };

    beforeEach(() => {
      jest.spyOn(service, 'generateBriefing' as any).mockResolvedValue(mockContactBriefing);
    });

    it('should call generateBriefing and return the result', async () => {
      const result = await service.refreshBriefing(mockContactId, mockUserId);
      expect(service.generateBriefing).toHaveBeenCalledWith(mockContactId, mockUserId);
      expect(result).toEqual(mockContactBriefing);
    });
  });
});

// Define the ContactBriefing interface as expected from BriefingService
interface ContactBriefing {
  lastSummary: string;
  pendingTodos: string[];
  traits: string[];
  suggestion: string;
}

describe('BriefingService (Integration)', () => {
  let service: BriefingService;
  let aiService: AiService;
  let contactRepository: Repository<Contact>;
  let conversationRepository: Repository<Conversation>;
  let eventRepository: Repository<Event>;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BriefingService,
        {
          provide: AiService,
          useValue: {
            callAgent: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Contact),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Event),
          useValue: mockRepository(),
        },
        { 
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENAI_API_KEY') return 'mock-openai-key';
              if (key === 'OPENAI_MODEL') return 'mock-model';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BriefingService>(BriefingService);
    aiService = module.get<AiService>(AiService);
    contactRepository = module.get<Repository<Contact>>(getRepositoryToken(Contact));
    conversationRepository = module.get<Repository<Conversation>>(getRepositoryToken(Conversation));
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

    jest.clearAllMocks(); // Clear mocks before each test
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateBriefing', () => {
    const mockUserId = 'mock-user-id';
    const mockContactId = 'mock-contact-id';
    const mockContactName = '张三';

    const mockContact = {
      id: mockContactId,
      userId: mockUserId,
      name: mockContactName,
      email: 'zhangsan@example.com',
      phone: null,
      company: 'ABC公司',
      position: 'CEO',
      profile: {},
      tags: [],
      briefing: null,
      conversations: [], // Must be an array, even if empty
      events: [], // Must be an array, even if empty
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: mockUserId, email: 'user@example.com', password: 'hashedpassword', createdAt: new Date(), updatedAt: new Date(), contacts: [], conversations: [] } as User, // Fully mock User entity
    } as Contact;

    const mockConversations = [
      { id: 'conv1', content: '今天和张三聊了Q2合作方案，他对报价有顾虑。', userId: mockUserId, contactId: mockContactId, createdAt: new Date('2026-01-28T10:00:00Z'), updatedAt: new Date('2026-01-28T10:00:00Z'), embedding: [], parsedData: {}, isArchived: false, user: { id: mockUserId } as User, contact: { id: mockContactId } as Contact },
      { id: 'conv2', content: '周五前发优化方案给张三。', userId: mockUserId, contactId: mockContactId, createdAt: new Date('2026-01-29T10:00:00Z'), updatedAt: new Date('2026-01-29T10:00:00Z'), embedding: [], parsedData: {}, isArchived: false, user: { id: mockUserId } as User, contact: { id: mockContactId } as Contact },
    ] as Conversation[];

    const mockEvents = [
      { id: 'event1', title: 'Q2合作方案讨论', description: '与张三讨论', contactId: mockContactId, createdAt: new Date('2026-01-28T10:00:00Z'), updatedAt: new Date('2026-01-28T10:00:00Z'), eventDate: new Date('2026-01-28T10:00:00Z'), embedding: [], details: {}, contact: { id: mockContactId } as Contact },
      { id: 'event2', title: '发送优化方案', description: '承诺周五前发送', contactId: mockContactId, createdAt: new Date('2026-01-29T10:00:00Z'), updatedAt: new Date('2026-01-29T10:00:00Z'), eventDate: new Date('2026-01-29T10:00:00Z'), embedding: [], details: {}, contact: { id: mockContactId } as Contact },
    ] as Event[];

    const mockContactBriefing: ContactBriefing = {
      lastSummary: '3天前讨论Q2合作方案，对方对报价有顾虑。',
      pendingTodos: ['发送优化后的报价方案（周五前）'],
      traits: ['对价格敏感', '注重性价比'],
      suggestion: '开场可问云南旅游准备如何。',
    };

    beforeEach(() => {
      // Mock findOne to return contact with populated relations
      (contactRepository.findOne as jest.Mock).mockResolvedValue({ ...mockContact, conversations: mockConversations, events: mockEvents });
      (aiService.callAgent as jest.Mock).mockResolvedValue(JSON.stringify(mockContactBriefing));
      (contactRepository.save as jest.Mock).mockImplementation((entity: Contact) => Promise.resolve(entity));
    });

    it('should generate and save a new briefing for the contact', async () => {
      const result = await service.generateBriefing(mockContactId, mockUserId);

      expect(contactRepository.findOne).toHaveBeenCalledWith({ where: { id: mockContactId, userId: mockUserId }, relations: ['conversations', 'events'] });
      expect(aiService.callAgent).toHaveBeenCalledWith(expect.stringContaining('Generate a concise pre-meeting briefing'));
      expect(result).toBeDefined();
      expect(result).toEqual(mockContactBriefing);
      expect(contactRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: mockContactId,
        briefing: mockContactBriefing,
      }));
    });

    it('should handle AI response not being valid JSON', async () => {
      (aiService.callAgent as jest.Mock).mockResolvedValue('Not a JSON response');
      const result = await service.generateBriefing(mockContactId, mockUserId);
      expect(result).toBeDefined();
      expect(result.lastSummary).toEqual('AI简报生成失败，请稍后重试。');
      expect(contactRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: mockContactId,
        briefing: expect.objectContaining({ lastSummary: 'AI简报生成失败，请稍后重试。' }),
      }));
    });

    it('should throw NotFoundException if contact is not found', async () => {
      (contactRepository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.generateBriefing(mockContactId, mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('refreshBriefing', () => {
    const mockUserId = 'mock-user-id';
    const mockContactId = 'mock-contact-id';
    const mockContactBriefing: ContactBriefing = {
      lastSummary: 'Refreshed summary.',
      pendingTodos: [],
      traits: [],
      suggestion: 'Refreshed suggestion.',
    };

    beforeEach(() => {
      jest.spyOn(service, 'generateBriefing' as any).mockResolvedValue(mockContactBriefing);
    });

    it('should call generateBriefing and return the result', async () => {
      const result = await service.refreshBriefing(mockContactId, mockUserId);
      expect(service.generateBriefing).toHaveBeenCalledWith(mockContactId, mockUserId);
      expect(result).toEqual(mockContactBriefing);
    });
  });
});