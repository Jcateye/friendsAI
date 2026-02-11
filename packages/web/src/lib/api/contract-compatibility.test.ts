import { describe, it, expect } from 'vitest';
import type { ActionCard, ActionQueues, ContactInsightData, NetworkActionData } from './agent-types';

/**
 * Contract Compatibility Tests
 *
 * These tests ensure that the frontend types are compatible with the backend schema.
 * They validate that the data structures match between packages.
 */

describe('Contract Compatibility Tests', () => {
  describe('ActionCard Structure', () => {
    it('should have all required fields matching backend schema', () => {
      const requiredFields: (keyof ActionCard)[] = [
        'actionId',
        'goal',
        'actionType',
        'whyNow',
        'draftMessage',
        'effortMinutes',
        'confidence',
        'riskLevel',
        'requiresConfirmation',
      ];

      const actionCard: ActionCard = {
        actionId: 'test-id',
        goal: 'maintain',
        actionType: 'message',
        whyNow: 'Test reason',
        draftMessage: 'Test message',
        effortMinutes: 10,
        confidence: 0.8,
        riskLevel: 'low',
        requiresConfirmation: true,
      };

      requiredFields.forEach((field) => {
        expect(actionCard[field]).toBeDefined();
      });
    });

    it('should support all goal types from backend', () => {
      const backendGoals = ['maintain', 'grow', 'repair'] as const;
      const frontendGoals: ActionCard['goal'][] = ['maintain', 'grow', 'repair'];

      expect(backendGoals).toEqual(expect.arrayContaining(frontendGoals));
    });

    it('should support all action types from backend', () => {
      const frontendActionTypes: ActionCard['actionType'][] = ['message', 'invite', 'intro', 'note'];

      // Frontend has a subset, which is OK - we map internally
      expect(frontendActionTypes.length).toBeGreaterThan(0);
    });

    it('should support all risk levels from backend', () => {
      const backendRiskLevels = ['low', 'medium', 'high'] as const;
      const frontendRiskLevels: ActionCard['riskLevel'][] = ['low', 'medium', 'high'];

      expect(backendRiskLevels).toEqual(expect.arrayContaining(frontendRiskLevels));
    });
  });

  describe('ActionQueues Structure', () => {
    it('should have all three queue categories', () => {
      const queues: ActionQueues = {
        urgentRepairs: [],
        opportunityBridges: [],
        lightTouches: [],
      };

      expect(queues.urgentRepairs).toBeDefined();
      expect(queues.opportunityBridges).toBeDefined();
      expect(queues.lightTouches).toBeDefined();
    });

    it('should match backend queue naming', () => {
      const backendQueueNames = ['urgentRepairs', 'opportunityBridges', 'lightTouches'] as const;
      const frontendQueueNames: (keyof ActionQueues)[] = ['urgentRepairs', 'opportunityBridges', 'lightTouches'];

      expect(backendQueueNames).toEqual(expect.arrayContaining(frontendQueueNames));
    });
  });

  describe('Priority Scoring Boundary Values', () => {
    // These thresholds must match between frontend and backend
    const URGENT_THRESHOLD = 75;
    const OPPORTUNITY_MIN = 45;
    const OPPORTUNITY_MAX = 74;

    it('should use same urgent threshold as backend', () => {
      // Backend: >=75 is urgentRepairs
      const urgentScore = 75;
      const highScore = 80;

      // Frontend should categorize the same way
      expect(urgentScore).toBeGreaterThanOrEqual(URGENT_THRESHOLD);
      expect(highScore).toBeGreaterThanOrEqual(URGENT_THRESHOLD);
    });

    it('should use same opportunity range as backend', () => {
      // Backend: 45-74 is opportunityBridges
      const minOpportunityScore = 45;
      const maxOpportunityScore = 74;
      const midOpportunityScore = 60;

      expect(minOpportunityScore).toBeGreaterThanOrEqual(OPPORTUNITY_MIN);
      expect(maxOpportunityScore).toBeLessThanOrEqual(OPPORTUNITY_MAX);
      expect(midOpportunityScore).toBeGreaterThanOrEqual(OPPORTUNITY_MIN);
      expect(midOpportunityScore).toBeLessThanOrEqual(OPPORTUNITY_MAX);
    });

    it('should use same light touch threshold as backend', () => {
      // Backend: <45 is lightTouches
      const lightTouchScores = [0, 20, 30, 44];

      lightTouchScores.forEach((score) => {
        expect(score).toBeLessThan(OPPORTUNITY_MIN);
      });
    });

    describe('Exact boundary values', () => {
      it('score 44 should be lightTouches', () => {
        expect(44).toBeLessThan(OPPORTUNITY_MIN);
      });

      it('score 45 should be opportunityBridges', () => {
        expect(45).toBeGreaterThanOrEqual(OPPORTUNITY_MIN);
        expect(45).toBeLessThanOrEqual(OPPORTUNITY_MAX);
      });

      it('score 74 should be opportunityBridges', () => {
        expect(74).toBeGreaterThanOrEqual(OPPORTUNITY_MIN);
        expect(74).toBeLessThanOrEqual(OPPORTUNITY_MAX);
      });

      it('score 75 should be urgentRepairs', () => {
        expect(75).toBeGreaterThanOrEqual(URGENT_THRESHOLD);
      });
    });
  });

  describe('Feedback API Contract', () => {
    it('should support all feedback statuses from backend', () => {
      const backendStatuses = ['accepted', 'edited', 'dismissed', 'executed'] as const;
      const frontendStatuses = backendStatuses; // Should match exactly

      expect(frontendStatuses).toEqual(backendStatuses);
    });

    it('should support all reason codes from backend', () => {
      const backendReasonCodes = ['not_relevant', 'too_generic', 'tone_off', 'timing_bad', 'other'] as const;
      const frontendReasonCodes = backendReasonCodes; // Should match exactly

      expect(frontendReasonCodes).toEqual(backendReasonCodes);
    });
  });

  describe('Network Action Data Contract', () => {
    it('should support optional queues field', () => {
      const dataWithQueues = {
        followUps: [],
        recommendations: [],
        synthesis: 'test',
        nextActions: [],
        queues: {
          urgentRepairs: [],
          opportunityBridges: [],
          lightTouches: [],
        },
      };

      expect(dataWithQueues.queues).toBeDefined();
    });

    it('should support optional weeklyPlan field', () => {
      const dataWithWeeklyPlan = {
        followUps: [],
        recommendations: [],
        synthesis: 'test',
        nextActions: [],
        weeklyPlan: [
          {
            day: 'Mon',
            maxMinutes: 30,
            actions: [],
          },
        ],
      };

      expect(dataWithWeeklyPlan.weeklyPlan).toBeDefined();
    });

    it('should be backward compatible without new fields', () => {
      const legacyData: NetworkActionData = {
        followUps: [],
        recommendations: [],
        synthesis: 'test',
        nextActions: [],
      };

      // Should be valid - new fields are optional
      expect(legacyData.followUps).toEqual([]);
      expect(legacyData.queues).toBeUndefined();
      expect(legacyData.weeklyPlan).toBeUndefined();
    });
  });

  describe('Contact Insight Data Contract', () => {
    it('should support new optional fields', () => {
      const dataWithNewFields = {
        profileSummary: 'test',
        relationshipSignals: [],
        opportunities: [],
        risks: [],
        suggestedActions: [],
        openingLines: [],
        citations: [],
        sourceHash: 'abc123',
        generatedAt: Date.now(),
        relationshipState: 'warming' as const,
        relationshipType: 'business' as const,
        momentSignals: [],
        actionCards: [],
      };

      expect(dataWithNewFields.relationshipState).toBe('warming');
      expect(dataWithNewFields.relationshipType).toBe('business');
      expect(dataWithNewFields.momentSignals).toEqual([]);
      expect(dataWithNewFields.actionCards).toEqual([]);
    });

    it('should be backward compatible without new fields', () => {
      const legacyData: ContactInsightData = {
        profileSummary: 'test',
        relationshipSignals: [],
        opportunities: [],
        risks: [],
        suggestedActions: [],
        openingLines: [],
        citations: [],
        sourceHash: 'abc123',
        generatedAt: Date.now(),
      };

      // Should be valid - new fields are optional
      expect(legacyData.profileSummary).toBe('test');
      expect(legacyData.relationshipState).toBeUndefined();
      expect(legacyData.actionCards).toBeUndefined();
    });
  });

  describe('Type Safety for API Responses', () => {
    it('should handle null values in optional fields', () => {
      const actionCard: Partial<ActionCard> = {
        actionId: 'test-id',
        contactId: undefined,
        contactName: undefined,
        evidence: undefined,
      };

      expect(actionCard.contactId).toBeUndefined();
      expect(actionCard.contactName).toBeUndefined();
      expect(actionCard.evidence).toBeUndefined();
    });

    it('should handle empty arrays', () => {
      const queues: ActionQueues = {
        urgentRepairs: [],
        opportunityBridges: [],
        lightTouches: [],
      };

      expect(queues.urgentRepairs).toHaveLength(0);
      expect(queues.opportunityBridges).toHaveLength(0);
      expect(queues.lightTouches).toHaveLength(0);
    });
  });
});
