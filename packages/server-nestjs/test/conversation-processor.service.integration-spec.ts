import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationProcessorService, ParsedConversationData } from '../src/conversations/conversation-processor/conversation-processor.service';
import { AiService } from '../src/ai/ai.service';
import { VectorService } from '../src/ai/vector/vector.service';
import { Conversation, Contact, Event, User } from '../src/entities';
import { ConfigService } from '@nestjs/config';
import { DeepPartial } from 'typeorm';

// Helper function to create a mock repository
const mockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('ConversationProcessorService (Integration)', () => {
  let service: ConversationProcessorService;
  let aiService: AiService;
  let vectorService: VectorService;
  let conversationRepository: Repository<Conversation>;
  let contactRepository: Repository<Contact>;
  let eventRepository: Repository<Event>;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationProcessorService,
        {
          provide: AiService,
          useValue: {
            generateEmbedding: jest.fn(),
            callAgent: jest.fn(),
          },
        },
        {
          provide: VectorService,
          useValue: {
            embedConversation: jest.fn(),
            embedEvent: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Contact),
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

    service = module.get<ConversationProcessorService>(ConversationProcessorService);
    aiService = module.get<AiService>(AiService);
    vectorService = module.get<VectorService>(VectorService);
    conversationRepository = module.get<Repository<Conversation>>(getRepositoryToken(Conversation));
    contactRepository = module.get<Repository<Contact>>(getRepositoryToken(Contact));
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Re-mock common repository methods that are used across tests
    (conversationRepository.create as jest.Mock).mockImplementation((entity: DeepPartial<Conversation>) => entity as Conversation);
    (conversationRepository.save as jest.Mock).mockImplementation((entity: Conversation) => Promise.resolve(entity));
    (contactRepository.create as jest.Mock).mockImplementation((entity: DeepPartial<Contact>) => entity as Contact);
    (contactRepository.save as jest.Mock).mockImplementation((entity: Contact) => Promise.resolve(entity));
    (contactRepository.findOne as jest.Mock).mockResolvedValue(null); // Default: no existing contact
    (eventRepository.create as jest.Mock).mockImplementation((entity: DeepPartial<Event>) => entity as Event);
    (eventRepository.save as jest.Mock).mockImplementation((entity: Event) => Promise.resolve(entity));
    (userRepository.findOne as jest.Mock).mockResolvedValue({ id: 'user-id', email: 'test@example.com' } as User);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processConversation', () => {
    const mockUserId = 'mock-user-id';
    const mockConversationId = 'mock-conversation-id';
    const mockContent = '今天和张三聊了Q2合作，他对报价有顾虑。周五前发优化方案。他下个月去云南旅游。';

    const mockParsedData: ParsedConversationData = {
      contacts: [
        { name: '张三', company: 'ABC公司', position: 'CEO', email: 'zhangsan@example.com', phone: '1234567890' },
      ],
      events: [
        { title: '讨论Q2合作方案', description: '对报价有顾虑', eventDate: '2026-02-01T08:00:00.000Z' }, // No 'type' property in ParsedConversationData.events
      ],
      facts: [
        { key: '对价格敏感', value: '认为比竞对高15%' },
        { key: '下个月旅游计划', value: '云南' },
      ],
      todos: [
        { description: '发送优化后的报价方案', dueDate: '周五前' }, // Uses 'description', no 'completed' property
      ],
    };

    beforeEach(() => {
      // Mocks specific to this describe block (overriding common mocks if needed)
      (aiService.callAgent as jest.Mock).mockResolvedValue(JSON.stringify(mockParsedData));
      (aiService.generateEmbedding as jest.Mock).mockResolvedValue([0.1, 0.2, 0.3]);
      (vectorService.embedConversation as jest.Mock).mockImplementation(async (conv) => conv);
      (vectorService.embedEvent as jest.Mock).mockImplementation(async (event) => event);
      // Simulate contact already exists for '张三'
      (contactRepository.findOne as jest.Mock).mockResolvedValue({ id: 'contact-zhangsan', name: '张三', email: 'zhangsan@example.com' } as Contact);
      // For processConversation to find the conversation, we need to mock conversationRepository.findOne
      (conversationRepository.findOne as jest.Mock).mockResolvedValue({
        id: mockConversationId,
        userId: mockUserId,
        content: mockContent,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Conversation);
    });

    it('should process natural language and return structured data', async () => {
      const mockConversation = conversationRepository.create({
        id: mockConversationId,
        userId: mockUserId,
        content: mockContent,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.processConversation(mockConversationId, mockContent, mockUserId);

      expect(aiService.callAgent).toHaveBeenCalledWith(
        expect.any(String)
      );

      expect(result).toBeDefined();
      expect(result.id).toEqual(mockConversationId);
      expect(result.content).toEqual(mockContent);
      expect(result.parsedData).toEqual(mockParsedData);
      expect(result.isArchived).toBe(true);
      expect(vectorService.embedConversation).toHaveBeenCalledWith(expect.objectContaining({
        id: mockConversationId,
        userId: mockUserId,
        content: mockContent,
      }));
      expect(vectorService.embedEvent).toHaveBeenCalledWith(expect.objectContaining({
        title: '讨论Q2合作方案',
        description: '对报价有顾虑',
        eventDate: '2026-02-01T08:00:00.000Z',
      }));
    });

    it('should create new contact if not found', async () => {
      // Mocks specific to this test case
      (contactRepository.findOne as jest.Mock).mockResolvedValue(null); // Simulate contact not found for '李四'
      (contactRepository.save as jest.Mock).mockImplementation((entity: Contact) => Promise.resolve({ ...entity, id: 'new-contact-lisi' } as Contact));

      const mockConversation = conversationRepository.create({
        id: mockConversationId,
        userId: mockUserId,
        content: '见了李四，聊了项目。',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      const mockParsedDataWithNewContact: ParsedConversationData = {
        contacts: [{ name: '李四', company: 'XYZ公司', position: '产品经理', email: 'lisi@example.com' }],
        events: [], facts: [], todos: []
      };
      (aiService.callAgent as jest.Mock).mockResolvedValue(JSON.stringify(mockParsedDataWithNewContact));
      (aiService.generateEmbedding as jest.Mock).mockResolvedValue([0.1, 0.2, 0.3]);
      (vectorService.embedConversation as jest.Mock).mockImplementation(async (conv) => conv);
      (vectorService.embedEvent as jest.Mock).mockImplementation(async (event) => event);
      (conversationRepository.findOne as jest.Mock).mockResolvedValue({ // Mock finding the conversation for this test
        id: mockConversationId,
        userId: mockUserId,
        content: mockContent,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Conversation);


      const result = await service.processConversation(mockConversationId, mockContent, mockUserId);

      expect(contactRepository.findOne).toHaveBeenCalledWith({ where: { email: 'lisi@example.com', userId: mockUserId } });
      expect(contactRepository.save).toHaveBeenCalledWith(expect.objectContaining({ name: '李四', userId: mockUserId }));
      expect(result.parsedData?.contacts).toEqual([
        expect.objectContaining({ name: '李四', company: 'XYZ公司', position: '产品经理', email: 'lisi@example.com' }), // Expect data without id, matching ParsedConversationData
      ]);
    });
  });
});