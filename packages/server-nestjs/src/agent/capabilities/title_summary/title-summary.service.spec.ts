import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TitleSummaryService } from './title-summary.service';
import { AgentRuntimeExecutor } from '../../runtime/agent-runtime-executor.service';
import { SnapshotService } from '../../snapshots/snapshot.service';
import { Conversation } from '../../../entities/conversation.entity';

describe('TitleSummaryService', () => {
  let service: TitleSummaryService;
  let runtimeExecutor: jest.Mocked<AgentRuntimeExecutor>;
  let snapshotService: jest.Mocked<SnapshotService>;
  let conversationRepository: jest.Mocked<Repository<Conversation>>;

  const mockConversation: Conversation = {
    id: 'conv-123',
    userId: 'user-123',
    contactId: 'contact-123',
    title: 'Product Discussion',
    content: 'Discussed pricing plans and enterprise features',
    summary: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Tell me about your pricing',
        createdAt: new Date('2024-01-15'),
      } as any,
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'We offer flexible plans...',
        createdAt: new Date('2024-01-15'),
      } as any,
    ],
  } as Conversation;

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TitleSummaryService,
        {
          provide: AgentRuntimeExecutor,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: SnapshotService,
          useValue: {
            findSnapshot: jest.fn().mockResolvedValue({ snapshot: null, cached: false }),
            createSnapshot: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<TitleSummaryService>(TitleSummaryService);
    runtimeExecutor = module.get(AgentRuntimeExecutor);
    snapshotService = module.get(SnapshotService);
    conversationRepository = module.get(getRepositoryToken(Conversation));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should return cached title/summary when available', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);

      const cachedOutput = {
        title: 'Pricing Plan Discussion',
        summary: 'Customer asked about pricing plans, we discussed enterprise options',
      };

      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: {
          id: 'snapshot-123',
          output: cachedOutput,
          createdAt: new Date(),
        } as any,
        cached: true,
      });

      const result = await service.generate({ userId, conversationId });

      expect(result.title).toBe(cachedOutput.title);
      expect(result.summary).toBe(cachedOutput.summary);
      expect(result.conversationId).toBe(conversationId);
      expect(result.sourceHash).toBeDefined();
      expect(result.generatedAt).toBeDefined();
      expect(runtimeExecutor.execute).not.toHaveBeenCalled();
      expect(conversationRepository.update).not.toHaveBeenCalled();
    });

    it('should generate new title/summary when cache miss', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const aiOutput = {
        title: 'Pricing Plan Discussion',
        summary: 'Customer inquired about pricing, discussed enterprise tier options',
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: aiOutput,
      });

      snapshotService.createSnapshot.mockResolvedValue({
        id: 'snapshot-123',
      } as any);

      conversationRepository.update.mockResolvedValue({} as any);

      const result = await service.generate({ userId, conversationId });

      expect(result.title).toBe(aiOutput.title);
      expect(result.summary).toBe(aiOutput.summary);
      expect(result.conversationId).toBe(conversationId);
      expect(result.sourceHash).toBeDefined();
      expect(result.generatedAt).toBeDefined();

      expect(runtimeExecutor.execute).toHaveBeenCalledWith(
        'title_summary',
        null,
        expect.objectContaining({
          conversationId,
          content: mockConversation.content,
          messages: expect.any(Array),
        }),
        expect.objectContaining({
          useCache: false,
          userId,
          conversationId,
          skipServiceRouting: true,
        })
      );

      expect(snapshotService.createSnapshot).toHaveBeenCalled();
      expect(conversationRepository.update).toHaveBeenCalledWith(
        conversationId,
        expect.objectContaining({
          title: aiOutput.title,
          summary: aiOutput.summary,
        })
      );
    });

    it('should respect forceRefresh option', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);

      // Cache exists but should be ignored
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: {
          id: 'cached-snapshot',
          output: { title: 'Old Title', summary: 'Old Summary' },
          createdAt: new Date(),
        } as any,
        cached: true,
      });

      const newOutput = {
        title: 'Updated Title',
        summary: 'Updated Summary',
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: newOutput,
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);
      conversationRepository.update.mockResolvedValue({} as any);

      const result = await service.generate({ userId, conversationId }, { forceRefresh: true });

      expect(result.title).toBe(newOutput.title);
      expect(result.summary).toBe(newOutput.summary);
      expect(runtimeExecutor.execute).toHaveBeenCalled();
    });

    it('should throw NotFoundException when conversation not found', async () => {
      const userId = 'user-123';
      const conversationId = 'non-existent';

      conversationRepository.findOne.mockResolvedValue(null);

      await expect(service.generate({ userId, conversationId })).rejects.toThrow(
        NotFoundException
      );
      await expect(service.generate({ userId, conversationId })).rejects.toThrow(
        'Conversation not found: non-existent'
      );
    });

    it('should handle conversation without messages', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      const conversationWithoutMessages = {
        ...mockConversation,
        messages: [],
      };

      conversationRepository.findOne.mockResolvedValue(conversationWithoutMessages);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: {
          title: 'New Conversation',
          summary: 'No messages yet',
        },
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);
      conversationRepository.update.mockResolvedValue({} as any);

      const result = await service.generate({ userId, conversationId });

      expect(result.title).toBe('New Conversation');
      expect(result.summary).toBe('No messages yet');
    });

    it('should handle conversation with null summary field', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      const conversationWithNullSummary = {
        ...mockConversation,
        summary: null,
      };

      conversationRepository.findOne.mockResolvedValue(conversationWithNullSummary);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: {
          title: 'Generated Title',
          summary: 'Generated Summary',
        },
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);
      conversationRepository.update.mockResolvedValue({} as any);

      const result = await service.generate({ userId, conversationId });

      expect(result.summary).toBe('Generated Summary');
      expect(conversationRepository.update).toHaveBeenCalledWith(
        conversationId,
        expect.objectContaining({
          summary: 'Generated Summary',
        })
      );
    });

    it('should propagate runtime executor errors', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockRejectedValue(
        new Error('AI service unavailable')
      );

      await expect(service.generate({ userId, conversationId })).rejects.toThrow(
        'AI service unavailable'
      );

      // Should not update conversation if generation fails
      expect(conversationRepository.update).not.toHaveBeenCalled();
    });

    it('should propagate snapshot save errors', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: {
          title: 'Test Title',
          summary: 'Test Summary',
        },
      });

      snapshotService.createSnapshot.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Should propagate error when snapshot save fails
      await expect(service.generate({ userId, conversationId })).rejects.toThrow(
        'Database connection failed'
      );

      // update should not be called if snapshot fails
      expect(conversationRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('source hash computation', () => {
    it('should compute consistent hash for same conversation content', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: {
          title: 'Test Title',
          summary: 'Test Summary',
        },
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);
      conversationRepository.update.mockResolvedValue({} as any);

      const result1 = await service.generate({ userId, conversationId });

      // Reset mocks for second call
      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const result2 = await service.generate({ userId, conversationId });

      expect(result1.sourceHash).toBe(result2.sourceHash);
    });

    it('should compute different hash for different content', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      const originalConversation = { ...mockConversation };
      const updatedConversation = {
        ...mockConversation,
        content: 'Updated content with new discussion',
      };

      conversationRepository.findOne
        .mockResolvedValueOnce(originalConversation)
        .mockResolvedValueOnce(updatedConversation);

      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: {
          title: 'Test Title',
          summary: 'Test Summary',
        },
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);
      conversationRepository.update.mockResolvedValue({} as any);

      const result1 = await service.generate({ userId, conversationId });

      // Reset for second call
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const result2 = await service.generate({ userId, conversationId });

      expect(result1.sourceHash).not.toBe(result2.sourceHash);
    });
  });

  describe('TTL configuration', () => {
    it('should use 24 hour TTL for snapshots', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: {
          title: 'Test Title',
          summary: 'Test Summary',
        },
      });

      let capturedTtl: number | undefined;
      snapshotService.createSnapshot.mockImplementation((data: any) => {
        capturedTtl = data.ttlSeconds;
        return Promise.resolve({ id: 'snapshot-123' } as any);
      });

      conversationRepository.update.mockResolvedValue({} as any);

      await service.generate({ userId, conversationId });

      expect(capturedTtl).toBe(86400); // 24 hours = 86400 seconds
    });
  });

  describe('conversation writeback', () => {
    it('should update conversation with generated title and summary', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const aiOutput = {
        title: 'Meeting Follow-up',
        summary: 'Discussed next steps for the project',
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: aiOutput,
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);
      conversationRepository.update.mockResolvedValue({} as any);

      await service.generate({ userId, conversationId });

      expect(conversationRepository.update).toHaveBeenCalledWith(
        conversationId,
        {
          title: aiOutput.title,
          summary: aiOutput.summary,
        }
      );
    });

    it('should not update conversation when using cached result', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);

      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: {
          id: 'snapshot-123',
          output: {
            title: 'Cached Title',
            summary: 'Cached Summary',
          },
          createdAt: new Date(),
        } as any,
        cached: true,
      });

      await service.generate({ userId, conversationId });

      expect(conversationRepository.update).not.toHaveBeenCalled();
    });
  });
});
