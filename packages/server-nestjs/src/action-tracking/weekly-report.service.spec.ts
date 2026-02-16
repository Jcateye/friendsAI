import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyReportService } from './weekly-report.service';
import { ActionOutcomeLog } from '../v3-entities/action-outcome-log.entity';
import { WeeklyReportCache } from '../v3-entities/weekly-report-cache.entity';
import { WeeklyMetrics } from './action-tracking.types';

describe('WeeklyReportService', () => {
  let service: WeeklyReportService;
  let logRepo: jest.Mocked<Repository<ActionOutcomeLog>>;
  let cacheRepo: jest.Mocked<Repository<WeeklyReportCache>>;

  // Mock test data
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  const mockLogs: ActionOutcomeLog[] = [
    {
      id: 'log-1',
      userId: mockUserId,
      actionType: 'suggestion_shown',
      actionTimestamp: new Date('2026-02-08T10:00:00Z'),
    } as ActionOutcomeLog,
    {
      id: 'log-2',
      userId: mockUserId,
      actionType: 'suggestion_shown',
      actionTimestamp: new Date('2026-02-08T11:00:00Z'),
    } as ActionOutcomeLog,
    {
      id: 'log-3',
      userId: mockUserId,
      actionType: 'suggestion_accepted',
      actionTimestamp: new Date('2026-02-08T12:00:00Z'),
    } as ActionOutcomeLog,
    {
      id: 'log-4',
      userId: mockUserId,
      actionType: 'message_sent',
      actionTimestamp: new Date('2026-02-08T13:00:00Z'),
    } as ActionOutcomeLog,
    {
      id: 'log-5',
      userId: mockUserId,
      actionType: 'message_replied',
      actionTimestamp: new Date('2026-02-08T14:00:00Z'),
    } as ActionOutcomeLog,
    {
      id: 'log-6',
      userId: mockUserId,
      actionType: 'followup_completed',
      actionTimestamp: new Date('2026-02-08T15:00:00Z'),
    } as ActionOutcomeLog,
  ];

  const mockCacheEntity = {
    id: 'cache-1',
    userId: mockUserId,
    weekStartDate: new Date('2026-02-02T00:00:00Z'), // Monday
    weekEndDate: new Date('2026-02-08T23:59:59Z'), // Sunday
    totalSuggestions: 2,
    acceptedSuggestions: 1,
    messagesSent: 1,
    messagesReplied: 1,
    followupsCompleted: 1,
    acceptanceRate: 50.0,
    replyRate: 100.0,
    conversionRate: 100.0,
    reportData: {},
    topContacts: null,
    riskContacts: null,
    resolvedDebts: 0,
    newDebts: 0,
    keyInsights: null,
    improvementSuggestions: null,
    generationVersion: null,
    isRegenerated: false,
    createdAt: new Date(Date.now() - 1000), // 1 second ago
    updatedAt: new Date(Date.now() - 1000),
  } as WeeklyReportCache;

  beforeEach(async () => {
    // Create mock repositories
    logRepo = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ActionOutcomeLog>>;

    cacheRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<WeeklyReportCache>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeeklyReportService,
        {
          provide: getRepositoryToken(ActionOutcomeLog),
          useValue: logRepo,
        },
        {
          provide: getRepositoryToken(WeeklyReportCache),
          useValue: cacheRepo,
        },
      ],
    }).compile();

    service = module.get<WeeklyReportService>(WeeklyReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should return cached metrics when cache exists and is valid', async () => {
      cacheRepo.findOne.mockResolvedValue(mockCacheEntity);

      const result = await service.getMetrics(mockUserId, 7);

      expect(cacheRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
          }),
        }),
      );
      expect(logRepo.find).not.toHaveBeenCalled();
      expect(result).toEqual({
        actionCompletionRate: 50.0,
        replyRate: 100.0,
        followupRate: 100.0,
        totalSuggestions: 2,
        totalAccepted: 1,
        totalSent: 1,
        totalReplied: 1,
      });
    });

    it('should calculate new metrics when cache does not exist', async () => {
      cacheRepo.findOne.mockResolvedValue(null);
      logRepo.find.mockResolvedValue(mockLogs);

      const mockNewCache = { ...mockCacheEntity };
      cacheRepo.create.mockReturnValue(mockNewCache);
      cacheRepo.save.mockResolvedValue(mockNewCache);

      const result = await service.getMetrics(mockUserId, 7);

      expect(logRepo.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: mockUserId,
        }),
        order: {
          actionTimestamp: 'ASC',
        },
      });
      expect(cacheRepo.create).toHaveBeenCalled();
      expect(cacheRepo.save).toHaveBeenCalledWith(mockNewCache);
      expect(result).toEqual({
        actionCompletionRate: 50.0, // 1/2 * 100
        replyRate: 100.0, // 1/1 * 100
        followupRate: 100.0, // 1/1 * 100
        totalSuggestions: 2,
        totalAccepted: 1,
        totalSent: 1,
        totalReplied: 1,
      });
    });

    it('should calculate new metrics when cache is expired', async () => {
      const expiredCache = {
        ...mockCacheEntity,
        updatedAt: new Date(Date.now() - 61 * 60 * 1000), // 61 minutes ago (> 1 hour)
      };

      cacheRepo.findOne.mockResolvedValue(expiredCache);
      logRepo.find.mockResolvedValue(mockLogs);

      const mockNewCache = { ...mockCacheEntity };
      cacheRepo.create.mockReturnValue(mockNewCache);
      cacheRepo.save.mockResolvedValue(mockNewCache);

      await service.getMetrics(mockUserId, 7);

      expect(logRepo.find).toHaveBeenCalled();
      expect(cacheRepo.save).toHaveBeenCalled();
    });

    it('should update existing cache instead of creating new one', async () => {
      cacheRepo.findOne
        .mockResolvedValueOnce(null) // First call for getValidCache
        .mockResolvedValueOnce(mockCacheEntity); // Second call for updateCache

      logRepo.find.mockResolvedValue(mockLogs);
      cacheRepo.save.mockResolvedValue(mockCacheEntity);

      await service.getMetrics(mockUserId, 7);

      expect(cacheRepo.create).not.toHaveBeenCalled();
      expect(cacheRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockCacheEntity.id,
        }),
      );
    });

    it('should calculate metrics correctly with various data points', async () => {
      const comprehensiveLogs: ActionOutcomeLog[] = [
        // 10 suggestions shown
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `log-${i}`,
          userId: mockUserId,
          actionType: 'suggestion_shown' as const,
          actionTimestamp: new Date('2026-02-08T10:00:00Z'),
        } as ActionOutcomeLog)),
        // 7 accepted
        ...Array.from({ length: 7 }, (_, i) => ({
          id: `log-acc-${i}`,
          userId: mockUserId,
          actionType: 'suggestion_accepted' as const,
          actionTimestamp: new Date('2026-02-08T11:00:00Z'),
        } as ActionOutcomeLog)),
        // 5 messages sent
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `log-sent-${i}`,
          userId: mockUserId,
          actionType: 'message_sent' as const,
          actionTimestamp: new Date('2026-02-08T12:00:00Z'),
        } as ActionOutcomeLog)),
        // 3 messages replied
        ...Array.from({ length: 3 }, (_, i) => ({
          id: `log-reply-${i}`,
          userId: mockUserId,
          actionType: 'message_replied' as const,
          actionTimestamp: new Date('2026-02-08T13:00:00Z'),
        } as ActionOutcomeLog)),
        // 2 followups completed
        ...Array.from({ length: 2 }, (_, i) => ({
          id: `log-followup-${i}`,
          userId: mockUserId,
          actionType: 'followup_completed' as const,
          actionTimestamp: new Date('2026-02-08T14:00:00Z'),
        } as ActionOutcomeLog)),
      ];

      cacheRepo.findOne.mockResolvedValue(null);
      logRepo.find.mockResolvedValue(comprehensiveLogs);

      const mockNewCache = { ...mockCacheEntity };
      cacheRepo.create.mockReturnValue(mockNewCache);
      cacheRepo.save.mockResolvedValue(mockNewCache);

      const result = await service.getMetrics(mockUserId, 7);

      expect(result.actionCompletionRate).toBeCloseTo(70.0, 1); // 7/10 * 100
      expect(result.replyRate).toBeCloseTo(60.0, 1); // 3/5 * 100
      expect(result.followupRate).toBeCloseTo(28.57, 1); // 2/7 * 100
      expect(result.totalSuggestions).toBe(10);
      expect(result.totalAccepted).toBe(7);
      expect(result.totalSent).toBe(5);
      expect(result.totalReplied).toBe(3);
    });

    it('should handle zero division for empty metrics', async () => {
      cacheRepo.findOne.mockResolvedValue(null);
      logRepo.find.mockResolvedValue([]);

      const mockNewCache = { ...mockCacheEntity };
      cacheRepo.create.mockReturnValue(mockNewCache);
      cacheRepo.save.mockResolvedValue(mockNewCache);

      const result = await service.getMetrics(mockUserId, 7);

      expect(result).toEqual({
        actionCompletionRate: 0,
        replyRate: 0,
        followupRate: 0,
        totalSuggestions: 0,
        totalAccepted: 0,
        totalSent: 0,
        totalReplied: 0,
      });
    });

    it('should handle custom days parameter', async () => {
      cacheRepo.findOne.mockResolvedValue(null);
      logRepo.find.mockResolvedValue([]);

      const mockNewCache = { ...mockCacheEntity };
      cacheRepo.create.mockReturnValue(mockNewCache);
      cacheRepo.save.mockResolvedValue(mockNewCache);

      await service.getMetrics(mockUserId, 14);

      expect(logRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            actionTimestamp: expect.anything(),
          }),
        }),
      );
    });

    it('should use default 7 days when days parameter is not provided', async () => {
      cacheRepo.findOne.mockResolvedValue(null);
      logRepo.find.mockResolvedValue([]);

      const mockNewCache = { ...mockCacheEntity };
      cacheRepo.create.mockReturnValue(mockNewCache);
      cacheRepo.save.mockResolvedValue(mockNewCache);

      await service.getMetrics(mockUserId);

      expect(logRepo.find).toHaveBeenCalled();
    });
  });

  describe('refreshCache', () => {
    it('should force refresh cache regardless of validity', async () => {
      // Even with valid cache, it should recalculate
      const validCache = {
        ...mockCacheEntity,
        updatedAt: new Date(Date.now() - 1000), // Recent
      };

      cacheRepo.findOne
        .mockResolvedValueOnce(validCache) // For updateCache check
        .mockResolvedValueOnce(null); // For initial getValidCache

      logRepo.find.mockResolvedValue(mockLogs);

      const mockNewCache = { ...mockCacheEntity };
      cacheRepo.create.mockReturnValue(mockNewCache);
      cacheRepo.save.mockResolvedValue(mockNewCache);

      await service.refreshCache(mockUserId);

      expect(logRepo.find).toHaveBeenCalled();
      expect(cacheRepo.save).toHaveBeenCalled();
    });

    it('should log cache refresh completion', async () => {
      cacheRepo.findOne.mockResolvedValue(null);
      logRepo.find.mockResolvedValue([]);

      const mockNewCache = { ...mockCacheEntity };
      cacheRepo.create.mockReturnValue(mockNewCache);
      cacheRepo.save.mockResolvedValue(mockNewCache);

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.refreshCache(mockUserId);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache refreshed'),
      );
    });

    it('should update existing cache when refreshing', async () => {
      cacheRepo.findOne.mockResolvedValue(mockCacheEntity);
      logRepo.find.mockResolvedValue(mockLogs);
      cacheRepo.save.mockResolvedValue(mockCacheEntity);

      await service.refreshCache(mockUserId);

      expect(cacheRepo.findOne).toHaveBeenCalled();
      expect(cacheRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
        }),
      );
    });
  });

  describe('cache TTL behavior', () => {
    it('should consider cache valid within 1 hour', async () => {
      const recentCache = {
        ...mockCacheEntity,
        updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };

      cacheRepo.findOne.mockResolvedValue(recentCache);

      const result = await service.getMetrics(mockUserId, 7);

      expect(logRepo.find).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should consider cache invalid after 1 hour', async () => {
      const expiredCache = {
        ...mockCacheEntity,
        updatedAt: new Date(Date.now() - 61 * 60 * 1000), // 61 minutes ago
      };

      cacheRepo.findOne.mockResolvedValue(expiredCache);
      logRepo.find.mockResolvedValue([]);

      const mockNewCache = { ...mockCacheEntity };
      cacheRepo.create.mockReturnValue(mockNewCache);
      cacheRepo.save.mockResolvedValue(mockNewCache);

      await service.getMetrics(mockUserId, 7);

      expect(logRepo.find).toHaveBeenCalled();
    });

    it('should handle cache exactly at 1 hour boundary', async () => {
      const boundaryCache = {
        ...mockCacheEntity,
        updatedAt: new Date(Date.now() - 60 * 60 * 1000), // Exactly 1 hour ago
      };

      cacheRepo.findOne.mockResolvedValue(boundaryCache);

      const result = await service.getMetrics(mockUserId, 7);

      // At exactly 1 hour, cache is considered valid, so metrics are returned from cache
      expect(result).toBeDefined();
      expect(result.actionCompletionRate).toBe(50.0);
    });
  });

  describe('followup calculation', () => {
    it('should correctly calculate followupsCompleted in cache', async () => {
      cacheRepo.findOne.mockResolvedValue(null);

      const logsWithFollowups: ActionOutcomeLog[] = [
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `log-${i}`,
          userId: mockUserId,
          actionType: 'suggestion_accepted' as const,
          actionTimestamp: new Date('2026-02-08T10:00:00Z'),
        } as ActionOutcomeLog)),
        ...Array.from({ length: 4 }, (_, i) => ({
          id: `log-followup-${i}`,
          userId: mockUserId,
          actionType: 'followup_completed' as const,
          actionTimestamp: new Date('2026-02-08T11:00:00Z'),
        } as ActionOutcomeLog)),
      ];

      logRepo.find.mockResolvedValue(logsWithFollowups);
      cacheRepo.create.mockReturnValue({} as WeeklyReportCache);
      cacheRepo.save.mockResolvedValue({} as WeeklyReportCache);

      await service.getMetrics(mockUserId, 7);

      // Verify save was called with calculated metrics
      expect(cacheRepo.save).toHaveBeenCalled();
    });

    it('should calculate followupCompleted as 0 when no accepted suggestions', async () => {
      cacheRepo.findOne.mockResolvedValue(null);
      logRepo.find.mockResolvedValue([]);
      cacheRepo.create.mockReturnValue({} as WeeklyReportCache);
      cacheRepo.save.mockResolvedValue({} as WeeklyReportCache);

      const result = await service.getMetrics(mockUserId, 7);

      // Verify metrics are zero when no data
      expect(result.totalAccepted).toBe(0);
      expect(result.followupRate).toBe(0);
    });
  });

  describe('buildMetricsFromCache (private method behavior)', () => {
    it('should handle null values in cache', async () => {
      const cacheWithNulls = {
        ...mockCacheEntity,
        acceptanceRate: null,
        replyRate: null,
        conversionRate: null,
      };

      cacheRepo.findOne.mockResolvedValue(cacheWithNulls);

      const result = await service.getMetrics(mockUserId, 7);

      expect(result).toEqual({
        actionCompletionRate: 0,
        replyRate: 0,
        followupRate: 0,
        totalSuggestions: 2,
        totalAccepted: 1,
        totalSent: 1,
        totalReplied: 1,
      });
    });
  });
});
