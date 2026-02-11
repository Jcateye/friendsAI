import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { ActionTrackingService } from './action-tracking.service';
import { ActionOutcomeLog } from '../v3-entities/action-outcome-log.entity';

describe('ActionTrackingService', () => {
  let service: ActionTrackingService;
  let dataSource: jest.Mocked<DataSource>;
  let repository: jest.Mocked<Repository<ActionOutcomeLog>>;

  // Mock test data
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockAgentId = 'agent-001';
  const mockSuggestionId = 'sugg-001';
  const mockMessageId = 'msg-001';
  const mockContactId = 'contact-001';

  beforeEach(async () => {
    // Create mock repository
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ActionOutcomeLog>>;

    // Create mock DataSource
    dataSource = {
      getRepository: jest.fn().mockReturnValue(repository),
    } as unknown as jest.Mocked<DataSource>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionTrackingService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<ActionTrackingService>(ActionTrackingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordSuggestionShown', () => {
    it('should record suggestion shown event successfully', async () => {
      const input = {
        userId: mockUserId,
        agentId: mockAgentId,
        suggestionId: mockSuggestionId,
        suggestionType: 'follow_up',
        content: { message: 'Follow up with contact' },
      };

      const mockEntity = {
        id: 'log-001',
        userId: mockUserId,
        actionType: 'suggestion_shown',
        suggestionId: mockSuggestionId,
      } as ActionOutcomeLog;

      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordSuggestionShown(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          contactId: null,
          agentName: mockAgentId,
          actionType: 'suggestion_shown',
          outcomeType: 'pending',
          suggestionId: mockSuggestionId,
        }),
      );
      expect(repository.save).toHaveBeenCalledWith(mockEntity);
    });

    it('should handle database errors gracefully', async () => {
      const input = {
        userId: mockUserId,
        agentId: mockAgentId,
        suggestionId: mockSuggestionId,
        suggestionType: 'follow_up',
        content: { message: 'Test' },
      };

      const mockError = new Error('Database connection failed');
      repository.create.mockImplementation(() => {
        throw mockError;
      });

      // Should not throw error (fire-and-forget pattern)
      await expect(service.recordSuggestionShown(input)).resolves.not.toThrow();

      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should store suggestion metadata correctly', async () => {
      const input = {
        userId: mockUserId,
        agentId: mockAgentId,
        suggestionId: mockSuggestionId,
        suggestionType: 'network_action',
        content: { contactId: mockContactId, action: 'send_message' },
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordSuggestionShown(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionMetadata: {
            suggestionId: mockSuggestionId,
            suggestionType: 'network_action',
            content: { contactId: mockContactId, action: 'send_message' },
          },
        }),
      );
    });
  });

  describe('recordSuggestionAccepted', () => {
    it('should record suggestion accepted event successfully', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
      };

      const mockEntity = {
        id: 'log-002',
        userId: mockUserId,
        actionType: 'suggestion_accepted',
        outcomeType: 'success',
      } as ActionOutcomeLog;

      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordSuggestionAccepted(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          actionType: 'suggestion_accepted',
          outcomeType: 'success',
          outcomeReason: 'user_accepted',
          agentName: 'system',
        }),
      );
      expect(repository.save).toHaveBeenCalledWith(mockEntity);
    });

    it('should handle database errors on accept event', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
      };

      repository.create.mockImplementation(() => {
        throw new Error('Save failed');
      });

      await expect(service.recordSuggestionAccepted(input)).resolves.not.toThrow();
    });
  });

  describe('recordMessageSent', () => {
    it('should record message sent event for contact recipient', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
        messageId: mockMessageId,
        recipientId: mockContactId,
        recipientType: 'contact' as const,
        channel: 'feishu' as const,
        contentPreview: 'Hello, checking in...',
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordMessageSent(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          contactId: mockContactId,
          actionType: 'message_sent',
          platform: 'feishu',
          messageId: mockMessageId,
          followupRequired: true,
        }),
      );
    });

    it('should record message sent event for group recipient', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
        messageId: mockMessageId,
        recipientId: 'group-001',
        recipientType: 'group' as const,
        channel: 'wechat' as const,
        contentPreview: 'Group message',
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordMessageSent(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contactId: null, // Group recipients have null contactId
          platform: 'wechat',
        }),
      );
    });

    it('should map manual channel to web platform', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
        messageId: mockMessageId,
        recipientId: mockContactId,
        recipientType: 'contact' as const,
        channel: 'manual' as const,
        contentPreview: 'Manual message',
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordMessageSent(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'web',
        }),
      );
    });

    it('should map unknown channel to other platform', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
        messageId: mockMessageId,
        recipientId: mockContactId,
        recipientType: 'contact' as const,
        channel: 'unknown' as any,
        contentPreview: 'Unknown channel message',
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordMessageSent(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'other',
        }),
      );
    });

    it('should store message metadata correctly', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
        messageId: mockMessageId,
        recipientId: mockContactId,
        recipientType: 'contact' as const,
        channel: 'feishu' as const,
        contentPreview: 'Test preview',
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordMessageSent(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionMetadata: {
            suggestionId: mockSuggestionId,
            messageId: mockMessageId,
            recipientId: mockContactId,
            recipientType: 'contact',
            channel: 'feishu',
            contentPreview: 'Test preview',
          },
          metadata: {
            eventCategory: 'agent_message',
            recipientType: 'contact',
          },
        }),
      );
    });
  });

  describe('recordMessageReplied', () => {
    const mockOriginalEvent: ActionOutcomeLog = {
      id: 'sent-log-001',
      userId: mockUserId,
      contactId: mockContactId,
      agentName: 'system',
      actionType: 'message_sent',
      actionTimestamp: new Date(Date.now() - 100000), // 100 seconds ago
      platform: 'feishu',
      messageId: mockMessageId,
      conversationId: null,
      suggestionId: mockSuggestionId,
    } as ActionOutcomeLog;

    it('should record message replied event successfully', async () => {
      const input = {
        messageSentId: mockMessageId,
        replyPreview: 'Thanks for reaching out!',
      };

      repository.findOne.mockResolvedValue(mockOriginalEvent);

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordMessageReplied(input);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { messageId: mockMessageId, actionType: 'message_sent' },
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          contactId: mockContactId,
          actionType: 'message_replied',
          platform: 'feishu',
          conversionScore: 1.0,
          responseTimeSeconds: expect.any(Number),
        }),
      );
    });

    it('should calculate response time correctly', async () => {
      const input = {
        messageSentId: mockMessageId,
        replyPreview: 'Reply',
      };

      const timestamp100SecondsAgo = new Date(Date.now() - 100000);
      const originalEventWithTimestamp = {
        ...mockOriginalEvent,
        actionTimestamp: timestamp100SecondsAgo,
      } as ActionOutcomeLog;

      repository.findOne.mockResolvedValue(originalEventWithTimestamp);

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordMessageReplied(input);

      const createCall = repository.create.mock.calls[0][0];
      // Response time should be approximately 100 seconds (allowing for test execution time)
      expect(createCall.responseTimeSeconds).toBeGreaterThanOrEqual(99);
      expect(createCall.responseTimeSeconds).toBeLessThanOrEqual(110);
    });

    it('should handle missing original event gracefully', async () => {
      const input = {
        messageSentId: 'non-existent-msg',
        replyPreview: 'Reply',
      };

      repository.findOne.mockResolvedValue(null);

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordMessageReplied(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '',
          contactId: null,
          agentName: 'system',
          platform: 'other',
          messageId: null,
          conversationId: null,
          suggestionId: null,
          responseTimeSeconds: null,
        }),
      );
    });

    it('should handle database error when finding original event', async () => {
      const input = {
        messageSentId: mockMessageId,
        replyPreview: 'Reply',
      };

      repository.findOne.mockRejectedValue(new Error('Database error'));

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      // Should still create event with defaults
      await service.recordMessageReplied(input);

      expect(repository.create).toHaveBeenCalled();
    });

    it('should store reply metadata correctly', async () => {
      const input = {
        messageSentId: mockMessageId,
        replyPreview: 'Got it, will do!',
      };

      repository.findOne.mockResolvedValue(mockOriginalEvent);

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordMessageReplied(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionMetadata: {
            messageSentId: mockMessageId,
            replyPreview: 'Got it, will do!',
          },
          metadata: {
            eventCategory: 'agent_message',
            originalMessageSentId: mockMessageId,
          },
        }),
      );
    });
  });

  describe('recordFollowupCompleted', () => {
    it('should record auto followup completed event', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
        completionType: 'auto' as const,
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordFollowupCompleted(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          actionType: 'followup_completed',
          outcomeType: 'success',
          outcomeReason: 'auto_followup',
          conversionScore: 0.8,
        }),
      );
    });

    it('should record manual followup completed event', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
        completionType: 'manual' as const,
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordFollowupCompleted(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outcomeType: 'partial',
          outcomeReason: 'manual_followup',
          conversionScore: 1.0,
        }),
      );
    });

    it('should store followup metadata correctly', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
        completionType: 'auto' as const,
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordFollowupCompleted(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionMetadata: {
            suggestionId: mockSuggestionId,
            completionType: 'auto',
          },
          metadata: {
            eventCategory: 'agent_followup',
            completionType: 'auto',
          },
        }),
      );
    });

    it('should handle database errors on followup completion', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
        completionType: 'manual' as const,
      };

      repository.create.mockImplementation(() => {
        throw new Error('Save failed');
      });

      await expect(service.recordFollowupCompleted(input)).resolves.not.toThrow();
    });
  });

  describe('safeSave (private method behavior)', () => {
    it('should log error when save fails', async () => {
      const input = {
        userId: mockUserId,
        agentId: mockAgentId,
        suggestionId: mockSuggestionId,
        suggestionType: 'test',
        content: {},
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockRejectedValue(new Error('Connection lost'));

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.recordSuggestionShown(input);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save action tracking event'),
        expect.any(String),
      );
    });

    it('should not throw when repository save fails', async () => {
      const input = {
        userId: mockUserId,
        agentId: mockAgentId,
        suggestionId: mockSuggestionId,
        suggestionType: 'test',
        content: {},
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockRejectedValue(new Error('Any error'));

      await expect(service.recordSuggestionShown(input)).resolves.not.toThrow();
    });
  });

  describe('channel to platform mapping', () => {
    const testCases = [
      { channel: 'feishu', expectedPlatform: 'feishu' },
      { channel: 'wechat', expectedPlatform: 'wechat' },
      { channel: 'manual', expectedPlatform: 'web' },
      { channel: 'email', expectedPlatform: 'other' },
      { channel: 'slack', expectedPlatform: 'other' },
    ];

    testCases.forEach(({ channel, expectedPlatform }) => {
      it(`should map ${channel} channel to ${expectedPlatform} platform`, async () => {
        const input = {
          userId: mockUserId,
          suggestionId: mockSuggestionId,
          messageId: mockMessageId,
          recipientId: mockContactId,
          recipientType: 'contact' as const,
          channel: channel as any,
          contentPreview: 'Test',
        };

        const mockEntity = {} as ActionOutcomeLog;
        repository.create.mockReturnValue(mockEntity);
        repository.save.mockResolvedValue(mockEntity);

        await service.recordMessageSent(input);

        expect(repository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            platform: expectedPlatform,
          }),
        );
      });
    });
  });

  describe('action type mapping', () => {
    it('should use correct action type for suggestion shown', async () => {
      const input = {
        userId: mockUserId,
        agentId: mockAgentId,
        suggestionId: mockSuggestionId,
        suggestionType: 'test',
        content: {},
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordSuggestionShown(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'suggestion_shown',
        }),
      );
    });

    it('should use correct action type for suggestion accepted', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordSuggestionAccepted(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'suggestion_accepted',
        }),
      );
    });

    it('should use correct action type for followup completed', async () => {
      const input = {
        userId: mockUserId,
        suggestionId: mockSuggestionId,
        completionType: 'auto' as const,
      };

      const mockEntity = {} as ActionOutcomeLog;
      repository.create.mockReturnValue(mockEntity);
      repository.save.mockResolvedValue(mockEntity);

      await service.recordFollowupCompleted(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'followup_completed',
        }),
      );
    });
  });
});
