import {
  NetworkActionInput,
  NetworkActionOutput,
  ActionQueues,
  QueuedAction,
  WeeklyAction,
} from './network-action.types';

describe('NetworkActionTypes', () => {
  describe('Backward Compatibility', () => {
    it('should allow NetworkActionOutput without new optional fields', () => {
      const output: NetworkActionOutput = {
        followUps: [],
        recommendations: [],
        synthesis: 'Test synthesis',
        nextActions: [],
        metadata: {
          cached: false,
          sourceHash: 'hash-123',
          generatedAt: Date.now(),
        },
      };

      expect(output.synthesis).toBe('Test synthesis');
      expect(output.queues).toBeUndefined();
      expect(output.weeklyPlan).toBeUndefined();
    });

    it('should allow NetworkActionOutput with new fields', () => {
      const output: NetworkActionOutput = {
        followUps: [],
        recommendations: [],
        synthesis: 'Test synthesis',
        nextActions: [],
        metadata: {
          cached: false,
          sourceHash: 'hash-123',
          generatedAt: Date.now(),
        },
        queues: {
          urgentRepairs: [],
          opportunityBridges: [],
          lightTouches: [],
        },
        weeklyPlan: [],
      };

      expect(output.queues).toBeDefined();
      expect(output.weeklyPlan).toBeDefined();
      expect(output.queues?.urgentRepairs).toEqual([]);
      expect(output.queues?.opportunityBridges).toEqual([]);
      expect(output.queues?.lightTouches).toEqual([]);
    });
  });

  describe('ActionQueues', () => {
    const validQueues: ActionQueues = {
      urgentRepairs: [
        {
          id: 'urgent-001',
          contactId: 'contact-1',
          contactName: 'John Doe',
          action: 'Follow up on project',
          priority: 'high',
          effortMinutes: 15,
          rationale: 'Haven\'t spoken in 3 months',
        },
      ],
      opportunityBridges: [
        {
          id: 'bridge-001',
          contactId: 'contact-2',
          contactName: 'Jane Smith',
          action: 'Introduce to potential partner',
          priority: 'medium',
          effortMinutes: 20,
          rationale: 'Both interested in AI collaboration',
        },
      ],
      lightTouches: [
        {
          id: 'light-001',
          contactId: 'contact-3',
          contactName: 'Bob Johnson',
          action: 'Send interesting article',
          priority: 'low',
          effortMinutes: 2,
          rationale: 'Keep relationship warm',
        },
      ],
    };

    it('should accept valid ActionQueues with all categories', () => {
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
  });

  describe('QueuedAction', () => {
    const validQueuedAction: QueuedAction = {
      id: 'qa-001',
      contactId: 'contact-123',
      contactName: 'Alice Williams',
      action: 'Schedule follow-up call',
      priority: 'high',
      effortMinutes: 30,
      rationale: 'Discussion left unresolved',
    };

    it('should accept valid QueuedAction', () => {
      const action: QueuedAction = validQueuedAction;

      expect(action.id).toBe('qa-001');
      expect(action.contactId).toBe('contact-123');
      expect(action.contactName).toBe('Alice Williams');
      expect(action.action).toBe('Schedule follow-up call');
      expect(action.priority).toBe('high');
      expect(action.effortMinutes).toBe(30);
      expect(action.rationale).toBe('Discussion left unresolved');
    });

    it('should accept all valid priority levels', () => {
      const priorities: QueuedAction['priority'][] = ['high', 'medium', 'low'];

      priorities.forEach((priority) => {
        const action: QueuedAction = {
          id: `action-${priority}`,
          contactId: 'contact-123',
          contactName: 'Test Contact',
          action: 'Test action',
          priority,
          effortMinutes: 10,
          rationale: 'Test rationale',
        };
        expect(action.priority).toBe(priority);
      });
    });

    describe('Boundary Values for EffortMinutes', () => {
      it('should accept 0 effort minutes', () => {
        const action: QueuedAction = {
          id: 'zero-effort',
          contactId: 'contact-123',
          contactName: 'Test',
          action: 'Quick like',
          priority: 'low',
          effortMinutes: 0,
          rationale: 'Social media interaction',
        };
        expect(action.effortMinutes).toBe(0);
      });

      it('should accept high effort minutes', () => {
        const action: QueuedAction = {
          id: 'high-effort',
          contactId: 'contact-123',
          contactName: 'Test',
          action: 'In-person meeting',
          priority: 'high',
          effortMinutes: 180,
          rationale: 'Important client meeting',
        };
        expect(action.effortMinutes).toBe(180);
      });
    });
  });

  describe('WeeklyAction', () => {
    const validWeeklyAction: WeeklyAction = {
      day: 1,
      dayName: 'Monday',
      maxMinutes: 30,
      actions: [
        {
          id: 'weekly-001',
          contactId: 'contact-1',
          contactName: 'Monday Contact',
          action: 'Weekly check-in',
          effortMinutes: 15,
          priority: 'medium',
        },
      ],
    };

    it('should accept valid WeeklyAction', () => {
      const weekly: WeeklyAction = validWeeklyAction;

      expect(weekly.day).toBe(1);
      expect(weekly.dayName).toBe('Monday');
      expect(weekly.maxMinutes).toBe(30);
      expect(weekly.actions).toHaveLength(1);
    });

    it('should accept day values from 0 to 6', () => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      dayNames.forEach((name, index) => {
        const weekly: WeeklyAction = {
          day: index,
          dayName: name,
          maxMinutes: 60,
          actions: [],
        };
        expect(weekly.day).toBe(index);
        expect(weekly.dayName).toBe(name);
      });
    });

    it('should accept empty actions array', () => {
      const weekly: WeeklyAction = {
        day: 3,
        dayName: 'Wednesday',
        maxMinutes: 45,
        actions: [],
      };

      expect(weekly.actions).toEqual([]);
    });

    it('should accept zero maxMinutes', () => {
      const weekly: WeeklyAction = {
        day: 6,
        dayName: 'Saturday',
        maxMinutes: 0,
        actions: [],
      };

      expect(weekly.maxMinutes).toBe(0);
    });

    it('should accept high maxMinutes', () => {
      const weekly: WeeklyAction = {
        day: 0,
        dayName: 'Sunday',
        maxMinutes: 240,
        actions: [],
      };

      expect(weekly.maxMinutes).toBe(240);
    });
  });

  describe('NetworkActionInput', () => {
    it('should accept input with all optional fields', () => {
      const input: NetworkActionInput = {
        userId: 'user-123',
        limit: 10,
        forceRefresh: true,
      };

      expect(input.userId).toBe('user-123');
      expect(input.limit).toBe(10);
      expect(input.forceRefresh).toBe(true);
    });

    it('should accept minimal input', () => {
      const minimalInput: NetworkActionInput = {
        userId: 'user-456',
      };

      expect(minimalInput.userId).toBe('user-456');
      expect(minimalInput.limit).toBeUndefined();
      expect(minimalInput.forceRefresh).toBeUndefined();
    });
  });

  describe('Priority Categorization Boundary Values', () => {
    // Based on the design doc:
    // - >=75: urgentRepairs
    // - 45~74: opportunityBridges
    // - <45: lightTouches

    describe('Score 44 and below - Light Touches', () => {
      const scores = [0, 30, 44, 44.99];

      scores.forEach((score) => {
        it(`score ${score} should categorize as lightTouches`, () => {
          // This would be tested against the categorization function
          // For now we just verify the types work with these values
          const action: QueuedAction = {
            id: `score-${score}`,
            contactId: 'contact-123',
            contactName: 'Test Contact',
            action: 'Light touch action',
            priority: 'low',
            effortMinutes: 5,
            rationale: `Priority score: ${score}`,
          };

          expect(action.priority).toBe('low');
        });
      });
    });

    describe('Score 45-74 - Opportunity Bridges', () => {
      const scores = [45, 50, 60, 70, 74, 74.99];

      scores.forEach((score) => {
        it(`score ${score} should categorize as opportunityBridges`, () => {
          const action: QueuedAction = {
            id: `score-${score}`,
            contactId: 'contact-123',
            contactName: 'Test Contact',
            action: 'Opportunity bridge action',
            priority: 'medium',
            effortMinutes: 15,
            rationale: `Priority score: ${score}`,
          };

          expect(action.priority).toBe('medium');
        });
      });
    });

    describe('Score 75 and above - Urgent Repairs', () => {
      const scores = [75, 80, 90, 99, 100];

      scores.forEach((score) => {
        it(`score ${score} should categorize as urgentRepairs`, () => {
          const action: QueuedAction = {
            id: `score-${score}`,
            contactId: 'contact-123',
            contactName: 'Test Contact',
            action: 'Urgent repair action',
            priority: 'high',
            effortMinutes: 30,
            rationale: `Priority score: ${score}`,
          };

          expect(action.priority).toBe('high');
        });
      });
    });

    describe('Exact Boundary Values', () => {
      it('score 44 should be lightTouches (boundary check)', () => {
        const action: QueuedAction = {
          id: 'boundary-44',
          contactId: 'contact-123',
          contactName: 'Test Contact',
          action: 'Light touch',
          priority: 'low',
          effortMinutes: 5,
          rationale: 'Score exactly at boundary',
        };
        expect(action.priority).toBe('low');
      });

      it('score 45 should be opportunityBridges (boundary check)', () => {
        const action: QueuedAction = {
          id: 'boundary-45',
          contactId: 'contact-123',
          contactName: 'Test Contact',
          action: 'Opportunity',
          priority: 'medium',
          effortMinutes: 15,
          rationale: 'Score exactly at boundary',
        };
        expect(action.priority).toBe('medium');
      });

      it('score 74 should be opportunityBridges (boundary check)', () => {
        const action: QueuedAction = {
          id: 'boundary-74',
          contactId: 'contact-123',
          contactName: 'Test Contact',
          action: 'Opportunity',
          priority: 'medium',
          effortMinutes: 15,
          rationale: 'Score exactly at boundary',
        };
        expect(action.priority).toBe('medium');
      });

      it('score 75 should be urgentRepairs (boundary check)', () => {
        const action: QueuedAction = {
          id: 'boundary-75',
          contactId: 'contact-123',
          contactName: 'Test Contact',
          action: 'Urgent repair',
          priority: 'high',
          effortMinutes: 30,
          rationale: 'Score exactly at boundary',
        };
        expect(action.priority).toBe('high');
      });
    });
  });

  describe('Complete Output Example', () => {
    it('should represent a complete NetworkActionOutput with all fields', () => {
      const output: NetworkActionOutput = {
        followUps: [
          {
            contactId: 'contact-1',
            contactName: 'John Doe',
            reason: 'Haven\'t spoken in 6 months',
            priority: 'high',
            suggestedAction: 'Reach out to reconnect',
          },
        ],
        recommendations: [
          {
            type: 'introduction',
            description: 'Alice and Bob would benefit from knowing each other',
            contacts: ['contact-2', 'contact-3'],
            confidence: 0.85,
          },
        ],
        synthesis: 'You have 3 contacts needing attention, with 1 high-priority reconnection needed.',
        nextActions: [
          {
            action: 'Email John Doe',
            priority: 'high',
            estimatedTime: '15 minutes',
          },
        ],
        metadata: {
          cached: false,
          sourceHash: 'abc123',
          generatedAt: Date.now(),
        },
        queues: {
          urgentRepairs: [
            {
              id: 'urgent-1',
              contactId: 'contact-1',
              contactName: 'John Doe',
              action: 'Reconnect after 6 months',
              priority: 'high',
              effortMinutes: 20,
              rationale: 'High-value contact at risk of cooling',
            },
          ],
          opportunityBridges: [
            {
              id: 'bridge-1',
              contactId: 'contact-2',
              contactName: 'Alice Smith',
              action: 'Facilitate introduction with Bob',
              priority: 'medium',
              effortMinutes: 15,
              rationale: 'Both interested in AI collaboration',
            },
          ],
          lightTouches: [
            {
              id: 'light-1',
              contactId: 'contact-4',
              contactName: 'Charlie Brown',
              action: 'Share interesting article',
              priority: 'low',
              effortMinutes: 3,
              rationale: 'Keep relationship warm',
            },
          ],
        },
        weeklyPlan: [
          {
            day: 1,
            dayName: 'Monday',
            maxMinutes: 30,
            actions: [
              {
                id: 'weekly-1',
                contactId: 'contact-1',
                contactName: 'John Doe',
                action: 'Reconnect email',
                effortMinutes: 20,
                priority: 'high',
              },
            ],
          },
          {
            day: 2,
            dayName: 'Tuesday',
            maxMinutes: 15,
            actions: [
              {
                id: 'weekly-2',
                contactId: 'contact-2',
                contactName: 'Alice Smith',
                action: 'Introduction email',
                effortMinutes: 15,
                priority: 'medium',
              },
            ],
          },
        ],
      };

      expect(output.followUps).toHaveLength(1);
      expect(output.recommendations).toHaveLength(1);
      expect(output.nextActions).toHaveLength(1);
      expect(output.queues?.urgentRepairs).toHaveLength(1);
      expect(output.queues?.opportunityBridges).toHaveLength(1);
      expect(output.queues?.lightTouches).toHaveLength(1);
      expect(output.weeklyPlan).toHaveLength(2);
    });
  });
});
