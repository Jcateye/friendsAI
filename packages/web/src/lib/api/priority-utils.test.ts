import { describe, it, expect } from 'vitest';
import type { ActionCard, ActionQueues } from './agent-types';

/**
 * Priority scoring constants matching the backend implementation
 */
const PRIORITY_URGENT_THRESHOLD = 75;
const PRIORITY_OPPORTUNITY_MIN = 45;

/**
 * Categorize an action into a queue based on its priority score
 * This should match the backend priority-scorer.ts logic
 */
export function categorizeActionByScore(score: number): 'urgentRepairs' | 'opportunityBridges' | 'lightTouches' {
  if (score >= PRIORITY_URGENT_THRESHOLD) {
    return 'urgentRepairs';
  }
  if (score >= PRIORITY_OPPORTUNITY_MIN) {
    return 'opportunityBridges';
  }
  return 'lightTouches';
}

/**
 * Calculate priority score from action card properties
 * This is a simplified version that could be used on the frontend for display purposes
 */
export function calculateActionPriority(action: Partial<ActionCard>): number {
  let score = 0;

  // Risk level contribution (0-40 points)
  const riskScore: Record<ActionCard['riskLevel'], number> = {
    high: 40,
    medium: 20,
    low: 0,
  };
  score += riskScore[action.riskLevel || 'low'];

  // Effort penalty (higher effort = slightly lower priority, 0-10 points)
  if (action.effortMinutes) {
    score += Math.min(10, Math.round(action.effortMinutes / 10));
  }

  // Confidence boost (0-20 points)
  if (action.confidence) {
    score += Math.round(action.confidence * 20);
  }

  // Goal urgency (0-30 points)
  const goalScore: Record<ActionCard['goal'], number> = {
    repair: 30,
    grow: 15,
    maintain: 0,
  };
  score += goalScore[action.goal || 'maintain'];

  return Math.min(100, score);
}

/**
 * Group actions into queues
 */
export function groupActionsIntoQueues(actions: ActionCard[]): ActionQueues {
  return actions.reduce<ActionQueues>(
    (queues, action) => {
      const score = calculateActionPriority(action);
      const queue = categorizeActionByScore(score);
      queues[queue].push(action);
      return queues;
    },
    {
      urgentRepairs: [],
      opportunityBridges: [],
      lightTouches: [],
    }
  );
}

describe('Priority Scoring Utilities', () => {
  describe('categorizeActionByScore', () => {
    it('should categorize scores >= 75 as urgentRepairs', () => {
      const scores = [75, 80, 90, 100];
      scores.forEach((score) => {
        expect(categorizeActionByScore(score)).toBe('urgentRepairs');
      });
    });

    it('should categorize scores 45-74 as opportunityBridges', () => {
      const scores = [45, 50, 60, 70, 74];
      scores.forEach((score) => {
        expect(categorizeActionByScore(score)).toBe('opportunityBridges');
      });
    });

    it('should categorize scores < 45 as lightTouches', () => {
      const scores = [0, 20, 30, 44, 44.99];
      scores.forEach((score) => {
        expect(categorizeActionByScore(score)).toBe('lightTouches');
      });
    });

    describe('Boundary Values', () => {
      it('score 44 should be lightTouches', () => {
        expect(categorizeActionByScore(44)).toBe('lightTouches');
      });

      it('score 45 should be opportunityBridges', () => {
        expect(categorizeActionByScore(45)).toBe('opportunityBridges');
      });

      it('score 74 should be opportunityBridges', () => {
        expect(categorizeActionByScore(74)).toBe('opportunityBridges');
      });

      it('score 75 should be urgentRepairs', () => {
        expect(categorizeActionByScore(75)).toBe('urgentRepairs');
      });
    });
  });

  describe('calculateActionPriority', () => {
    it('should calculate priority for high-risk repair action', () => {
      const action: Partial<ActionCard> = {
        goal: 'repair',
        riskLevel: 'high',
        effortMinutes: 30,
        confidence: 0.5,
      };

      const score = calculateActionPriority(action);
      // 40 (high risk) + 3 (effort 30->3) + 10 (confidence 0.5*20) + 30 (repair) = 83
      expect(score).toBeGreaterThanOrEqual(75);
    });

    it('should calculate priority for low-risk maintain action', () => {
      const action: Partial<ActionCard> = {
        goal: 'maintain',
        riskLevel: 'low',
        effortMinutes: 5,
        confidence: 0.9,
      };

      const score = calculateActionPriority(action);
      // 0 (low risk) + 0 (effort 5->0) + 18 (confidence 0.9*20) + 0 (maintain) = 18
      expect(score).toBeLessThan(45);
    });

    it('should calculate priority for medium-risk grow action', () => {
      const action: Partial<ActionCard> = {
        goal: 'grow',
        riskLevel: 'medium',
        effortMinutes: 15,
        confidence: 0.75,
      };

      const score = calculateActionPriority(action);
      // 20 (medium risk) + 1 (effort 15->1) + 15 (confidence 0.75*20) + 15 (grow) = 51
      expect(score).toBeGreaterThanOrEqual(45);
      expect(score).toBeLessThan(75);
    });
  });

  describe('groupActionsIntoQueues', () => {
    it('should group actions into correct queues', () => {
      const actions: ActionCard[] = [
        {
          actionId: 'urgent-1',
          goal: 'repair',
          actionType: 'message',
          whyNow: 'Urgent',
          draftMessage: 'Urgent message',
          effortMinutes: 30,
          confidence: 0.5,
          riskLevel: 'high',
          requiresConfirmation: true,
        },
        {
          actionId: 'bridge-1',
          goal: 'grow',
          actionType: 'intro',
          whyNow: 'Opportunity',
          draftMessage: 'Intro message',
          effortMinutes: 20,
          confidence: 0.7,
          riskLevel: 'medium',
          requiresConfirmation: true,
        },
        {
          actionId: 'light-1',
          goal: 'maintain',
          actionType: 'message',
          whyNow: 'Keep warm',
          draftMessage: 'Hello',
          effortMinutes: 3,
          confidence: 0.9,
          riskLevel: 'low',
          requiresConfirmation: false,
        },
      ];

      const queues = groupActionsIntoQueues(actions);

      expect(queues.urgentRepairs).toHaveLength(1);
      expect(queues.opportunityBridges).toHaveLength(1);
      expect(queues.lightTouches).toHaveLength(1);
    });

    it('should handle empty actions array', () => {
      const queues = groupActionsIntoQueues([]);

      expect(queues.urgentRepairs).toEqual([]);
      expect(queues.opportunityBridges).toEqual([]);
      expect(queues.lightTouches).toEqual([]);
    });

    it('should handle all actions in one queue', () => {
      const actions: ActionCard[] = Array.from({ length: 5 }, (_, i) => ({
        actionId: `light-${i}`,
        goal: 'maintain',
        actionType: 'message',
        whyNow: 'Keep warm',
        draftMessage: 'Hello',
        effortMinutes: 3,
        confidence: 0.9,
        riskLevel: 'low',
        requiresConfirmation: false,
      }));

      const queues = groupActionsIntoQueues(actions);

      expect(queues.lightTouches).toHaveLength(5);
      expect(queues.urgentRepairs).toHaveLength(0);
      expect(queues.opportunityBridges).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle action with minimum priority', () => {
      const action: Partial<ActionCard> = {
        goal: 'maintain',
        riskLevel: 'low',
        effortMinutes: 0,
        confidence: 0,
      };

      const score = calculateActionPriority(action);
      expect(score).toBe(0);
    });

    it('should cap priority at 100', () => {
      const action: Partial<ActionCard> = {
        goal: 'repair',
        riskLevel: 'high',
        effortMinutes: 200,
        confidence: 1,
      };

      const score = calculateActionPriority(action);
      // 40 + 10 (capped) + 20 + 30 = 100 (capped)
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle action with undefined optional fields', () => {
      const action: Partial<ActionCard> = {
        goal: 'maintain',
      };

      const score = calculateActionPriority(action);
      // Should not throw, defaults should be used
      expect(typeof score).toBe('number');
    });
  });
});
