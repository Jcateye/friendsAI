import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ActionPanelService, WeeklyStats } from '../src/action-panel/action-panel/action-panel.service';
import { AiService } from '../src/ai/ai.service';
import { Contact, Conversation, Event, User } from '../src/entities';
import { ConfigService } from '@nestjs/config';

// Helper function to create a mock repository
const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
});

// Frontend types for Action Panel (copied from action-panel.service.ts for strict type mocking)
interface FollowUpItem {
  contact: {
    id: string;
    name: string;
    avatarColor: string;
    initial: string;
  };
  reason: string;
  urgent: boolean;
}

interface SuggestionItem {
  contact: {
    id: string;
    name: string;
    avatarColor: string;
    initial: string;
  };
  reason: string;
  openingLine: string;
  urgent: boolean;
}

describe('ActionPanelService (Integration)', () => {
  let service: ActionPanelService;
  let aiService: AiService;
  let contactRepository: Repository<Contact>;
  let conversationRepository: Repository<Conversation>;
  let eventRepository: Repository<Event>;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionPanelService,
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

    service = module.get<ActionPanelService>(ActionPanelService);
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

  describe('getFollowUps', () => {
    const mockUserId = 'mock-user-id';
    const mockContactId = 'mock-contact-id';
    const mockContactName = '李四';

    const mockUser = {
      id: mockUserId, email: 'user@example.com', name: 'Mock User', password: 'hashedpassword',
      createdAt: new Date(), updatedAt: new Date(), contacts: [], conversations: []
    } as User;

    const mockConversations = [
      { id: 'conv1', content: '和李四约定周五发方案', userId: mockUserId, contactId: mockContactId, createdAt: new Date('2026-01-28T10:00:00Z'), updatedAt: new Date(), embedding: [], parsedData: { todos: [{ description: '发方案', dueDate: '周五' }] }, isArchived: false, user: mockUser, contact: { id: mockContactId } as Contact },
    ] as Conversation[];

    const mockContact = {
      id: mockContactId, userId: mockUserId, name: mockContactName, email: 'lisi@example.com',
      phone: null, company: 'XYZ公司', position: 'Developer', profile: {}, tags: [],
      briefing: { lastSummary: '', pendingTodos: ['发方案'], traits: [], suggestion: '' },
      conversations: mockConversations, events: [], createdAt: new Date('2026-01-28T09:00:00Z'), updatedAt: new Date(), user: mockUser,
    } as Contact;

    beforeEach(() => {
      (contactRepository.find as jest.Mock).mockResolvedValue([mockContact]);
    });

    it('should return a list of follow-up items', async () => {
      const result = await service.getFollowUps(mockUserId);
      expect(contactRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        relations: ['conversations', 'events', 'briefing'],
      });
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('contact');
      expect(result[0].contact.name).toEqual(mockContactName);
      expect(result[0]).toHaveProperty('reason');
      expect(result[0].reason).toEqual('发方案');
      expect(result[0].urgent).toBe(false);
    });

    it('should handle contacts with no pending todos', async () => {
      (contactRepository.find as jest.Mock).mockResolvedValue([
        { ...mockContact, briefing: { ...mockContact.briefing, pendingTodos: [] } },
      ]);
      const result = await service.getFollowUps(mockUserId);
      expect(result).toEqual([]);
    });
  });

  describe('getRecommendedContacts', () => {
    const mockUserId = 'mock-user-id';
    const mockContactId = 'mock-contact-id';
    const mockContactName = '王五';

    const mockUser = {
      id: mockUserId, email: 'user@example.com', name: 'Mock User', password: 'hashedpassword',
      createdAt: new Date(), updatedAt: new Date(), contacts: [], conversations: []
    } as User;

    const mockContact = {
      id: mockContactId,
      userId: mockUserId,
      name: mockContactName,
      email: 'wangwu@example.com',
      phone: null, company: 'XYZ公司', position: 'Manager', profile: {}, tags: [],
      briefing: { lastSummary: '', pendingTodos: [], traits: ['对价格敏感'], suggestion: '讨论价格方案。' },
      conversations: [], events: [], createdAt: new Date('2025-12-01T10:00:00Z'), updatedAt: new Date(), user: mockUser,
    } as Contact;

    const mockAiRecommendationResponse = JSON.stringify([
      { contactName: '王五', reason: '长时间未联系，推荐问候', openingLine: '你好王五，最近可好？', urgent: true }
    ]);

    beforeEach(() => {
      (contactRepository.find as jest.Mock).mockResolvedValue([mockContact]);
      (aiService.callAgent as jest.Mock).mockResolvedValue(mockAiRecommendationResponse);
    });

    it('should return AI-generated contact suggestions', async () => {
      const result = await service.getRecommendedContacts(mockUserId); // Corrected method name
      expect(contactRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        relations: ['conversations', 'events', 'briefing'],
      });
      expect(aiService.callAgent).toHaveBeenCalledWith(expect.any(String)); // Prompt is complex
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('contact');
      expect(result[0].contact.name).toEqual(mockContactName);
      expect(result[0]).toHaveProperty('reason');
      expect(result[0].reason).toEqual('长时间未联系，推荐问候');
      expect(result[0]).toHaveProperty('openingLine');
      expect(result[0]).toHaveProperty('urgent');
    });

    it('should include briefing suggestions', async () => {
      const mockContactWithBriefingSuggestion = {
        ...mockContact,
        briefing: { ...mockContact.briefing, suggestion: 'AI-generated suggestion from briefing' },
      };
      (contactRepository.find as jest.Mock).mockResolvedValue([mockContactWithBriefingSuggestion]);
      (aiService.callAgent as jest.Mock).mockResolvedValue(JSON.stringify([])); // No AI recommendations, only briefing

      const result = await service.getRecommendedContacts(mockUserId); // Corrected method name
      expect(result.length).toEqual(1);
      expect(result[0].reason).toEqual('AI-generated suggestion from briefing');
    });
  });

  describe('getWeeklyStats', () => {
    const mockUserId = 'mock-user-id';
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    beforeEach(() => {
      (conversationRepository.count as jest.Mock).mockResolvedValue(5);
      (eventRepository.count as jest.Mock).mockResolvedValue(3);
    });

    it('should return weekly statistics', async () => {
      const result = await service.getWeeklyStats(mockUserId);
      expect(conversationRepository.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          createdAt: Between(startOfWeek, endOfWeek),
        },
      });
      expect(eventRepository.count).toHaveBeenCalledWith({
        where: {
          contact: { userId: mockUserId },
          createdAt: Between(startOfWeek, endOfWeek),
        },
      });
      expect(result).toBeDefined();
      expect(result.records).toEqual(5);
      expect(result.visits).toEqual(3);
      expect(result.progress).toEqual(40.0);
    });
  });
});