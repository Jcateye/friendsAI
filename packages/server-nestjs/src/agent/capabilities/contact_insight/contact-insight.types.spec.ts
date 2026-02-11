import {
  ContactInsightInput,
  ContactInsightOutput,
  ActionCard,
  MomentSignal,
  InsightDepth,
} from './contact-insight.types';

describe('ContactInsightTypes', () => {
  describe('Backward Compatibility', () => {
    it('should allow ContactInsightOutput without new optional fields', () => {
      const output: ContactInsightOutput = {
        profileSummary: 'Test summary',
        relationshipSignals: [],
        opportunities: [],
        risks: [],
        suggestedActions: [],
        openingLines: [],
        citations: [],
      };

      expect(output.profileSummary).toBe('Test summary');
      expect(output.actionCards).toBeUndefined();
      expect(output.relationshipState).toBeUndefined();
    });

    it('should allow ContactInsightOutput with new fields', () => {
      const output: ContactInsightOutput = {
        profileSummary: 'Test summary',
        relationshipSignals: [],
        opportunities: [],
        risks: [],
        suggestedActions: [],
        openingLines: [],
        citations: [],
        actionCards: [],
        relationshipState: 'stable',
        relationshipType: 'business',
        momentSignals: [],
      };

      expect(output.actionCards).toEqual([]);
      expect(output.relationshipState).toBe('stable');
      expect(output.relationshipType).toBe('business');
      expect(output.momentSignals).toEqual([]);
    });
  });

  describe('ActionCard', () => {
    const validActionCard: ActionCard = {
      actionId: 'action-123',
      goal: 'maintain',
      actionType: 'message',
      draftMessage: 'Hey, how are you?',
      effortMinutes: 5,
      confidence: 0.8,
      riskLevel: 'low',
      requiresConfirmation: true,
      timingHint: 'Morning is best',
      notes: 'Follow up on conference',
    };

    it('should accept valid ActionCard with all fields', () => {
      const actionCard: ActionCard = validActionCard;
      expect(actionCard.actionId).toBe('action-123');
      expect(actionCard.goal).toBe('maintain');
      expect(actionCard.actionType).toBe('message');
      expect(actionCard.effortMinutes).toBe(5);
      expect(actionCard.confidence).toBe(0.8);
      expect(actionCard.riskLevel).toBe('low');
      expect(actionCard.requiresConfirmation).toBe(true);
    });

    it('should accept ActionCard with optional fields omitted', () => {
      const minimalActionCard: ActionCard = {
        actionId: 'action-456',
        goal: 'grow',
        actionType: 'call',
        effortMinutes: 15,
        confidence: 0.6,
        riskLevel: 'medium',
        requiresConfirmation: false,
      };

      expect(minimalActionCard.draftMessage).toBeUndefined();
      expect(minimalActionCard.timingHint).toBeUndefined();
      expect(minimalActionCard.notes).toBeUndefined();
    });

    it('should accept all valid action types', () => {
      const actionTypes: ActionCard['actionType'][] = [
        'message',
        'call',
        'meeting',
        'email',
        'social',
        'gift',
        'introduction',
        'other',
      ];

      actionTypes.forEach((actionType) => {
        const actionCard: ActionCard = {
          actionId: `action-${actionType}`,
          goal: 'maintain',
          actionType,
          effortMinutes: 10,
          confidence: 0.7,
          riskLevel: 'low',
          requiresConfirmation: true,
        };
        expect(actionCard.actionType).toBe(actionType);
      });
    });

    it('should accept all valid risk levels', () => {
      const riskLevels: ActionCard['riskLevel'][] = ['low', 'medium', 'high'];

      riskLevels.forEach((riskLevel) => {
        const actionCard: ActionCard = {
          actionId: `action-${riskLevel}`,
          goal: 'repair',
          actionType: 'message',
          effortMinutes: 10,
          confidence: 0.7,
          riskLevel,
          requiresConfirmation: true,
        };
        expect(actionCard.riskLevel).toBe(riskLevel);
      });
    });

    describe('Boundary Values for Confidence', () => {
      it('should accept confidence of 0', () => {
        const actionCard: ActionCard = {
          actionId: 'action-zero',
          goal: 'maintain',
          actionType: 'message',
          effortMinutes: 10,
          confidence: 0,
          riskLevel: 'low',
          requiresConfirmation: true,
        };
        expect(actionCard.confidence).toBe(0);
      });

      it('should accept confidence of 1', () => {
        const actionCard: ActionCard = {
          actionId: 'action-one',
          goal: 'maintain',
          actionType: 'message',
          effortMinutes: 10,
          confidence: 1,
          riskLevel: 'low',
          requiresConfirmation: true,
        };
        expect(actionCard.confidence).toBe(1);
      });

      it('should accept decimal confidence values', () => {
        const values = [0.1, 0.25, 0.5, 0.75, 0.99];
        values.forEach((confidence) => {
          const actionCard: ActionCard = {
            actionId: `action-${confidence}`,
            goal: 'maintain',
            actionType: 'message',
            effortMinutes: 10,
            confidence,
            riskLevel: 'low',
            requiresConfirmation: true,
          };
          expect(actionCard.confidence).toBe(confidence);
        });
      });
    });

    describe('Boundary Values for EffortMinutes', () => {
      it('should accept 0 effort minutes', () => {
        const actionCard: ActionCard = {
          actionId: 'action-zero-effort',
          goal: 'maintain',
          actionType: 'message',
          effortMinutes: 0,
          confidence: 0.8,
          riskLevel: 'low',
          requiresConfirmation: true,
        };
        expect(actionCard.effortMinutes).toBe(0);
      });

      it('should accept high effort minutes', () => {
        const actionCard: ActionCard = {
          actionId: 'action-high-effort',
          goal: 'maintain',
          actionType: 'meeting',
          effortMinutes: 120,
          confidence: 0.8,
          riskLevel: 'medium',
          requiresConfirmation: true,
        };
        expect(actionCard.effortMinutes).toBe(120);
      });
    });
  });

  describe('MomentSignal', () => {
    const validMomentSignal: MomentSignal = {
      type: 'birthday',
      score: 0.9,
      whyNow: 'Birthday is today',
      expiresAtMs: Date.now() + 86400000,
      suggestedAction: 'Send birthday wishes',
    };

    it('should accept valid MomentSignal with all fields', () => {
      const momentSignal: MomentSignal = validMomentSignal;
      expect(momentSignal.type).toBe('birthday');
      expect(momentSignal.score).toBe(0.9);
      expect(momentSignal.whyNow).toBe('Birthday is today');
      expect(momentSignal.expiresAtMs).toBeGreaterThan(Date.now());
    });

    it('should accept MomentSignal without optional suggestedAction', () => {
      const minimalMomentSignal: MomentSignal = {
        type: 'milestone',
        score: 0.7,
        whyNow: 'Work anniversary',
        expiresAtMs: Date.now() + 86400000,
      };

      expect(minimalMomentSignal.suggestedAction).toBeUndefined();
    });

    it('should accept all valid moment signal types', () => {
      const types: MomentSignal['type'][] = [
        'birthday',
        'anniversary',
        'milestone',
        'life_event',
        'seasonal',
        'opportunity',
        'risk',
      ];

      types.forEach((type) => {
        const momentSignal: MomentSignal = {
          type,
          score: 0.5,
          whyNow: `Testing ${type}`,
          expiresAtMs: Date.now() + 86400000,
        };
        expect(momentSignal.type).toBe(type);
      });
    });

    describe('Boundary Values for Score', () => {
      it('should accept score of 0', () => {
        const momentSignal: MomentSignal = {
          type: 'opportunity',
          score: 0,
          whyNow: 'Low priority',
          expiresAtMs: Date.now() + 86400000,
        };
        expect(momentSignal.score).toBe(0);
      });

      it('should accept score of 1', () => {
        const momentSignal: MomentSignal = {
          type: 'risk',
          score: 1,
          whyNow: 'Highest priority',
          expiresAtMs: Date.now() + 86400000,
        };
        expect(momentSignal.score).toBe(1);
      });

      it('should accept decimal score values', () => {
        const scores = [0.01, 0.25, 0.5, 0.74, 0.75, 0.99];
        scores.forEach((score) => {
          const momentSignal: MomentSignal = {
            type: 'opportunity',
            score,
            whyNow: `Score ${score}`,
            expiresAtMs: Date.now() + 86400000,
          };
          expect(momentSignal.score).toBe(score);
        });
      });
    });

    describe('Boundary Values for ExpiresAtMs', () => {
      it('should accept future timestamp', () => {
        const futureTime = Date.now() + 1000;
        const momentSignal: MomentSignal = {
          type: 'opportunity',
          score: 0.8,
          whyNow: 'Future opportunity',
          expiresAtMs: futureTime,
        };
        expect(momentSignal.expiresAtMs).toBe(futureTime);
      });

      it('should accept current timestamp', () => {
        const currentTime = Date.now();
        const momentSignal: MomentSignal = {
          type: 'opportunity',
          score: 0.8,
          whyNow: 'Immediate opportunity',
          expiresAtMs: currentTime,
        };
        expect(momentSignal.expiresAtMs).toBe(currentTime);
      });
    });
  });

  describe('RelationshipState', () => {
    it('should accept all valid relationship states', () => {
      const states: ContactInsightOutput['relationshipState'][] = [
        'warming',
        'stable',
        'cooling',
        'at_risk',
      ];

      states.forEach((state) => {
        const output: ContactInsightOutput = {
          profileSummary: 'Test',
          relationshipSignals: [],
          opportunities: [],
          risks: [],
          suggestedActions: [],
          openingLines: [],
          citations: [],
          relationshipState: state,
        };
        expect(output.relationshipState).toBe(state);
      });
    });
  });

  describe('RelationshipType', () => {
    it('should accept all valid relationship types', () => {
      const types: ContactInsightOutput['relationshipType'][] = [
        'business',
        'friend',
        'mixed',
      ];

      types.forEach((type) => {
        const output: ContactInsightOutput = {
          profileSummary: 'Test',
          relationshipSignals: [],
          opportunities: [],
          risks: [],
          suggestedActions: [],
          openingLines: [],
          citations: [],
          relationshipType: type,
        };
        expect(output.relationshipType).toBe(type);
      });
    });
  });

  describe('ContactInsightInput', () => {
    it('should accept input with all optional fields', () => {
      const input: ContactInsightInput = {
        userId: 'user-123',
        contactId: 'contact-123',
        depth: 'deep',
        forceRefresh: true,
      };

      expect(input.userId).toBe('user-123');
      expect(input.contactId).toBe('contact-123');
      expect(input.depth).toBe('deep');
      expect(input.forceRefresh).toBe(true);
    });

    it('should accept minimal input', () => {
      const minimalInput: ContactInsightInput = {
        userId: 'user-456',
        contactId: 'contact-456',
      };

      expect(minimalInput.userId).toBe('user-456');
      expect(minimalInput.contactId).toBe('contact-456');
      expect(minimalInput.depth).toBeUndefined();
    });

    it('should accept all depth levels', () => {
      const depths: InsightDepth[] = ['brief', 'standard', 'deep'];

      depths.forEach((depth) => {
        const input: ContactInsightInput = {
          userId: 'user-123',
          contactId: 'contact-123',
          depth,
        };
        expect(input.depth).toBe(depth);
      });
    });
  });

  describe('ActionCard Examples', () => {
    it('should represent a low-risk warm message', () => {
      const warmMessage: ActionCard = {
        actionId: 'warm-001',
        goal: 'maintain',
        actionType: 'message',
        draftMessage: 'Hey! Saw this and thought of you...',
        effortMinutes: 3,
        confidence: 0.85,
        riskLevel: 'low',
        requiresConfirmation: true,
        timingHint: 'Anytime',
        notes: 'Light touch to keep relationship warm',
      };

      expect(warmMessage.riskLevel).toBe('low');
      expect(warmMessage.effortMinutes).toBeLessThan(5);
      expect(warmMessage.confidence).toBeGreaterThan(0.8);
    });

    it('should represent a high-risk repair action', () => {
      const repairAction: ActionCard = {
        actionId: 'repair-001',
        goal: 'repair',
        actionType: 'email',
        draftMessage: 'Hi [Name], I realize it has been a while...',
        effortMinutes: 30,
        confidence: 0.45,
        riskLevel: 'high',
        requiresConfirmation: true,
        timingHint: 'Weekday morning',
        notes: 'Relationship has cooled significantly',
      };

      expect(repairAction.goal).toBe('repair');
      expect(repairAction.riskLevel).toBe('high');
      expect(repairAction.confidence).toBeLessThan(0.5);
      expect(repairAction.requiresConfirmation).toBe(true);
    });
  });
});
