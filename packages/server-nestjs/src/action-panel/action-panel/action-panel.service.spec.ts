import { Test, TestingModule } from '@nestjs/testing';
import { ActionPanelService } from './action-panel.service';
import { AiService } from '../../ai/ai.service';
import { VectorService } from '../../ai/vector/vector.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact, Conversation, Event } from '../../entities';

const MOCK_USER_ID = 'user-uuid-1';
const MOCK_CONTACT_ID = 'contact-uuid-1';

// Mock AiService
const mockAiService: jest.Mocked<AiService> = {
  generateEmbedding: jest.fn(),
  callAgent: jest.fn(),
};

// Mock VectorService
const mockVectorService: jest.Mocked<VectorService> = {
  embedConversation: jest.fn(),
  embedEvent: jest.fn(),
  storeEmbedding: jest.fn(),
};

// Mock Repositories
const mockContactRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
};
const mockConversationRepository = {
  find: jest.fn(),
};
const mockEventRepository = {
  find: jest.fn(),
};

describe('ActionPanelService', () => {
  let service: ActionPanelService;
  let aiService: jest.Mocked<AiService>;
  let contactRepository: Repository<Contact>;

  // Mock data for contacts, conversations, events
  const mockContact: Contact = {
    id: MOCK_CONTACT_ID,
    name: 'John Doe',
    email: 'john@example.com',
    phone: null,
    company: 'Acme Corp',
    position: 'CEO',
    profile: { type: 'client' },
    tags: ['important'],
    userId: MOCK_USER_ID,
    events: [],
    conversations: [],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    user: null,
  };

  const mockConversation: Conversation = {
    id: 'conv-1', content: 'Discussed Q1 goals.', userId: MOCK_USER_ID, contactId: MOCK_CONTACT_ID,
    parsedData: {}, isArchived: false, embedding: [], createdAt: new Date('2024-01-15T10:00:00Z'), updatedAt: new Date(), contact: null, user: null,
  };

  const mockEvent: Event = {
    id: 'event-1', title: 'Follow-up task', description: 'Send proposal.', contactId: MOCK_CONTACT_ID,
    details: {}, eventDate: new Date('2024-01-20T10:00:00Z'), embedding: [], createdAt: new Date(), updatedAt: new Date(), contact: null,
  };


  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionPanelService,
        { provide: AiService, useValue: mockAiService },
        { provide: VectorService, useValue: mockVectorService },
        { provide: getRepositoryToken(Contact), useValue: mockContactRepository },
        { provide: getRepositoryToken(Conversation), useValue: mockConversationRepository },
        { provide: getRepositoryToken(Event), useValue: mockEventRepository },
      ],
    }).compile();

    service = module.get<ActionPanelService>(ActionPanelService);
    aiService = module.get<AiService>(AiService);
    contactRepository = module.get<Repository<Contact>>(getRepositoryToken(Contact));

    jest.clearAllMocks(); // Clear all mocks before each test
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFollowUps', () => {
    it('should return contacts sorted by last interaction date', async () => {
      const contactsWithInteractions: Contact[] = [
        { ...mockContact, id: 'contact-1', name: 'Alice', createdAt: new Date('2024-01-01T00:00:00Z') },
        { ...mockContact, id: 'contact-2', name: 'Bob', createdAt: new Date('2024-01-02T00:00:00Z') },
      ];
      // Simulate interactions
      contactsWithInteractions[0].conversations = [{ ...mockConversation, createdAt: new Date('2024-01-10T00:00:00Z') }];
      contactsWithInteractions[1].events = [{ ...mockEvent, eventDate: new Date('2024-01-05T00:00:00Z') }];

      (mockContactRepository.find as jest.Mock).mockResolvedValue(contactsWithInteractions);

      const result = await service.getFollowUps(MOCK_USER_ID);
      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Bob'); // Bob's last interaction is 01-05, Alice's is 01-10
      expect(result[1].name).toBe('Alice');
      expect(contactRepository.find).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID },
        relations: ['conversations', 'events'],
      });
    });

    it('should return an empty array if no contacts found', async () => {
      (mockContactRepository.find as jest.Mock).mockResolvedValue([]);
      const result = await service.getFollowUps(MOCK_USER_ID);
      expect(result).toEqual([]);
    });
  });

  describe('getRecommendedContacts', () => {
    it('should return recommended contacts from AiService', async () => {
      const contacts = [{ ...mockContact, id: 'c1' }, { ...mockContact, id: 'c2' }];
      (mockContactRepository.find as jest.Mock).mockResolvedValue(contacts);

      const mockAiRecommendation = [
        { contactName: 'John Doe', reason: 'High potential', openingLine: 'Hello John' },
      ];
      aiService.callAgent.mockResolvedValue(JSON.stringify(mockAiRecommendation));

      const result = await service.getRecommendedContacts(MOCK_USER_ID);

      expect(result.length).toBe(1);
      expect(result[0].contact.name).toBe('John Doe');
      expect(result[0].reason).toBe('High potential');
      expect(result[0].openingLine).toBe('Hello John');
      expect(aiService.callAgent).toHaveBeenCalled();
      expect(aiService.callAgent.mock.calls[0][0]).toContain('suggest 1-3 contacts for the user to engage with.');
      expect(aiService.callAgent.mock.calls[0][0]).toContain('Name: John Doe');
    });

    it('should return an empty array if no contacts found for user', async () => {
      (mockContactRepository.find as jest.Mock).mockResolvedValue([]);
      const result = await service.getRecommendedContacts(MOCK_USER_ID);
      expect(result).toEqual([]);
      expect(aiService.callAgent).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON AI response for recommendations', async () => {
      const contacts = [{ ...mockContact, id: 'c1' }];
      (mockContactRepository.find as jest.Mock).mockResolvedValue(contacts);
      aiService.callAgent.mockResolvedValue('This is not JSON');

      const result = await service.getRecommendedContacts(MOCK_USER_ID);
      expect(result).toEqual([]);
      expect(aiService.callAgent).toHaveBeenCalled();
    });
  });
});
