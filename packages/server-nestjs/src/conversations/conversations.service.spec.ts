import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationsService } from './conversations.service';
import { Conversation } from '../entities';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let repository: jest.Mocked<Repository<Conversation>>;

  const mockConversation: Conversation = {
    id: 'conv-123',
    userId: 'user-123',
    contactId: 'contact-123',
    title: 'Test Conversation',
    content: 'Test content',
    summary: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Conversation;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    repository = module.get(getRepositoryToken(Conversation));
  });

  describe('updateSummary', () => {
    it('should update conversation summary', async () => {
      const summary = 'This is a test summary of the conversation';
      const updatedConversation = {
        ...mockConversation,
        summary,
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(mockConversation);
      repository.save.mockResolvedValue(updatedConversation);

      const result = await service.updateSummary('conv-123', summary);

      expect(result.summary).toBe(summary);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'conv-123' },
      });
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'conv-123',
          summary,
        }),
      );
    });

    it('should throw error when conversation not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.updateSummary('non-existent', 'summary')).rejects.toThrow(
        'Conversation non-existent not found',
      );
    });

    it('should update updatedAt timestamp', async () => {
      const summary = 'Test summary';
      const beforeUpdate = new Date();
      const updatedConversation = {
        ...mockConversation,
        summary,
        updatedAt: new Date(beforeUpdate.getTime() + 1000),
      };

      repository.findOne.mockResolvedValue(mockConversation);
      repository.save.mockResolvedValue(updatedConversation);

      const result = await service.updateSummary('conv-123', summary);

      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('summary writeback scenario', () => {
    it('should handle summary writeback from title_summary agent', async () => {
      // Simulate the flow: title_summary agent generates summary and writes it back
      const generatedSummary = 'Summary: Discussed project timeline and deliverables';
      const updatedConversation = {
        ...mockConversation,
        summary: generatedSummary,
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(mockConversation);
      repository.save.mockResolvedValue(updatedConversation);

      const result = await service.updateSummary('conv-123', generatedSummary);

      expect(result.summary).toBe(generatedSummary);
      expect(result.summary).not.toBeNull();
    });

    it('should allow updating summary multiple times', async () => {
      const summary1 = 'First summary';
      const summary2 = 'Updated summary';

      repository.findOne
        .mockResolvedValueOnce(mockConversation)
        .mockResolvedValueOnce({ ...mockConversation, summary: summary1 });

      repository.save
        .mockResolvedValueOnce({ ...mockConversation, summary: summary1 })
        .mockResolvedValueOnce({ ...mockConversation, summary: summary2 });

      const result1 = await service.updateSummary('conv-123', summary1);
      expect(result1.summary).toBe(summary1);

      const result2 = await service.updateSummary('conv-123', summary2);
      expect(result2.summary).toBe(summary2);
    });

    it('should handle empty summary string', async () => {
      const emptySummary = '';
      const updatedConversation = {
        ...mockConversation,
        summary: emptySummary,
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(mockConversation);
      repository.save.mockResolvedValue(updatedConversation);

      const result = await service.updateSummary('conv-123', emptySummary);

      expect(result.summary).toBe('');
    });
  });
});


