import { Test, TestingModule } from '@nestjs/testing';
import { ConversationProcessorService, ParsedConversationData } from './conversation-processor.service';
import { AiService } from '../../ai/ai.service';
import { VectorService } from '../../ai/vector/vector.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, Contact, Event, User } from '../../entities';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import ConfigService only

const MOCK_USER_ID = 'user-uuid-1';
const MOCK_CONVERSATION_ID = 'conv-uuid-1';
const MOCK_CONTACT_ID = 'contact-uuid-1';
const MOCK_EMBEDDING = [0.1, 0.2, 0.3];
const CONVERSATION_CONTENT = 'Talked to John Doe about project status. He mentioned his hobby is hiking. Need to follow up by tomorrow.';

const mockVectorService = {
  embedConversation: jest.fn((conv) => Promise.resolve({ ...conv, embedding: MOCK_EMBEDDING })),
  embedEvent: jest.fn((event) => Promise.resolve({ ...event, embedding: MOCK_EMBEDDING })),
};

const mockConversationRepository = {
  findOne: jest.fn(),
  save: jest.fn((entity) => Promise.resolve({ ...entity, id: MOCK_CONVERSATION_ID })),
  create: jest.fn((dto) => dto),
};

const mockContactRepository = {
  findOne: jest.fn(),
  save: jest.fn((entity) => {
    if (!entity.id) {
      entity.id = MOCK_CONTACT_ID;
    }
    return Promise.resolve(entity);
  }),
  create: jest.fn((dto) => dto),
};

const mockEventRepository = {
  save: jest.fn((entity) => Promise.resolve({ ...entity, id: 'event-uuid-1' })),
  create: jest.fn((dto) => dto),
};

const mockUserRepository = {
  findOne: jest.fn(),
};

// Mock ConfigService for AiService's dependency
const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'OPENAI_API_KEY') {
      return 'test-api-key';
    }
    return null;
  }),
};

// Mock AiService completely, as per Oracle's Pattern A
const mockAiService: jest.Mocked<AiService> = {
  generateEmbedding: jest.fn(),
  callAgent: jest.fn(),
};

describe('ConversationProcessorService', () => {
  let service: ConversationProcessorService;
  // Use the mocked AiService directly
  let aiService: jest.Mocked<AiService>; 
  let conversationRepository: Repository<Conversation>;
  let contactRepository: Repository<Contact>;
  let eventRepository: Repository<Event>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationProcessorService,
        // Provide the mocked AiService directly
        { provide: AiService, useValue: mockAiService },
        { provide: VectorService, useValue: mockVectorService },
        { provide: getRepositoryToken(Conversation), useValue: mockConversationRepository },
        { provide: getRepositoryToken(Contact), useValue: mockContactRepository },
        { provide: getRepositoryToken(Event), useValue: mockEventRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        // Provide the mocked ConfigService directly for AiService's potential internal use,
        // though it's already mocked if AiService is mocked.
        { provide: ConfigService, useValue: mockConfigService }, 
      ],
    }).compile();

    service = module.get<ConversationProcessorService>(ConversationProcessorService);
    aiService = module.get<AiService>(AiService); // Get the mocked AiService instance
    conversationRepository = module.get<Repository<Conversation>>(getRepositoryToken(Conversation));
    contactRepository = module.get<Repository<Contact>>(getRepositoryToken(Contact));
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));

    jest.clearAllMocks(); // Clear mocks before each test
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processConversation', () => {
    // Explicitly type mock object to match Conversation entity
    let mockExistingConversation: Conversation; // Declare as 'let' so it can be re-initialized

    beforeEach(() => {
      // Re-initialize for each test to ensure a clean state
      mockExistingConversation = {
        id: MOCK_CONVERSATION_ID,
        content: CONVERSATION_CONTENT,
        userId: MOCK_USER_ID,
        parsedData: {},
        isArchived: false,
        contactId: null,
        embedding: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contact: null,
        user: null, // User can be null based on Conversation entity
      };

      // Return a shallow copy of the latest mockExistingConversation to reflect per-test mutations
      (conversationRepository.findOne as jest.Mock).mockImplementation(
        () => Promise.resolve({ ...mockExistingConversation }),
      );
      (conversationRepository.save as jest.Mock).mockImplementation((conv: Conversation) => Promise.resolve({
        ...conv,
        id: MOCK_CONVERSATION_ID, // Ensure ID is present upon save
        contactId: conv.contactId,
        contact: conv.contact,
      }));
      (contactRepository.findOne as jest.Mock).mockResolvedValue(null);
      (contactRepository.save as jest.Mock).mockImplementation((cont: Contact) => {
        if (!cont.id) {
          cont.id = MOCK_CONTACT_ID;
        }
        return Promise.resolve(cont);
      }); // Ensure saved contact has an ID
      (eventRepository.save as jest.Mock).mockImplementation((event: Event) => Promise.resolve(event));

      // Reset default mock for callAgent for each test block
      aiService.callAgent.mockResolvedValue('{}'); 
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      (conversationRepository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.processConversation('non-existent', CONVERSATION_CONTENT, MOCK_USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('should call AiService to parse conversation content', async () => {
      const mockAiResponse = JSON.stringify({ facts: [{ key: 'summary', value: 'Parsed summary' }] });
      aiService.callAgent.mockResolvedValue(mockAiResponse); // Set specific mock for this test

      await service.processConversation(MOCK_CONVERSATION_ID, CONVERSATION_CONTENT, MOCK_USER_ID);

      expect(aiService.callAgent).toHaveBeenCalled();
      // Use the actual buildAiPrompt method to construct the expected prompt string
      const actualService = new ConversationProcessorService(aiService, mockVectorService, conversationRepository, contactRepository, eventRepository, mockUserRepository);
      const expectedFullPrompt = (actualService as any)['buildAiPrompt'](CONVERSATION_CONTENT); // Access private method for testing

      expect(aiService.callAgent).toHaveBeenCalledWith(
        expectedFullPrompt
      );
    });

    it('should parse AI response and update conversation parsedData', async () => {
      const mockParsedData: ParsedConversationData = {
        facts: [{ key: 'summary', value: 'Parsed summary' }],
      };
      aiService.callAgent.mockResolvedValue(JSON.stringify(mockParsedData)); // Set specific mock for this test

      const result = await service.processConversation(MOCK_CONVERSATION_ID, CONVERSATION_CONTENT, MOCK_USER_ID);

      expect(result.parsedData).toEqual(mockParsedData);
      expect(mockVectorService.embedConversation).toHaveBeenCalledWith(expect.objectContaining({
        parsedData: mockParsedData,
      }));
    });

    it('should handle invalid JSON AI response by saving raw response as summary fact', async () => {
      const rawAiResponse = 'This is not a JSON response from AI.';
      aiService.callAgent.mockResolvedValue(rawAiResponse); // Set specific mock for this test

      const result = await service.processConversation(MOCK_CONVERSATION_ID, CONVERSATION_CONTENT, MOCK_USER_ID);

      expect(result.parsedData).toEqual({ facts: [{ key: 'summary', value: rawAiResponse }] });
    });

    it('should create new contact if not found in DB', async () => {
      const mockContactData = { name: 'John Doe', email: 'john@example.com' };
      const mockParsedData: ParsedConversationData = { contacts: [mockContactData] };
      aiService.callAgent.mockResolvedValue(JSON.stringify(mockParsedData)); // Set specific mock for this test
      (contactRepository.findOne as jest.Mock).mockResolvedValue(null);

      await service.processConversation(MOCK_CONVERSATION_ID, CONVERSATION_CONTENT, MOCK_USER_ID);

      expect(contactRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        ...mockContactData,
        userId: MOCK_USER_ID,
      }));
      expect(contactRepository.save).toHaveBeenCalled();
      // Assert on mockVectorService.embedConversation now receives the modified conversation object
      expect(mockVectorService.embedConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: MOCK_CONVERSATION_ID, // Ensure ID matches
          contactId: MOCK_CONTACT_ID, // contactId should now be set by service
          contact: expect.objectContaining({ id: MOCK_CONTACT_ID }), // contact object should be set by service
        }),
      );
    });

    it('should update existing contact if found in DB', async () => {
      const mockContactData = { name: 'John Doe', email: 'john@example.com', company: 'ABC Inc.' };
      const mockExistingContact: Contact = {
        id: MOCK_CONTACT_ID,
        name: 'John Doe',
        email: 'john@example.com',
        phone: null,
        company: null,
        position: null,
        profile: null,
        tags: null,
        userId: MOCK_USER_ID,
        events: [],
        conversations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: null,
      };
      const mockParsedData: ParsedConversationData = { contacts: [mockContactData] };
      aiService.callAgent.mockResolvedValue(JSON.stringify(mockParsedData)); // Set specific mock for this test
      (contactRepository.findOne as jest.Mock).mockResolvedValue(mockExistingContact);

      await service.processConversation(MOCK_CONVERSATION_ID, CONVERSATION_CONTENT, MOCK_USER_ID);

      expect(contactRepository.create).not.toHaveBeenCalled();
      expect(contactRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...mockExistingContact,
        company: 'ABC Inc.',
      }));
    });

    it('should create new event and embed it', async () => {
      const mockEventData = { title: 'Follow up', description: 'Follow up by tomorrow', eventDate: '2024-03-16T09:00:00Z' };
      const mockParsedData: ParsedConversationData = { events: [mockEventData] };
      aiService.callAgent.mockResolvedValue(JSON.stringify(mockParsedData)); // Set specific mock for this test

      // Explicitly update mockExistingConversation for this test's context
      mockExistingConversation.contactId = MOCK_CONTACT_ID;
      mockExistingConversation.contact = { id: MOCK_CONTACT_ID, name: 'Mock Contact', userId: MOCK_USER_ID, user: null, email: null, phone: null, company: null, position: null, profile: null, tags: null, events: [], conversations: [], createdAt: new Date(), updatedAt: new Date() } as Contact;

      await service.processConversation(MOCK_CONVERSATION_ID, CONVERSATION_CONTENT, MOCK_USER_ID);

      expect(mockEventRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        ...mockEventData,
        contactId: MOCK_CONTACT_ID, // contactId should now be set from the updated conversation
      }));
      expect(mockVectorService.embedEvent).toHaveBeenCalledWith(expect.objectContaining({
        ...mockEventData,
        contactId: MOCK_CONTACT_ID,
      }));
    });

    it('should embed conversation content and save it', async () => {
      const mockParsedData: ParsedConversationData = { facts: [{ key: 'project', value: 'status' }] };
      aiService.callAgent.mockResolvedValue(JSON.stringify(mockParsedData)); // Set specific mock for this test

      await service.processConversation(MOCK_CONVERSATION_ID, CONVERSATION_CONTENT, MOCK_USER_ID);

      expect(mockVectorService.embedConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: MOCK_CONVERSATION_ID,
          userId: MOCK_USER_ID,
          parsedData: mockParsedData,
        }),
      );
    });
  });
});
