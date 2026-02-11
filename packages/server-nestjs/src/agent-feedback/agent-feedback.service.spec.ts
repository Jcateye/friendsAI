import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentFeedbackService } from './agent-feedback.service';
import { AgentFeedback } from '../entities/agent-feedback.entity';
import { CreateAgentFeedbackDto, FeedbackType } from './dto/agent-feedback.dto';

describe('AgentFeedbackService', () => {
  let service: AgentFeedbackService;
  let repository: jest.Mocked<Repository<AgentFeedback>>;

  const mockFeedbackId = '01234567-89ab-cdef-0123-456789abcdef';
  const mockUserId = 'user-123';
  const mockRunId = 'run-123';
  const mockActionId = 'action-123';
  const mockContactId = 'contact-123';

  const mockFeedback: AgentFeedback = {
    id: mockFeedbackId,
    userId: mockUserId,
    agentId: 'contact_insight',
    runId: mockRunId,
    actionId: mockActionId,
    contactId: mockContactId,
    feedbackType: 'action_accepted',
    rating: 5,
    comment: 'Very helpful suggestion',
    originalData: { action: 'Send message', goal: 'maintain' },
    modifiedData: null,
    reason: null,
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    updatedAt: new Date('2024-01-15T10:00:00.000Z'),
  } as AgentFeedback;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentFeedbackService,
        {
          provide: getRepositoryToken(AgentFeedback),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AgentFeedbackService>(AgentFeedbackService);
    repository = module.get(getRepositoryToken(AgentFeedback));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new feedback record', async () => {
      const dto: CreateAgentFeedbackDto = {
        agentId: 'contact_insight',
        runId: mockRunId,
        actionId: mockActionId,
        contactId: mockContactId,
        feedbackType: FeedbackType.ACTION_ACCEPTED,
        rating: 5,
        comment: 'Very helpful suggestion',
        originalData: { action: 'Send message', goal: 'maintain' },
      };

      repository.create.mockReturnValue(mockFeedback);
      repository.save.mockResolvedValue(mockFeedback);

      const result = await service.create(mockUserId, dto);

      expect(repository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        agentId: dto.agentId,
        runId: dto.runId,
        actionId: dto.actionId,
        contactId: dto.contactId,
        feedbackType: dto.feedbackType,
        rating: dto.rating,
        comment: dto.comment,
        originalData: dto.originalData,
        modifiedData: dto.modifiedData,
        reason: dto.reason,
      });
      expect(repository.save).toHaveBeenCalledWith(mockFeedback);
      expect(result.id).toBe(mockFeedbackId);
      expect(result.userId).toBe(mockUserId);
      expect(result.agentId).toBe('contact_insight');
      expect(result.feedbackType).toBe(FeedbackType.ACTION_ACCEPTED);
      expect(result.rating).toBe(5);
    });

    it('should create feedback with minimal required fields', async () => {
      const dto: CreateAgentFeedbackDto = {
        agentId: 'network_action',
        feedbackType: FeedbackType.INSIGHT_HELPFUL,
      };

      const minimalFeedback = { ...mockFeedback, feedbackType: 'insight_helpful' as const };
      repository.create.mockReturnValue(minimalFeedback);
      repository.save.mockResolvedValue(minimalFeedback);

      const result = await service.create(mockUserId, dto);

      expect(result.feedbackType).toBe(FeedbackType.INSIGHT_HELPFUL);
    });

    it('should create feedback with modified data', async () => {
      const dto: CreateAgentFeedbackDto = {
        agentId: 'contact_insight',
        actionId: mockActionId,
        feedbackType: FeedbackType.ACTION_MODIFIED,
        originalData: { action: 'Send message' },
        modifiedData: { action: 'Send email instead' },
        reason: 'Email is more professional',
      };

      const modifiedFeedback = { ...mockFeedback, feedbackType: 'action_modified' as const, modifiedData: dto.modifiedData, reason: dto.reason };
      repository.create.mockReturnValue(modifiedFeedback);
      repository.save.mockResolvedValue(modifiedFeedback);

      const result = await service.create(mockUserId, dto);

      expect(result.feedbackType).toBe(FeedbackType.ACTION_MODIFIED);
      expect(result.modifiedData).toEqual({ action: 'Send email instead' });
      expect(result.reason).toBe('Email is more professional');
    });

    it('should create feedback with rejection', async () => {
      const dto: CreateAgentFeedbackDto = {
        agentId: 'network_action',
        actionId: mockActionId,
        feedbackType: FeedbackType.ACTION_REJECTED,
        reason: 'Not relevant right now',
      };

      const rejectedFeedback = { ...mockFeedback, feedbackType: 'action_rejected' as const, reason: dto.reason };
      repository.create.mockReturnValue(rejectedFeedback);
      repository.save.mockRejectedValue(rejectedFeedback);

      const result = await service.create(mockUserId, dto);

      expect(result.feedbackType).toBe(FeedbackType.ACTION_REJECTED);
      expect(result.reason).toBe('Not relevant right now');
    });
  });

  describe('findOne', () => {
    it('should return feedback by ID', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockFeedback),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findOne(mockFeedbackId, mockUserId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('feedback.id = :id', { id: mockFeedbackId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('feedback.userId = :userId', { userId: mockUserId });
      expect(result).toBeDefined();
      expect(result?.id).toBe(mockFeedbackId);
    });

    it('should return null if feedback not found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findOne('non-existent-id', mockUserId);

      expect(result).toBeNull();
    });

    it('should query without userId filter when userId is not provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockFeedback),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findOne(mockFeedbackId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('feedback.id = :id', { id: mockFeedbackId });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findByRunId', () => {
    it('should return all feedback for a run', async () => {
      const mockFeedbacks = [mockFeedback, { ...mockFeedback, id: 'feedback-2' }];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFeedbacks),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByRunId(mockRunId, mockUserId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('feedback.runId = :runId', { runId: mockRunId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('feedback.userId = :userId', { userId: mockUserId });
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no feedback found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByRunId('non-existent-run', mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('findByContactId', () => {
    it('should return all feedback for a contact', async () => {
      const mockFeedbacks = [mockFeedback];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFeedbacks),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByContactId(mockContactId, mockUserId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('feedback.contactId = :contactId', { contactId: mockContactId });
      expect(result).toHaveLength(1);
      expect(result[0].contactId).toBe(mockContactId);
    });
  });

  describe('findByActionId', () => {
    it('should return all feedback for an action', async () => {
      const mockFeedbacks = [
        mockFeedback,
        { ...mockFeedback, id: 'feedback-2', feedbackType: 'action_modified' as const },
      ];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFeedbacks),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByActionId(mockActionId, mockUserId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('feedback.actionId = :actionId', { actionId: mockActionId });
      expect(result).toHaveLength(2);
    });
  });

  describe('getAgentStats', () => {
    it('should return aggregated stats for an agent', async () => {
      const mockFeedbacks: AgentFeedback[] = [
        { ...mockFeedback, feedbackType: 'action_accepted', rating: 5 },
        { ...mockFeedback, id: 'f2', feedbackType: 'action_accepted', rating: 4 },
        { ...mockFeedback, id: 'f3', feedbackType: 'action_rejected', rating: 2 },
        { ...mockFeedback, id: 'f4', feedbackType: 'action_modified', rating: 3 },
        { ...mockFeedback, id: 'f5', feedbackType: 'insight_helpful', rating: null },
        { ...mockFeedback, id: 'f6', feedbackType: 'insight_not_helpful', rating: null },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFeedbacks),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getAgentStats('contact_insight', mockUserId);

      expect(result.totalFeedback).toBe(6);
      expect(result.averageRating).toBeCloseTo(3.5, 1); // (5+4+2+3)/4 = 3.5
      expect(result.feedbackByType).toEqual({
        action_accepted: 2,
        action_rejected: 1,
        action_modified: 1,
        insight_helpful: 1,
        insight_not_helpful: 1,
      });
      expect(result.acceptanceRate).toBeCloseTo(0.5, 1); // 2/4 = 0.5
    });

    it('should handle empty feedback array', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getAgentStats('network_action', mockUserId);

      expect(result.totalFeedback).toBe(0);
      expect(result.averageRating).toBeNull();
      expect(result.feedbackByType).toEqual({});
      expect(result.acceptanceRate).toBe(0);
    });

    it('should calculate acceptance rate correctly with only action feedback', async () => {
      const mockFeedbacks: AgentFeedback[] = [
        { ...mockFeedback, feedbackType: 'action_accepted', rating: 5 },
        { ...mockFeedback, id: 'f2', feedbackType: 'action_rejected', rating: 1 },
        { ...mockFeedback, id: 'f3', feedbackType: 'insight_helpful', rating: 4 }, // Not counted for acceptance
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFeedbacks),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getAgentStats('contact_insight', mockUserId);

      // Only action_accepted, action_rejected, action_modified count
      // acceptance_rate = action_accepted / (action_accepted + action_rejected + action_modified)
      // = 1 / 2 = 0.5
      expect(result.acceptanceRate).toBe(0.5);
    });

    it('should return null for averageRating when no ratings exist', async () => {
      const mockFeedbacks: AgentFeedback[] = [
        { ...mockFeedback, feedbackType: 'action_accepted', rating: null },
        { ...mockFeedback, id: 'f2', feedbackType: 'insight_helpful', rating: null },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFeedbacks),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getAgentStats('contact_insight', mockUserId);

      expect(result.averageRating).toBeNull();
    });

    it('should work without userId filter', async () => {
      const mockFeedbacks: AgentFeedback[] = [
        { ...mockFeedback, feedbackType: 'action_accepted', rating: 5 },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFeedbacks),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getAgentStats('contact_insight');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('feedback.agentId = :agentId', { agentId: 'contact_insight' });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('toResponseDto', () => {
    it('should convert entity to response DTO', async () => {
      repository.create.mockReturnValue(mockFeedback);
      repository.save.mockResolvedValue(mockFeedback);

      const dto: CreateAgentFeedbackDto = {
        agentId: 'contact_insight',
        feedbackType: FeedbackType.ACTION_ACCEPTED,
      };

      const result = await service.create(mockUserId, dto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('agentId');
      expect(result).toHaveProperty('feedbackType');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z');
      expect(result.updatedAt).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should handle null values correctly', async () => {
      const nullFeedback = {
        ...mockFeedback,
        userId: null,
        runId: null,
        actionId: null,
        contactId: null,
        rating: null,
        comment: null,
        originalData: null,
        modifiedData: null,
        reason: null,
      };

      repository.create.mockReturnValue(nullFeedback);
      repository.save.mockResolvedValue(nullFeedback);

      const dto: CreateAgentFeedbackDto = {
        agentId: 'network_action',
        feedbackType: FeedbackType.OTHER,
      };

      const result = await service.create('', dto);

      expect(result.userId).toBe('');
      expect(result.runId).toBeUndefined();
      expect(result.actionId).toBeUndefined();
      expect(result.contactId).toBeUndefined();
      expect(result.rating).toBeUndefined();
      expect(result.comment).toBeUndefined();
      expect(result.originalData).toBeUndefined();
      expect(result.modifiedData).toBeUndefined();
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Boundary Values for Rating', () => {
    const ratingTests = [
      { rating: 1, description: 'minimum rating' },
      { rating: 5, description: 'maximum rating' },
      { rating: 3, description: 'middle rating' },
    ];

    ratingTests.forEach(({ rating, description }) => {
      it(`should handle ${description}`, async () => {
        const feedbackWithRating = { ...mockFeedback, rating };
        repository.create.mockReturnValue(feedbackWithRating);
        repository.save.mockResolvedValue(feedbackWithRating);

        const dto: CreateAgentFeedbackDto = {
          agentId: 'contact_insight',
          feedbackType: FeedbackType.INSIGHT_HELPFUL,
          rating,
        };

        const result = await service.create(mockUserId, dto);

        expect(result.rating).toBe(rating);
      });
    });
  });
});
