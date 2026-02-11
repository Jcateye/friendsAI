import { describe, it, expect } from 'vitest';
import type { ActionCard, ActionQueues, WeeklyPlanDay, ContactInsightData, NetworkActionData } from './agent-types';

describe('Agent Types - Action Card Enhancement', () => {
  describe('ActionCard', () => {
    const validActionCard: ActionCard = {
      actionId: 'action-123',
      goal: 'maintain',
      actionType: 'message',
      whyNow: 'Last interaction was 30 days ago',
      evidence: [
        {
          type: 'event',
          source: 'conversation',
          reference: 'conv-123',
        },
      ],
      draftMessage: 'Hey! Saw this and thought of you...',
      effortMinutes: 5,
      confidence: 0.85,
      riskLevel: 'low',
      requiresConfirmation: true,
      contactId: 'contact-123',
      contactName: 'John Doe',
    };

    it('should accept valid action card', () => {
      const actionCard: ActionCard = validActionCard;

      expect(actionCard.actionId).toBe('action-123');
      expect(actionCard.goal).toBe('maintain');
      expect(actionCard.actionType).toBe('message');
      expect(actionCard.effortMinutes).toBe(5);
      expect(actionCard.confidence).toBe(0.85);
      expect(actionCard.riskLevel).toBe('low');
    });

    it('should accept all goal types', () => {
      const goals: ActionCard['goal'][] = ['maintain', 'grow', 'repair'];

      goals.forEach((goal) => {
        const actionCard: ActionCard = {
          ...validActionCard,
          goal,
        };
        expect(actionCard.goal).toBe(goal);
      });
    });

    it('should accept all action types', () => {
      const actionTypes: ActionCard['actionType'][] = ['message', 'invite', 'intro', 'note'];

      actionTypes.forEach((actionType) => {
        const actionCard: ActionCard = {
          ...validActionCard,
          actionType,
        };
        expect(actionCard.actionType).toBe(actionType);
      });
    });

    it('should accept all risk levels', () => {
      const riskLevels: ActionCard['riskLevel'][] = ['low', 'medium', 'high'];

      riskLevels.forEach((riskLevel) => {
        const actionCard: ActionCard = {
          ...validActionCard,
          riskLevel,
        };
        expect(actionCard.riskLevel).toBe(riskLevel);
      });
    });

    describe('Boundary values for confidence', () => {
      it('should accept confidence of 0', () => {
        const actionCard: ActionCard = {
          ...validActionCard,
          confidence: 0,
        };
        expect(actionCard.confidence).toBe(0);
      });

      it('should accept confidence of 1', () => {
        const actionCard: ActionCard = {
          ...validActionCard,
          confidence: 1,
        };
        expect(actionCard.confidence).toBe(1);
      });

      it('should accept decimal confidence values', () => {
        const values = [0.01, 0.25, 0.5, 0.75, 0.99];
        values.forEach((confidence) => {
          const actionCard: ActionCard = {
            ...validActionCard,
            confidence,
          };
          expect(actionCard.confidence).toBe(confidence);
        });
      });
    });

    describe('Boundary values for effortMinutes', () => {
      it('should accept 0 effort minutes', () => {
        const actionCard: ActionCard = {
          ...validActionCard,
          effortMinutes: 0,
        };
        expect(actionCard.effortMinutes).toBe(0);
      });

      it('should accept high effort minutes', () => {
        const actionCard: ActionCard = {
          ...validActionCard,
          effortMinutes: 120,
        };
        expect(actionCard.effortMinutes).toBe(120);
      });
    });
  });

  describe('ActionQueues', () => {
    const validQueues: ActionQueues = {
      urgentRepairs: [
        {
          actionId: 'urgent-1',
          goal: 'repair',
          actionType: 'message',
          whyNow: 'At risk of cooling',
          draftMessage: 'Long time no see...',
          effortMinutes: 20,
          confidence: 0.6,
          riskLevel: 'high',
          requiresConfirmation: true,
        },
      ],
      opportunityBridges: [
        {
          actionId: 'bridge-1',
          goal: 'grow',
          actionType: 'intro',
          whyNow: 'Both interested in AI',
          draftMessage: 'Let me introduce you...',
          effortMinutes: 30,
          confidence: 0.75,
          riskLevel: 'medium',
          requiresConfirmation: true,
        },
      ],
      lightTouches: [
        {
          actionId: 'light-1',
          goal: 'maintain',
          actionType: 'message',
          whyNow: 'Keep warm',
          draftMessage: 'Hey!',
          effortMinutes: 2,
          confidence: 0.9,
          riskLevel: 'low',
          requiresConfirmation: false,
        },
      ],
    };

    it('should accept valid action queues', () => {
      const queues: ActionQueues = validQueues;

      expect(queues.urgentRepairs).toHaveLength(1);
      expect(queues.opportunityBridges).toHaveLength(1);
      expect(queues.lightTouches).toHaveLength(1);
    });

    it('should accept empty queues', () => {
      const emptyQueues: ActionQueues = {
        urgentRepairs: [],
        opportunityBridges: [],
        lightTouches: [],
      };

      expect(emptyQueues.urgentRepairs).toEqual([]);
      expect(emptyQueues.opportunityBridges).toEqual([]);
      expect(emptyQueues.lightTouches).toEqual([]);
    });

    it('should categorize actions by priority', () => {
      const queues: ActionQueues = {
        urgentRepairs: [
          {
            actionId: 'repair-1',
            goal: 'repair',
            actionType: 'message',
            whyNow: 'High priority',
            draftMessage: 'Urgent message',
            effortMinutes: 30,
            confidence: 0.5,
            riskLevel: 'high',
            requiresConfirmation: true,
          },
        ],
        opportunityBridges: [
          {
            actionId: 'bridge-1',
            goal: 'grow',
            actionType: 'intro',
            whyNow: 'Medium priority',
            draftMessage: 'Intro message',
            effortMinutes: 15,
            confidence: 0.7,
            riskLevel: 'medium',
            requiresConfirmation: true,
          },
        ],
        lightTouches: [
          {
            actionId: 'light-1',
            goal: 'maintain',
            actionType: 'message',
            whyNow: 'Low priority',
            draftMessage: 'Quick hello',
            effortMinutes: 3,
            confidence: 0.8,
            riskLevel: 'low',
            requiresConfirmation: false,
          },
        ],
      };

      // Verify categorization by risk level
      expect(queues.urgentRepairs[0].riskLevel).toBe('high');
      expect(queues.opportunityBridges[0].riskLevel).toBe('medium');
      expect(queues.lightTouches[0].riskLevel).toBe('low');
    });
  });

  describe('WeeklyPlanDay', () => {
    it('should accept valid weekly plan day', () => {
      const weeklyDay: WeeklyPlanDay = {
        day: 'Mon',
        maxMinutes: 30,
        actions: [
          {
            actionId: 'action-1',
            goal: 'maintain',
            actionType: 'message',
            whyNow: 'Monday follow-up',
            draftMessage: 'Happy Monday!',
            effortMinutes: 15,
            confidence: 0.8,
            riskLevel: 'low',
            requiresConfirmation: true,
          },
        ],
      };

      expect(weeklyDay.day).toBe('Mon');
      expect(weeklyDay.maxMinutes).toBe(30);
      expect(weeklyDay.actions).toHaveLength(1);
    });

    it('should accept all day names', () => {
      const days: WeeklyPlanDay['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      days.forEach((day) => {
        const weeklyDay: WeeklyPlanDay = {
          day,
          maxMinutes: 60,
          actions: [],
        };
        expect(weeklyDay.day).toBe(day);
      });
    });

    it('should accept empty actions array', () => {
      const weeklyDay: WeeklyPlanDay = {
        day: 'Sun',
        maxMinutes: 0,
        actions: [],
      };

      expect(weeklyDay.actions).toEqual([]);
      expect(weeklyDay.maxMinutes).toBe(0);
    });

    it('should accept maxMinutes of 0 for rest day', () => {
      const weeklyDay: WeeklyPlanDay = {
        day: 'Sun',
        maxMinutes: 0,
        actions: [],
      };

      expect(weeklyDay.maxMinutes).toBe(0);
    });

    it('should accept high maxMinutes', () => {
      const weeklyDay: WeeklyPlanDay = {
        day: 'Sat',
        maxMinutes: 240,
        actions: [],
      };

      expect(weeklyDay.maxMinutes).toBe(240);
    });
  });

  describe('Backward Compatibility', () => {
    it('should allow optional action cards in ContactInsightData', () => {
      const data: ContactInsightData = {
        profileSummary: 'Test summary',
        relationshipSignals: [],
        opportunities: [],
        risks: [],
        suggestedActions: [],
        openingLines: [],
        citations: [],
        sourceHash: 'abc123',
        generatedAt: Date.now(),
        // actionCards is optional
      };

      expect(data).toBeDefined();
      expect(data.actionCards).toBeUndefined();
    });

    it('should allow optional queues in NetworkActionData', () => {
      const data: NetworkActionData = {
        followUps: [],
        recommendations: [],
        synthesis: 'Test synthesis',
        nextActions: [],
        metadata: {
          cached: false,
          sourceHash: 'xyz789',
          generatedAt: Date.now(),
        },
        // queues is optional
      };

      expect(data).toBeDefined();
      expect(data.queues).toBeUndefined();
    });
  });

  describe('Action Card Examples', () => {
    it('should represent a low-effort warm message', () => {
      const warmMessage: ActionCard = {
        actionId: 'warm-001',
        goal: 'maintain',
        actionType: 'message',
        whyNow: 'Keep relationship warm',
        draftMessage: 'Hey! Saw this and thought of you...',
        effortMinutes: 3,
        confidence: 0.9,
        riskLevel: 'low',
        requiresConfirmation: false,
      };

      expect(warmMessage.riskLevel).toBe('low');
      expect(warmMessage.effortMinutes).toBeLessThan(5);
      expect(warmMessage.confidence).toBeGreaterThan(0.8);
      expect(warmMessage.requiresConfirmation).toBe(false);
    });

    it('should represent a high-risk repair action', () => {
      const repairAction: ActionCard = {
        actionId: 'repair-001',
        goal: 'repair',
        actionType: 'message',
        whyNow: 'Relationship has cooled significantly',
        draftMessage: 'Hi [Name], it has been a while...',
        effortMinutes: 30,
        confidence: 0.5,
        riskLevel: 'high',
        requiresConfirmation: true,
      };

      expect(repairAction.goal).toBe('repair');
      expect(repairAction.riskLevel).toBe('high');
      expect(repairAction.effortMinutes).toBeGreaterThanOrEqual(20);
      expect(repairAction.requiresConfirmation).toBe(true);
    });

    it('should represent an opportunity bridge', () => {
      const bridgeAction: ActionCard = {
        actionId: 'bridge-001',
        goal: 'grow',
        actionType: 'intro',
        whyNow: 'Both contacts interested in collaboration',
        draftMessage: 'Let me introduce you to...',
        effortMinutes: 20,
        confidence: 0.75,
        riskLevel: 'medium',
        requiresConfirmation: true,
        contactId: 'contact-1',
        contactName: 'Jane Smith',
      };

      expect(bridgeAction.goal).toBe('grow');
      expect(bridgeAction.actionType).toBe('intro');
      expect(bridgeAction.riskLevel).toBe('medium');
      expect(bridgeAction.contactName).toBe('Jane Smith');
    });
  });
});
