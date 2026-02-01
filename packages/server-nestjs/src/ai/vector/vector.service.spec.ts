import { Test, TestingModule } from '@nestjs/testing';
import { VectorService } from './vector.service';
import { AiService } from '../ai.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, Event } from '../../entities';

describe('VectorService', () => {
  let service: VectorService;
  let aiService: AiService;
  let conversationRepository: Repository<Conversation>;
  let eventRepository: Repository<Event>;

  const mockEmbedding = [0.1, 0.2, 0.3];
  const mockAiService = {
    generateEmbedding: jest.fn(() => Promise.resolve(mockEmbedding)),
  };
  const mockConversationRepository = {
    create: jest.fn((dto) => ({ ...dto, id: 'mock-conv-id' })),
    save: jest.fn((entity) => Promise.resolve(entity)),
  };
  const mockEventRepository = {
    create: jest.fn((dto) => ({ ...dto, id: 'mock-event-id' })),
    save: jest.fn((entity) => Promise.resolve(entity)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorService,
        { provide: AiService, useValue: mockAiService },
        { provide: getRepositoryToken(Conversation), useValue: mockConversationRepository },
        { provide: getRepositoryToken(Event), useValue: mockEventRepository },
      ],
    }).compile();

    service = module.get<VectorService>(VectorService);
    aiService = module.get<AiService>(AiService);
    conversationRepository = module.get<Repository<Conversation>>(getRepositoryToken(Conversation));
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('storeEmbedding', () => {
    it('should generate and store embedding for Conversation', async () => {
      const mockConversation = new Conversation();
      mockConversation.content = 'Test conversation content';

      const result = await service.storeEmbedding(mockConversation, mockConversation.content);

      expect(aiService.generateEmbedding).toHaveBeenCalledWith(mockConversation.content);
      expect(result.embedding).toEqual(mockEmbedding);
      expect(conversationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        embedding: mockEmbedding,
      }));
      expect(eventRepository.save).not.toHaveBeenCalled();
    });

    it('should generate and store embedding for Event', async () => {
      const mockEvent = new Event();
      mockEvent.title = 'Test event title';
      mockEvent.description = 'Test event description';

      const textToEmbed = mockEvent.description || mockEvent.title;
      const result = await service.storeEmbedding(mockEvent, textToEmbed);

      expect(aiService.generateEmbedding).toHaveBeenCalledWith(textToEmbed);
      expect(result.embedding).toEqual(mockEmbedding);
      expect(eventRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        embedding: mockEmbedding,
      }));
      expect(conversationRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error for unsupported entity type', async () => {
      class UnsupportedEntity {}
      const unsupportedEntity = new UnsupportedEntity() as Conversation | Event;
      const text = 'unsupported';

      await expect(service.storeEmbedding(unsupportedEntity, text)).rejects.toThrow('Unsupported entity type for embedding storage.');
    });
  });

  describe('embedConversation', () => {
    it('should generate and store embedding for a given conversation', async () => {
      const mockConversation = new Conversation();
      mockConversation.content = 'Another conversation';

      const result = await service.embedConversation(mockConversation);

      expect(aiService.generateEmbedding).toHaveBeenCalledWith(mockConversation.content);
      expect(result.embedding).toEqual(mockEmbedding);
      expect(conversationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        embedding: mockEmbedding,
      }));
    });
  });

  describe('embedEvent', () => {
    it('should generate and store embedding for a given event using description', async () => {
      const mockEvent = new Event();
      mockEvent.title = 'Event title';
      mockEvent.description = 'Event description text';

      const result = await service.embedEvent(mockEvent);

      expect(aiService.generateEmbedding).toHaveBeenCalledWith(mockEvent.description);
      expect(result.embedding).toEqual(mockEmbedding);
      expect(eventRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        embedding: mockEmbedding,
      }));
    });

    it('should generate and store embedding for a given event using title if description is null', async () => {
      const mockEvent = new Event();
      mockEvent.title = 'Event title only';
      mockEvent.description = null;

      const result = await service.embedEvent(mockEvent);

      expect(aiService.generateEmbedding).toHaveBeenCalledWith(mockEvent.title);
      expect(result.embedding).toEqual(mockEmbedding);
      expect(eventRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        embedding: mockEmbedding,
      }));
    });
  });
});
