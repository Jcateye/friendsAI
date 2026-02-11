import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AgentFeedbackController } from './agent-feedback.controller';
import { AgentFeedbackService } from './agent-feedback.service';
import { FeedbackType } from './dto/agent-feedback.dto';

describe('AgentFeedbackController', () => {
  let controller: AgentFeedbackController;
  let service: jest.Mocked<AgentFeedbackService>;

  const mockFeedbackId = '01234567-89ab-cdef-0123-456789abcdef';
  const mockUserId = 'user-123';
  const mockRunId = '01234567-89ab-cdef-0123-456789abcd1';
  const mockActionId = 'action-123';
  const mockContactId = '01234567-89ab-cdef-0123-456789abcd2';

  const mockFeedbackResponse = {
    id: mockFeedbackId,
    userId: mockUserId,
    agentId: 'contact_insight',
    runId: mockRunId,
    actionId: mockActionId,
    contactId: mockContactId,
    feedbackType: FeedbackType.ACTION_ACCEPTED,
    rating: 5,
    comment: 'Very helpful',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentFeedbackController],
      providers: [
        {
          provide: AgentFeedbackService,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findByRunId: jest.fn(),
            findByContactId: jest.fn(),
            findByActionId: jest.fn(),
            getAgentStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AgentFeedbackController>(AgentFeedbackController);
    service = module.get(AgentFeedbackService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /agent/feedback', () => {
    it('should create feedback with authenticated user', async () => {
      const createDto = {
        agentId: 'contact_insight',
        runId: mockRunId,
        actionId: mockActionId,
        feedbackType: FeedbackType.ACTION_ACCEPTED,
        rating: 5,
      };

      const mockReq = { user: { id: mockUserId } } as any;
      service.create.mockResolvedValue(mockFeedbackResponse);

      const result = await controller.create(mockReq, createDto);

      expect(service.create).toHaveBeenCalledWith(mockUserId, createDto);
      expect(result).toEqual(mockFeedbackResponse);
    });

    it('should create feedback without authenticated user', async () => {
      const createDto = {
        agentId: 'network_action',
        feedbackType: FeedbackType.INSIGHT_HELPFUL,
      };

      const mockReq = {} as any;
      service.create.mockResolvedValue({ ...mockFeedbackResponse, agentId: 'network_action' });

      await controller.create(mockReq, createDto);

      expect(service.create).toHaveBeenCalledWith('', createDto);
    });

    it('should accept all feedback types', async () => {
      const feedbackTypes: FeedbackType[] = [
        FeedbackType.ACTION_ACCEPTED,
        FeedbackType.ACTION_REJECTED,
        FeedbackType.ACTION_MODIFIED,
        FeedbackType.INSIGHT_HELPFUL,
        FeedbackType.INSIGHT_NOT_HELPFUL,
        FeedbackType.OTHER,
      ];

      const mockReq = { user: { id: mockUserId } } as any;
      service.create.mockResolvedValue(mockFeedbackResponse);

      for (const feedbackType of feedbackTypes) {
        const createDto = {
          agentId: 'contact_insight',
          feedbackType,
        };

        await controller.create(mockReq, createDto);

        expect(service.create).toHaveBeenCalledWith(mockUserId, expect.objectContaining({
          feedbackType,
        }));
      }
    });
  });

  describe('GET /agent/feedback/:id', () => {
    it('should return feedback by ID', async () => {
      const mockReq = { user: { id: mockUserId } } as any;
      service.findOne.mockResolvedValue(mockFeedbackResponse);

      const result = await controller.findOne(mockFeedbackId, mockReq);

      expect(service.findOne).toHaveBeenCalledWith(mockFeedbackId, mockUserId);
      expect(result).toEqual(mockFeedbackResponse);
    });

    it('should throw error when feedback not found', async () => {
      const mockReq = { user: { id: mockUserId } } as any;
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne(mockFeedbackId, mockReq)).rejects.toThrow('Feedback not found');
    });
  });

  describe('GET /agent/feedback/run/:runId', () => {
    it('should return all feedback for a run', async () => {
      const mockFeedbacks = [
        mockFeedbackResponse,
        { ...mockFeedbackResponse, id: 'feedback-2', feedbackType: FeedbackType.ACTION_REJECTED },
      ];

      const mockReq = { user: { id: mockUserId } } as any;
      service.findByRunId.mockResolvedValue(mockFeedbacks);

      const result = await controller.findByRunId(mockRunId, mockReq);

      expect(service.findByRunId).toHaveBeenCalledWith(mockRunId, mockUserId);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no feedback found', async () => {
      const mockReq = { user: { id: mockUserId } } as any;
      service.findByRunId.mockResolvedValue([]);

      const result = await controller.findByRunId(mockRunId, mockReq);

      expect(result).toEqual([]);
    });
  });

  describe('GET /agent/feedback/contact/:contactId', () => {
    it('should return all feedback for a contact', async () => {
      const mockFeedbacks = [
        mockFeedbackResponse,
        { ...mockFeedbackResponse, id: 'feedback-2', actionId: 'action-456' },
      ];

      const mockReq = { user: { id: mockUserId } } as any;
      service.findByContactId.mockResolvedValue(mockFeedbacks);

      const result = await controller.findByContactId(mockContactId, mockReq);

      expect(service.findByContactId).toHaveBeenCalledWith(mockContactId, mockUserId);
      expect(result).toHaveLength(2);
    });
  });

  describe('GET /agent/feedback/action/:actionId', () => {
    it('should return all feedback for an action', async () => {
      const mockFeedbacks = [
        mockFeedbackResponse,
        { ...mockFeedbackResponse, id: 'feedback-2', feedbackType: FeedbackType.ACTION_MODIFIED },
      ];

      const mockReq = { user: { id: mockUserId } } as any;
      service.findByActionId.mockResolvedValue(mockFeedbacks);

      const result = await controller.findByActionId(mockActionId, mockReq);

      expect(service.findByActionId).toHaveBeenCalledWith(mockActionId, mockUserId);
      expect(result).toHaveLength(2);
    });
  });

  describe('GET /agent/feedback/stats/:agentId', () => {
    it('should return agent statistics', async () => {
      const mockStats = {
        totalFeedback: 100,
        averageRating: 4.2,
        feedbackByType: {
          action_accepted: 40,
          action_rejected: 10,
          action_modified: 20,
          insight_helpful: 25,
          insight_not_helpful: 5,
        },
        acceptanceRate: 0.57,
      };

      const mockReq = { user: { id: mockUserId } } as any;
      service.getAgentStats.mockResolvedValue(mockStats);

      const result = await controller.getAgentStats('contact_insight', mockReq);

      expect(service.getAgentStats).toHaveBeenCalledWith('contact_insight', mockUserId);
      expect(result.totalFeedback).toBe(100);
      expect(result.averageRating).toBe(4.2);
      expect(result.acceptanceRate).toBe(0.57);
    });

    it('should return stats with zero feedback', async () => {
      const mockStats = {
        totalFeedback: 0,
        averageRating: null,
        feedbackByType: {},
        acceptanceRate: 0,
      };

      const mockReq = { user: { id: mockUserId } } as any;
      service.getAgentStats.mockResolvedValue(mockStats);

      const result = await controller.getAgentStats('network_action', mockReq);

      expect(result.totalFeedback).toBe(0);
      expect(result.averageRating).toBeNull();
      expect(result.acceptanceRate).toBe(0);
    });
  });

  describe('Feedback Loop Scenarios', () => {
    it('should support run -> action -> feedback loop', async () => {
      // 1. Run agent produces action cards
      const runId = mockRunId;
      const actionId = mockActionId;

      // 2. User provides feedback on action
      const createDto = {
        agentId: 'contact_insight',
        runId,
        actionId,
        feedbackType: FeedbackType.ACTION_ACCEPTED,
        rating: 5,
      };

      const mockReq = { user: { id: mockUserId } } as any;
      service.create.mockResolvedValue(mockFeedbackResponse);

      const feedback = await controller.create(mockReq, createDto);

      expect(feedback.runId).toBe(runId);
      expect(feedback.actionId).toBe(actionId);

      // 3. Can retrieve feedback by runId
      service.findByRunId.mockResolvedValue([feedback]);
      const runFeedbacks = await controller.findByRunId(runId, mockReq);

      expect(runFeedbacks).toHaveLength(1);
      expect(runFeedbacks[0].actionId).toBe(actionId);

      // 4. Can retrieve feedback by actionId
      service.findByActionId.mockResolvedValue([feedback]);
      const actionFeedbacks = await controller.findByActionId(actionId, mockReq);

      expect(actionFeedbacks).toHaveLength(1);
      expect(actionFeedbacks[0].runId).toBe(runId);
    });

    it('should track modified action feedback', async () => {
      const createDto = {
        agentId: 'contact_insight',
        actionId: mockActionId,
        feedbackType: FeedbackType.ACTION_MODIFIED,
        originalData: { action: 'Send message', goal: 'maintain' },
        modifiedData: { action: 'Send email', goal: 'maintain' },
        reason: 'Email is more appropriate',
      };

      const mockReq = { user: { id: mockUserId } } as any;
      service.create.mockResolvedValue({
        ...mockFeedbackResponse,
        feedbackType: FeedbackType.ACTION_MODIFIED,
        originalData: createDto.originalData,
        modifiedData: createDto.modifiedData,
        reason: createDto.reason,
      });

      const feedback = await controller.create(mockReq, createDto);

      expect(feedback.feedbackType).toBe(FeedbackType.ACTION_MODIFIED);
      expect(feedback.originalData).toEqual(createDto.originalData);
      expect(feedback.modifiedData).toEqual(createDto.modifiedData);
      expect(feedback.reason).toBe(createDto.reason);
    });

    it('should track rejected action feedback with reason', async () => {
      const createDto = {
        agentId: 'network_action',
        actionId: mockActionId,
        feedbackType: FeedbackType.ACTION_REJECTED,
        reason: 'Timing is not right',
      };

      const mockReq = { user: { id: mockUserId } } as any;
      service.create.mockResolvedValue({
        ...mockFeedbackResponse,
        feedbackType: FeedbackType.ACTION_REJECTED,
        reason: createDto.reason,
      });

      const feedback = await controller.create(mockReq, createDto);

      expect(feedback.feedbackType).toBe(FeedbackType.ACTION_REJECTED);
      expect(feedback.reason).toBe('Timing is not right');
    });
  });

  describe('Rating Boundary Values', () => {
    const ratingTests = [
      { rating: 1, description: 'lowest rating' },
      { rating: 3, description: 'average rating' },
      { rating: 5, description: 'highest rating' },
    ];

    ratingTests.forEach(({ rating, description }) => {
      it(`should accept ${description}`, async () => {
        const createDto = {
          agentId: 'contact_insight',
          feedbackType: FeedbackType.INSIGHT_HELPFUL,
          rating,
        };

        const mockReq = { user: { id: mockUserId } } as any;
        service.create.mockResolvedValue({
          ...mockFeedbackResponse,
          rating,
        });

        const feedback = await controller.create(mockReq, createDto);

        expect(feedback.rating).toBe(rating);
      });
    });
  });
});
