import { FallbackStrategyService } from './fallback-strategy.service';
import type { DataAvailabilityReport } from './data-availability-validator';
import type { NetworkActionInput } from './network-action.types';

describe('FallbackStrategyService', () => {
  let service: FallbackStrategyService;

  beforeEach(() => {
    service = new FallbackStrategyService();
  });

  const createDataReport = (
    overrides: Partial<DataAvailabilityReport> = {},
  ): DataAvailabilityReport => ({
    hasSufficientData: true,
    dataQuality: 'medium',
    missingFields: [],
    confidenceAdjustment: 0.3,
    metrics: {
      totalContacts: 5,
      totalInteractions: 10,
      recentInteractions: 5,
      contactsWithInteraction: 3,
      avgInteractionsPerContact: 2,
      hasReciprocityData: true,
      dataFreshness: 'fresh',
    },
    ...overrides,
  });

  describe('shouldUseFallback', () => {
    it('should return true for low quality data', () => {
      const report = createDataReport({ dataQuality: 'low' });
      expect(service.shouldUseFallback(report)).toBe(true);
    });

    it('should return false for medium quality data', () => {
      const report = createDataReport({ dataQuality: 'medium' });
      expect(service.shouldUseFallback(report)).toBe(false);
    });

    it('should return false for high quality data', () => {
      const report = createDataReport({ dataQuality: 'high' });
      expect(service.shouldUseFallback(report)).toBe(false);
    });
  });

  describe('generateFallbackResponse', () => {
    describe('No Contacts Scenario', () => {
      it('should return appropriate response when no contacts exist', () => {
        const input: NetworkActionInput = { userId: 'test-user' };
        const report = createDataReport({
          dataQuality: 'low',
          hasSufficientData: false,
          metrics: {
            totalContacts: 0,
            totalInteractions: 0,
            recentInteractions: 0,
            contactsWithInteraction: 0,
            avgInteractionsPerContact: 0,
            hasReciprocityData: false,
            dataFreshness: 'unknown',
          },
          missingFields: ['contacts', 'interactions'],
        });

        const result = service.generateFallbackResponse(input, report);

        expect(result.synthesis).toContain('暂无联系人数据');
        expect(result.followUps).toEqual([]);
        expect(result.recommendations).toHaveLength(1);
        expect(result.recommendations![0].type).toBe('connection');
        expect(result.nextActions.length).toBeGreaterThanOrEqual(1);
        expect(result.nextActions[0].action).toContain('添加第一位联系人');
      });
    });

    describe('No Interactions Scenario', () => {
      it('should return appropriate response when contacts exist but no interactions', () => {
        const input: NetworkActionInput = { userId: 'test-user' };
        const report = createDataReport({
          dataQuality: 'low',
          metrics: {
            totalContacts: 5,
            totalInteractions: 0,
            recentInteractions: 0,
            contactsWithInteraction: 0,
            avgInteractionsPerContact: 0,
            hasReciprocityData: false,
            dataFreshness: 'unknown',
          },
          missingFields: ['interactions', 'contact_interactions'],
        });

        const result = service.generateFallbackResponse(input, report);

        expect(result.synthesis).toContain('还没有任何互动记录');
        expect(result.synthesis).toContain('5 位联系人');
        expect(result.followUps).toHaveLength(1);
        expect(result.followUps![0].contactId).toBe('generic');
        expect(result.nextActions.length).toBeGreaterThanOrEqual(1);
        expect(result.nextActions[0].action).toContain('添加互动记录');
      });
    });

    describe('Low Data Scenario', () => {
      it('should return conservative response with limited data', () => {
        const input: NetworkActionInput = { userId: 'test-user' };
        const report = createDataReport({
          dataQuality: 'low',
          metrics: {
            totalContacts: 2,
            totalInteractions: 1,
            recentInteractions: 1,
            contactsWithInteraction: 1,
            avgInteractionsPerContact: 0.5,
            hasReciprocityData: false,
            dataFreshness: 'fresh',
          },
          missingFields: [],
        });

        const result = service.generateFallbackResponse(input, report);

        expect(result.synthesis).toContain('当前数据较少');
        expect(result.synthesis).toContain('2 位联系人');
        expect(result.synthesis).toContain('1 条互动');
        expect(result.queues?.lightTouches).toHaveLength(1);
        expect(result.queues?.lightTouches![0].action).toContain('添加更多互动记录');
      });
    });

    describe('Medium Data Scenario', () => {
      it('should return moderate quality response', () => {
        const input: NetworkActionInput = { userId: 'test-user' };
        const report = createDataReport({
          dataQuality: 'medium',
          metrics: {
            totalContacts: 5,
            totalInteractions: 8,
            recentInteractions: 4,
            contactsWithInteraction: 3,
            avgInteractionsPerContact: 1.6,
            hasReciprocityData: true,
            dataFreshness: 'fresh',
          },
          missingFields: [],
        });

        const result = service.generateFallbackResponse(input, report);

        expect(result.synthesis).toContain('5 位联系人');
        expect(result.synthesis).toContain('8 条互动');
        expect(result.recommendations).toHaveLength(0);
      });
    });

    describe('Stale Data Scenario', () => {
      it('should indicate stale data in next actions', () => {
        const input: NetworkActionInput = { userId: 'test-user' };
        const report = createDataReport({
          dataQuality: 'medium',
          metrics: {
            totalContacts: 3,
            totalInteractions: 5,
            recentInteractions: 0,
            contactsWithInteraction: 3,
            avgInteractionsPerContact: 1.67,
            hasReciprocityData: true,
            dataFreshness: 'stale',
          },
          missingFields: ['recent_interactions'],
        });

        const result = service.generateFallbackResponse(input, report);

        const staleAction = result.nextActions?.find(
          (a) => a.action.includes('最近互动') || a.action.includes('记录最近'),
        );
        expect(staleAction).toBeDefined();
        expect(staleAction?.priority).toBe('medium');
      });
    });
  });

  describe('adjustConfidence', () => {
    it('should not adjust high quality data confidence', () => {
      const report = createDataReport({
        dataQuality: 'high',
        confidenceAdjustment: 0,
      });

      const result = service.adjustConfidence(0.8, report);

      expect(result).toBe(0.8);
    });

    it('should cap medium quality data confidence at 0.6', () => {
      const report = createDataReport({
        dataQuality: 'medium',
        confidenceAdjustment: 0.3,
      });

      // Even with high base confidence, should be capped at 0.6
      expect(service.adjustConfidence(0.9, report)).toBe(0.6);
    });

    it('should apply adjustment for medium quality', () => {
      const report = createDataReport({
        dataQuality: 'medium',
        confidenceAdjustment: 0.3,
      });

      // Base confidence minus adjustment, then capped at maxMediumQualityConfidence (0.6)
      const result = service.adjustConfidence(0.7, report);

      expect(result).toBeCloseTo(0.4, 10); // 0.7 - 0.3 = 0.4
    });

    it('should cap low quality data confidence at 0.3', () => {
      const report = createDataReport({
        dataQuality: 'low',
        confidenceAdjustment: 0.6,
      });

      expect(service.adjustConfidence(0.9, report)).toBeCloseTo(0.3, 10);
      // 0.5 - 0.6 = -0.1, max(0, -0.1) = 0, then min(0, 0.3) = 0
      expect(service.adjustConfidence(0.5, report)).toBe(0);
    });

    it('should return 0 for very low base confidence', () => {
      const report = createDataReport({
        dataQuality: 'low',
        confidenceAdjustment: 0.6,
      });

      expect(service.adjustConfidence(0.1, report)).toBe(0);
    });

    it('should handle stale high quality data', () => {
      const report = createDataReport({
        dataQuality: 'high',
        confidenceAdjustment: 0.1, // Small adjustment for stale data
        metrics: {
          totalContacts: 10,
          totalInteractions: 50,
          recentInteractions: 5,
          contactsWithInteraction: 8,
          avgInteractionsPerContact: 5,
          hasReciprocityData: true,
          dataFreshness: 'stale',
        },
      });

      expect(service.adjustConfidence(0.8, report)).toBeCloseTo(0.7, 10); // 0.8 - 0.1
    });
  });

  describe('requiresConfirmation', () => {
    it('should require confirmation for low quality data', () => {
      const report = createDataReport({ dataQuality: 'low' });

      expect(service.requiresConfirmation(report)).toBe(true);
    });

    it('should not require confirmation for high quality data', () => {
      const report = createDataReport({ dataQuality: 'high' });

      expect(service.requiresConfirmation(report)).toBe(false);
    });

    it('should not require confirmation for medium quality data by default', () => {
      const report = createDataReport({ dataQuality: 'medium' });

      expect(service.requiresConfirmation(report)).toBe(false);
    });

    it('should require confirmation for medium quality when configured', () => {
      const customService = new FallbackStrategyService({
        requireConfirmationForMedium: true,
      });

      const report = createDataReport({ dataQuality: 'medium' });

      expect(customService.requiresConfirmation(report)).toBe(true);
    });
  });

  describe('generateDataLimitationEvidence', () => {
    it('should generate evidence for low quality data', () => {
      const report = createDataReport({
        dataQuality: 'low',
        // Ensure contactsWithInteraction equals totalContacts to avoid coverage evidence
        metrics: {
          totalContacts: 5,
          totalInteractions: 10,
          recentInteractions: 5,
          contactsWithInteraction: 5, // Equal to totalContacts
          avgInteractionsPerContact: 2,
          hasReciprocityData: true,
          dataFreshness: 'fresh',
        },
      });

      const evidence = service.generateDataLimitationEvidence(report);

      expect(evidence).toHaveLength(1);
      expect(evidence[0].type).toBe('data_limitation');
      expect(evidence[0].source).toBe('system');
    });

    it('should generate evidence for stale data', () => {
      const report = createDataReport({
        dataQuality: 'medium',
        missingFields: ['recent_interactions'],
      });

      const evidence = service.generateDataLimitationEvidence(report);

      const staleEvidence = evidence.find((e) => e.type === 'recency');
      expect(staleEvidence).toBeDefined();
      expect(staleEvidence?.reference).toContain('最近');
    });

    it('should generate evidence for partial coverage', () => {
      const report = createDataReport({
        dataQuality: 'medium',
        metrics: {
          totalContacts: 10,
          totalInteractions: 5,
          recentInteractions: 3,
          contactsWithInteraction: 3,
          avgInteractionsPerContact: 0.5,
          hasReciprocityData: true,
          dataFreshness: 'fresh',
        },
      });

      const evidence = service.generateDataLimitationEvidence(report);

      const coverageEvidence = evidence.find((e) => e.type === 'coverage');
      expect(coverageEvidence).toBeDefined();
      expect(coverageEvidence?.reference).toContain('3/10');
    });

    it('should generate multiple evidence types', () => {
      const report = createDataReport({
        dataQuality: 'low',
        missingFields: ['recent_interactions'],
        metrics: {
          totalContacts: 10,
          totalInteractions: 5,
          recentInteractions: 1,
          contactsWithInteraction: 3,
          avgInteractionsPerContact: 0.5,
          hasReciprocityData: true,
          dataFreshness: 'stale',
        },
      });

      const evidence = service.generateDataLimitationEvidence(report);

      expect(evidence.length).toBeGreaterThanOrEqual(2);
      expect(evidence.some((e) => e.type === 'data_limitation')).toBe(true);
      expect(evidence.some((e) => e.type === 'coverage')).toBe(true);
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom maxLowQualityConfidence', () => {
      const customService = new FallbackStrategyService({
        maxLowQualityConfidence: 0.5,
      });

      const report = createDataReport({
        dataQuality: 'low',
        confidenceAdjustment: 0.6,
      });

      const result = customService.adjustConfidence(0.9, report);

      // 0.9 - 0.6 = 0.3, which is below the cap of 0.5, so result is 0.3
      expect(result).toBeCloseTo(0.3, 10);
    });

    it('should use custom maxMediumQualityConfidence', () => {
      const customService = new FallbackStrategyService({
        maxMediumQualityConfidence: 0.4,
      });

      const report = createDataReport({
        dataQuality: 'medium',
        confidenceAdjustment: 0.3,
      });

      const result = customService.adjustConfidence(0.9, report);

      expect(result).toBe(0.4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty metrics gracefully', () => {
      const input: NetworkActionInput = { userId: 'test-user' };
      const report = createDataReport({
        metrics: {
          totalContacts: 0,
          totalInteractions: 0,
          recentInteractions: 0,
          contactsWithInteraction: 0,
          avgInteractionsPerContact: 0,
          hasReciprocityData: false,
          dataFreshness: 'unknown',
        },
        missingFields: ['contacts', 'interactions'],
      });

      const result = service.generateFallbackResponse(input, report);

      expect(result.synthesis).toBeDefined();
      expect(result.nextActions).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.followUps).toEqual([]);
    });

    it('should handle very high confidence with low data quality', () => {
      const report = createDataReport({
        dataQuality: 'low',
        confidenceAdjustment: 0.6,
      });

      const result = service.adjustConfidence(1.0, report);

      expect(result).toBeLessThanOrEqual(0.3);
    });

    it('should handle zero base confidence', () => {
      const report = createDataReport({
        dataQuality: 'medium',
        confidenceAdjustment: 0.3,
      });

      const result = service.adjustConfidence(0, report);

      expect(result).toBe(0);
    });
  });
});
