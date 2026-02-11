import {
  generateActionCard,
  ActionCardGeneratorInput,
  EvidencePoint,
  MomentWindow,
} from './action-card-generator.service';

describe('ActionCardGenerator', () => {
  const createBaseInput = (
    overrides: Partial<ActionCardGeneratorInput> = {}
  ): ActionCardGeneratorInput => ({
    contactId: 'contact-123',
    contactName: '张三',
    lastInteractionAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    interactionCount: 10,
    reciprocityScore: 0.5,
    importanceScore: 0.6,
    momentWindows: [],
    recentInteractions: [
      {
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        summary: '聊了工作近况',
      },
    ],
    messagesSent: 5,
    messagesReceived: 5,
    responseRate: 0.8,
    tier: 'regular',
    ...overrides,
  });

  describe('generateActionCard', () => {
    describe('Normal Scenarios', () => {
      it('should generate action card for regular contact', () => {
        const input = createBaseInput();

        const result = generateActionCard(input);

        expect(result.contactId).toBe('contact-123');
        expect(result.contactName).toBe('张三');
        expect(result.whyNow).toBeDefined();
        expect(result.evidence).toBeInstanceOf(Array);
        expect(result.riskLevel).toMatch(/^(low|medium|high)$/);
        expect(result.effortMinutes).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.priority).toBeDefined();
      });

      it('should generate high priority action for VIP with long gap', () => {
        // Need extreme values to reach score >= 75 for urgentRepairs
        // Using 365 days (max recency), extreme imbalance, VIP tier
        const input = createBaseInput({
          contactName: '李总',
          lastInteractionAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 365 days ago
          interactionCount: 20,
          importanceScore: 0.9,
          messagesSent: 30,
          messagesReceived: 0,
          tier: 'vip',
        });

        const result = generateActionCard(input);

        expect(result.priority.priority).toBe('high');
        expect(result.priority.queue).toBe('urgentRepairs');
        expect(result.riskLevel).toBe('high');
        expect(result.actionType).toBe('deep_conversation');
      });

      it('should generate special occasion action with birthday moment', () => {
        const birthdayWindow: MomentWindow = {
          type: 'birthday',
          description: '生日',
          weight: 0.9,
          expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        };

        const input = createBaseInput({
          momentWindows: [birthdayWindow],
        });

        const result = generateActionCard(input);

        expect(result.actionType).toBe('special_occasion');
        expect(result.whyNow).toContain('生日');
        expect(result.evidence.some((e) => e.type === 'moment')).toBe(true);
      });

      it('should generate catch_up action for opportunity bridge', () => {
        // Need values that produce score 45-74
        // Use imbalanced communication and longer gap
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000), // 150 days
          interactionCount: 15,
          importanceScore: 0.7,
          messagesSent: 15,
          messagesReceived: 2,
          tier: 'important',
        });

        const result = generateActionCard(input);

        expect(result.priority.queue).toBe('opportunityBridges');
        expect(result.actionType).toBe('catch_up');
      });

      it('should generate greeting action for light touch', () => {
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          interactionCount: 30,
          importanceScore: 0.4,
          messagesSent: 5,
          messagesReceived: 5,
          tier: 'regular',
        });

        const result = generateActionCard(input);

        expect(result.priority.queue).toBe('lightTouches');
        expect(result.actionType).toBe('greeting');
      });
    });

    describe('Edge Cases', () => {
      it('should handle sparse interaction data', () => {
        const input = createBaseInput({
          interactionCount: 0,
          messagesSent: 0,
          messagesReceived: 0,
          responseRate: 0,
        });

        const result = generateActionCard(input);

        expect(result.confidence).toBeLessThan(0.6);
        expect(result.requiresConfirmation).toBe(true);
      });

      it('should handle zero interactions gracefully', () => {
        const input = createBaseInput({
          interactionCount: 0,
          lastInteractionAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          messagesSent: 0,
          messagesReceived: 0,
        });

        const result = generateActionCard(input);

        expect(result).toBeDefined();
        expect(result.evidence).toBeInstanceOf(Array);
      });

      it('should handle very recent interaction', () => {
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          interactionCount: 50,
        });

        const result = generateActionCard(input);

        expect(result.priority.score).toBeLessThan(45);
        expect(result.riskLevel).toBe('low');
      });

      it('should handle one-sided communication (user initiated all)', () => {
        const input = createBaseInput({
          messagesSent: 20,
          messagesReceived: 0,
          reciprocityScore: 0.1,
        });

        const result = generateActionCard(input);

        expect(result.evidence.some((e) => e.description.includes('单向'))).toBe(
          true
        );
      });

      it('should handle one-sided communication (contact initiated all)', () => {
        const input = createBaseInput({
          messagesSent: 0,
          messagesReceived: 10,
          reciprocityScore: 0.1,
        });

        const result = generateActionCard(input);

        expect(result.evidence.some((e) => e.description.includes('主动'))).toBe(
          true
        );
      });
    });

    describe('Evidence Generation', () => {
      it('should generate recency evidence for long gaps', () => {
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        });

        const result = generateActionCard(input);

        expect(result.evidence.some((e) => e.type === 'recency')).toBe(true);
      });

      it('should generate reciprocity evidence for imbalanced communication', () => {
        const input = createBaseInput({
          messagesSent: 15,
          messagesReceived: 2,
        });

        const result = generateActionCard(input);

        expect(result.evidence.some((e) => e.type === 'reciprocity')).toBe(true);
      });

      it('should generate importance evidence for VIP contacts', () => {
        const input = createBaseInput({
          importanceScore: 0.9,
        });

        const result = generateActionCard(input);

        expect(result.evidence.some((e) => e.type === 'importance')).toBe(true);
      });

      it('should generate pattern evidence for contacts with many interactions', () => {
        const input = createBaseInput({
          interactionCount: 50,
        });

        const result = generateActionCard(input);

        expect(result.evidence.some((e) => e.type === 'pattern')).toBe(true);
      });

      it('should generate moment evidence for active windows', () => {
        const windows: MomentWindow[] = [
          {
            type: 'holiday',
            description: '春节',
            weight: 0.8,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        ];

        const input = createBaseInput({ momentWindows: windows });

        const result = generateActionCard(input);

        expect(result.evidence.some((e) => e.type === 'moment')).toBe(true);
      });
    });

    describe('Risk Level Calculation', () => {
      it('should assign high risk for long gap + high importance + poor reciprocity', () => {
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
          importanceScore: 0.8,
          reciprocityScore: 0.2,
          messagesSent: 15,
          messagesReceived: 1,
        });

        const result = generateActionCard(input);

        expect(result.riskLevel).toBe('high');
      });

      it('should assign medium risk for moderate gap', () => {
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          importanceScore: 0.6,
        });

        const result = generateActionCard(input);

        expect(result.riskLevel).toBe('medium');
      });

      it('should assign low risk for recent contact', () => {
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          importanceScore: 0.5,
        });

        const result = generateActionCard(input);

        expect(result.riskLevel).toBe('low');
      });
    });

    describe('Confidence Calculation', () => {
      it('should have higher confidence with more interactions', () => {
        const inputMany = createBaseInput({
          interactionCount: 100,
          messagesSent: 50,
          messagesReceived: 50,
        });

        const inputFew = createBaseInput({
          interactionCount: 2,
          messagesSent: 1,
          messagesReceived: 1,
        });

        const resultMany = generateActionCard(inputMany);
        const resultFew = generateActionCard(inputFew);

        expect(resultMany.confidence).toBeGreaterThan(resultFew.confidence);
      });

      it('should have higher confidence with reciprocity data', () => {
        const inputWithData = createBaseInput({
          messagesSent: 10,
          messagesReceived: 8,
        });

        const inputWithoutData = createBaseInput({
          messagesSent: 0,
          messagesReceived: 0,
        });

        const resultWithData = generateActionCard(inputWithData);
        const resultWithoutData = generateActionCard(inputWithoutData);

        expect(resultWithData.confidence).toBeGreaterThan(
          resultWithoutData.confidence
        );
      });
    });

    describe('Effort Estimation', () => {
      it('should estimate higher effort for deep conversation', () => {
        // Need extreme values to reach urgentRepairs queue
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          importanceScore: 0.9,
          messagesSent: 30,
          messagesReceived: 0,
          tier: 'vip',
        });

        const result = generateActionCard(input);

        expect(result.actionType).toBe('deep_conversation');
        expect(result.effortMinutes).toBeGreaterThan(25);
      });

      it('should estimate lower effort for greeting', () => {
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          importanceScore: 0.4,
        });

        const result = generateActionCard(input);

        expect(result.actionType).toBe('greeting');
        expect(result.effortMinutes).toBeLessThan(20);
      });

      it('should estimate moderate effort for special occasion', () => {
        const input = createBaseInput({
          momentWindows: [
            {
              type: 'birthday',
              description: '生日',
              weight: 0.9,
              expiresAt: new Date(Date.now() + 1000),
            },
          ],
        });

        const result = generateActionCard(input);

        expect(result.actionType).toBe('special_occasion');
        expect(result.effortMinutes).toBeGreaterThanOrEqual(20);
        expect(result.effortMinutes).toBeLessThanOrEqual(60);
      });
    });

    describe('Confirmation Requirement', () => {
      it('should require confirmation for low confidence', () => {
        const input = createBaseInput({
          interactionCount: 0,
          messagesSent: 0,
          messagesReceived: 0,
        });

        const result = generateActionCard(input);

        expect(result.confidence).toBeLessThan(0.5);
        expect(result.requiresConfirmation).toBe(true);
      });

      it('should require confirmation for high risk + high effort', () => {
        // Need extreme values for high risk (score >= 75 or long gap + high importance + low reciprocity)
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          importanceScore: 0.9,
          messagesSent: 30,
          messagesReceived: 0,
          tier: 'vip',
        });

        const result = generateActionCard(input);

        expect(result.riskLevel).toBe('high');
        expect(result.effortMinutes).toBeGreaterThan(30);
        expect(result.requiresConfirmation).toBe(true);
      });

      it('should not require confirmation for low risk, high confidence', () => {
        const input = createBaseInput({
          interactionCount: 50,
          lastInteractionAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          importanceScore: 0.5,
          messagesSent: 5,
          messagesReceived: 5,
        });

        const result = generateActionCard(input);

        expect(result.confidence).toBeGreaterThanOrEqual(0.5);
        expect(result.riskLevel).toBe('low');
        expect(result.requiresConfirmation).toBe(false);
      });
    });

    describe('WhyNow Text Generation', () => {
      it('should include contact name in whyNow', () => {
        const input = createBaseInput({
          contactName: '王五',
        });

        const result = generateActionCard(input);

        expect(result.whyNow).toContain('王五');
      });

      it('should mention moment window in whyNow', () => {
        const input = createBaseInput({
          momentWindows: [
            {
              type: 'birthday',
              description: '生日',
              weight: 0.9,
              expiresAt: new Date(Date.now() + 1000),
            },
          ],
        });

        const result = generateActionCard(input);

        expect(result.whyNow).toContain('生日');
      });

      it('should be a complete sentence ending with period', () => {
        const input = createBaseInput();

        const result = generateActionCard(input);

        // Check for Chinese or English period
        expect(result.whyNow.endsWith('。') || result.whyNow.endsWith('.')).toBe(true);
      });
    });

    describe('Action Type Inference', () => {
      it('should infer deep_conversation for urgentRepairs', () => {
        // Need extreme values to reach score >= 75
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          importanceScore: 0.9,
          messagesSent: 30,
          messagesReceived: 0,
          tier: 'vip',
        });

        const result = generateActionCard(input);

        expect(result.priority.queue).toBe('urgentRepairs');
        expect(result.actionType).toBe('deep_conversation');
      });

      it('should infer catch_up for opportunityBridges', () => {
        // Need values that produce score between 45-74
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
          importanceScore: 0.7,
          messagesSent: 15,
          messagesReceived: 2,
          tier: 'important',
        });

        const result = generateActionCard(input);

        expect(result.priority.queue).toBe('opportunityBridges');
        expect(result.actionType).toBe('catch_up');
      });

      it('should infer greeting for lightTouches', () => {
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          importanceScore: 0.4,
        });

        const result = generateActionCard(input);

        expect(result.priority.queue).toBe('lightTouches');
        expect(result.actionType).toBe('greeting');
      });

      it('should prioritize special_occasion over other types', () => {
        const input = createBaseInput({
          lastInteractionAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          momentWindows: [
            {
              type: 'birthday',
              description: '生日',
              weight: 0.9,
              expiresAt: new Date(Date.now() + 1000),
            },
          ],
        });

        const result = generateActionCard(input);

        expect(result.actionType).toBe('special_occasion');
      });
    });

    describe('Tier Inference', () => {
      it('should infer VIP tier from high importance score', () => {
        const input = createBaseInput({
          importanceScore: 0.85,
          tier: 'vip',
        });

        const result = generateActionCard(input);

        // Higher importance should contribute to higher priority
        const lowImportanceResult = generateActionCard({
          ...input,
          importanceScore: 0.4,
          tier: 'distant',
        });
        expect(result.priority.score).toBeGreaterThan(lowImportanceResult.priority.score);
      });

      it('should infer distant tier from low importance score', () => {
        const input = createBaseInput({
          importanceScore: 0.3,
        });

        const result = generateActionCard(input);

        expect(result.priority.score).toBeLessThan(50);
      });
    });

    describe('Multiple Moment Windows', () => {
      it('should handle multiple moment windows', () => {
        const windows: MomentWindow[] = [
          {
            type: 'holiday',
            description: '春节',
            weight: 0.8,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          {
            type: 'project_milestone',
            description: '项目上线',
            weight: 0.6,
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        ];

        const input = createBaseInput({ momentWindows: windows });

        const result = generateActionCard(input);

        expect(
          result.evidence.filter((e) => e.type === 'moment').length
        ).toBeGreaterThanOrEqual(1);
        expect(result.whyNow).toContain('春节');
      });
    });

    describe('Immutability', () => {
      it('should not mutate input data', () => {
        const momentWindows: MomentWindow[] = [
          {
            type: 'birthday',
            description: '生日',
            weight: 0.9,
            expiresAt: new Date(Date.now() + 1000),
          },
        ];

        const recentInteractions = [
          {
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            summary: '聊了工作近况',
          },
        ];

        const input = createBaseInput({
          momentWindows,
          recentInteractions,
        });

        const originalWindowsLength = momentWindows.length;
        const originalInteractionsLength = recentInteractions.length;

        generateActionCard(input);

        expect(momentWindows.length).toBe(originalWindowsLength);
        expect(recentInteractions.length).toBe(originalInteractionsLength);
      });
    });
  });
});
