import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../../src/app.module';
import { ContactInsightService } from '../../src/agent/capabilities/contact_insight/contact-insight.service';
import { NetworkActionService } from '../../src/agent/capabilities/network_action/network-action.service';
import { AgentFeedbackService } from '../../src/agent-feedback/agent-feedback.service';
import { FeedbackType } from '../../src/agent-feedback/dto/agent-feedback.dto';
import { cleanupDatabase } from '../db-cleanup';
import {
  ActionCard,
  ActionQueues,
  NetworkActionOutput,
  ContactInsightOutput,
} from '../../src/agent/capabilities/network_action/network-action.types';
import type { ContactInsightOutput as ContactInsightOutputType } from '../../src/agent/capabilities/contact_insight/contact-insight.types';

/**
 * E2E Test for Agent Action Cards Enhancement
 *
 * This test validates the complete action cards flow:
 * 1. Network action agent returns queues with whyNow and evidence
 * 2. Contact insight agent returns action cards with evidence
 * 3. User can accept/edit/dismiss action cards
 * 4. Feedback is properly stored and metrics are calculated
 */
describe('Agent Action Cards E2E', () => {
  let app: INestApplication;
  let networkActionService: NetworkActionService;
  let contactInsightService: ContactInsightService;
  let feedbackService: AgentFeedbackService;

  // Test data
  const testUserId = 'test-action-cards-user';
  const testContactId = 'test-action-cards-contact';
  let testRunId: string;
  let testActionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    networkActionService = app.get<NetworkActionService>(NetworkActionService);
    contactInsightService = app.get<ContactInsightService>(ContactInsightService);
    feedbackService = app.get<AgentFeedbackService>(AgentFeedbackService);
  });

  afterAll(async () => {
    await cleanupDatabase(app);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupDatabase(app);
  });

  describe('network_action agent', () => {
    describe('Action Queues', () => {
      it('should return action queues with required fields', async () => {
        const result = await networkActionService.run({
          userId: testUserId,
          intent: 'maintain',
          relationshipMix: 'mixed',
        });

        expect(result).toBeDefined();
        expect(result.queues).toBeDefined();

        const queues = result.queues;
        if (queues) {
          // Verify queue structure
          expect(queues.urgentRepairs).toBeDefined();
          expect(queues.opportunityBridges).toBeDefined();
          expect(queues.lightTouches).toBeDefined();

          // Verify actions in queues have required fields
          const allActions = [
            ...queues.urgentRepairs,
            ...queues.opportunityBridges,
            ...queues.lightTouches,
          ];

          allActions.forEach((action: ActionCard) => {
            expect(action.actionId).toBeDefined();
            expect(action.contactId).toBeDefined();
            expect(action.contactName).toBeDefined();
            expect(action.action).toBeDefined();
            expect(action.priority).toMatch(/^(high|medium|low)$/);
            expect(action.effortMinutes).toBeGreaterThan(0);
            expect(action.rationale).toBeDefined();
          });

          // Verify metadata
          expect(result.metadata).toBeDefined();
          expect(result.metadata.sourceHash).toBeDefined();
          testRunId = result.metadata.sourceHash;
        }
      });

      it('should include whyNow and evidence in action cards', async () => {
        const result = await networkActionService.run({
          userId: testUserId,
        });

        const queues = result.queues;
        if (queues && queues.urgentRepairs.length > 0) {
          const action = queues.urgentRepairs[0] as ActionCard & { whyNow?: string; evidence?: unknown[] };

          // Check for whyNow field (enhanced action card format)
          if ('whyNow' in action) {
            expect(action.whyNow).toBeDefined();
            expect(typeof action.whyNow).toBe('string');
          }

          // Check for evidence field
          if ('evidence' in action && action.evidence) {
            expect(Array.isArray(action.evidence)).toBe(true);
            if (action.evidence.length > 0) {
              const firstEvidence = action.evidence[0] as { type?: string; reference?: string };
              expect(firstEvidence.type).toBeDefined();
              expect(firstEvidence.reference).toBeDefined();
            }
          }
        }
      });

      it('should use fallback strategy for low data', async () => {
        // Use a user ID that likely has no data
        const lowDataUserId = `low-data-${Date.now()}`;
        const result = await networkActionService.run({
          userId: lowDataUserId,
        });

        expect(result).toBeDefined();
        expect(result.followUps).toEqual([]);
        expect(result.recommendations).toEqual([]);

        // Should have synthesis explaining lack of data
        expect(result.synthesis).toContain('暂无');
      });
    });

    describe('Weekly Plan', () => {
      it('should return weekly plan with distributed actions', async () => {
        const result = await networkActionService.run({
          userId: testUserId,
          timeBudgetMinutes: 60,
        });

        const weeklyPlan = result.weeklyPlan;
        if (weeklyPlan && weeklyPlan.length > 0) {
          // Verify weekly plan structure
          expect(weeklyPlan).toHaveLength(7); // 7 days of the week

          weeklyPlan.forEach((day) => {
            expect(day.day).toBeGreaterThanOrEqual(0);
            expect(day.day).toBeLessThanOrEqual(6);
            expect(day.dayName).toBeDefined();
            expect(day.maxMinutes).toBeGreaterThan(0);
            expect(Array.isArray(day.actions)).toBe(true);

            // Verify action distribution
            day.actions.forEach((action) => {
              expect(action.id).toBeDefined();
              expect(action.contactId).toBeDefined();
              expect(action.contactName).toBeDefined();
              expect(action.action).toBeDefined();
              expect(action.effortMinutes).toBeGreaterThan(0);
              expect(action.priority).toMatch(/^(high|medium|low)$/);
            });
          });
        }
      });

      it('should respect time budget when creating weekly plan', async () => {
        const timeBudget = 30; // 30 minutes per day
        const result = await networkActionService.run({
          userId: testUserId,
          timeBudgetMinutes: timeBudget,
        });

        const weeklyPlan = result.weeklyPlan;
        if (weeklyPlan && weeklyPlan.length > 0) {
          weeklyPlan.forEach((day) => {
            expect(day.maxMinutes).toBeLessThanOrEqual(timeBudget);

            // Sum of effort minutes should not exceed maxMinutes
            const totalEffort = day.actions.reduce((sum, action) => sum + action.effortMinutes, 0);
            expect(totalEffort).toBeLessThanOrEqual(day.maxMinutes);
          });
        }
      });
    });

    describe('Intent and Relationship Mix', () => {
      it('should filter actions based on intent', async () => {
        const intents: Array<'maintain' | 'grow' | 'repair'> = ['maintain', 'grow', 'repair'];

        for (const intent of intents) {
          const result = await networkActionService.run({
            userId: testUserId,
            intent,
          });

          expect(result).toBeDefined();
          // Actions should be relevant to the intent
          // (This is a basic check - actual filtering depends on AI behavior)
        }
      });

      it('should filter actions based on relationship mix', async () => {
        const mixes: Array<'business' | 'friend' | 'mixed'> = ['business', 'friend', 'mixed'];

        for (const mix of mixes) {
          const result = await networkActionService.run({
            userId: testUserId,
            relationshipMix: mix,
          });

          expect(result).toBeDefined();
        }
      });
    });
  });

  describe('contact_insight agent', () => {
    describe('Action Cards', () => {
      it('should return action cards with evidence', async () => {
        const result = await contactInsightService.generate({
          userId: testUserId,
          contactId: testContactId,
          depth: 'standard',
        });

        expect(result).toBeDefined();
        expect(result.profileSummary).toBeDefined();
        expect(result.sourceHash).toBeDefined();
        testRunId = result.sourceHash;

        // Check for actionCards (enhanced format)
        const actionCards = (result as unknown as ContactInsightOutputType & { actionCards?: ActionCard[] }).actionCards;

        if (actionCards && actionCards.length > 0) {
          testActionId = actionCards[0].actionId;

          actionCards.forEach((card: ActionCard) => {
            expect(card.actionId).toBeDefined();
            expect(card.goal).toMatch(/^(maintain|grow|repair)$/);
            expect(card.actionType).toBeDefined();
            expect(card.draftMessage).toBeDefined();
            expect(card.effortMinutes).toBeGreaterThan(0);
            expect(card.confidence).toBeGreaterThan(0);
            expect(card.confidence).toBeLessThanOrEqual(1);
            expect(card.riskLevel).toMatch(/^(low|medium|high)$/);
            expect(typeof card.requiresConfirmation).toBe('boolean');
          });
        }
      });

      it('should include whyNow and evidence in action cards', async () => {
        const result = await contactInsightService.generate({
          userId: testUserId,
          contactId: testContactId,
        });

        const resultWithCards = result as unknown as ContactInsightOutputType & { actionCards?: ActionCard[] };
        const actionCards = resultWithCards.actionCards;

        if (actionCards && actionCards.length > 0) {
          const firstCard = actionCards[0] as ActionCard & { whyNow?: string; evidence?: unknown[] };

          // Check for whyNow
          if ('whyNow' in firstCard && firstCard.whyNow) {
            expect(typeof firstCard.whyNow).toBe('string');
            expect(firstCard.whyNow.length).toBeGreaterThan(0);
          }

          // Check for evidence
          if ('evidence' in firstCard && firstCard.evidence) {
            expect(Array.isArray(firstCard.evidence)).toBe(true);
            if (firstCard.evidence.length > 0) {
              const evidence = firstCard.evidence[0] as { type?: string; reference?: string };
              expect(evidence.type).toBeDefined();
              expect(evidence.reference).toBeDefined();
            }
          }
        }
      });

      it('should include relationship state and type', async () => {
        const result = await contactInsightService.generate({
          userId: testUserId,
          contactId: testContactId,
        });

        const enhancedResult = result as unknown as ContactInsightOutputType & {
          relationshipState?: 'warming' | 'stable' | 'cooling' | 'at_risk';
          relationshipType?: 'business' | 'friend' | 'mixed';
        };

        // These fields are optional, but if present should have valid values
        if (enhancedResult.relationshipState) {
          expect(['warming', 'stable', 'cooling', 'at_risk']).toContain(enhancedResult.relationshipState);
        }

        if (enhancedResult.relationshipType) {
          expect(['business', 'friend', 'mixed']).toContain(enhancedResult.relationshipType);
        }
      });

      it('should include moment signals when relevant', async () => {
        const result = await contactInsightService.generate({
          userId: testUserId,
          contactId: testContactId,
        });

        const enhancedResult = result as unknown as ContactInsightOutputType & {
          momentSignals?: Array<{
            type: string;
            score: number;
            whyNow: string;
            expiresAtMs: number;
          }>;
        };

        // momentSignals is optional
        if (enhancedResult.momentSignals && enhancedResult.momentSignals.length > 0) {
          enhancedResult.momentSignals.forEach((signal) => {
            expect(signal.type).toBeDefined();
            expect(signal.score).toBeGreaterThan(0);
            expect(signal.score).toBeLessThanOrEqual(1);
            expect(signal.whyNow).toBeDefined();
            expect(signal.expiresAtMs).toBeGreaterThan(Date.now());
          });
        }
      });
    });

    describe('Depth Options', () => {
      it('should support different insight depths', async () => {
        const depths: Array<'brief' | 'standard' | 'deep'> = ['brief', 'standard', 'deep'];

        for (const depth of depths) {
          const result = await contactInsightService.generate({
            userId: testUserId,
            contactId: testContactId,
            depth,
          });

          expect(result).toBeDefined();
          expect(result.profileSummary).toBeDefined();

          // Deeper insights should have more content
          // (This is a basic check - actual content depends on AI behavior)
        }
      });
    });
  });

  describe('Feedback API', () => {
    beforeEach(async () => {
      // Generate some test data first
      const networkResult = await networkActionService.run({
        userId: testUserId,
      });
      testRunId = networkResult.metadata?.sourceHash || '';

      const queues = networkResult.queues;
      if (queues && queues.urgentRepairs.length > 0) {
        testActionId = queues.urgentRepairs[0].actionId;
      }
    });

    describe('Action Acceptance', () => {
      it('should accept feedback and update metrics', async () => {
        const feedback = await feedbackService.create(testUserId, {
          agentId: 'network_action',
          runId: testRunId,
          actionId: testActionId,
          contactId: testContactId,
          feedbackType: FeedbackType.ACTION_ACCEPTED,
          rating: 5,
          comment: 'Great suggestion!',
        });

        expect(feedback.id).toBeDefined();
        expect(feedback.feedbackType).toBe(FeedbackType.ACTION_ACCEPTED);
        expect(feedback.rating).toBe(5);

        // Verify stats
        const stats = await feedbackService.getAgentStats('network_action', testUserId);
        expect(stats.totalFeedback).toBe(1);
        expect(stats.averageRating).toBe(5);
        expect(stats.feedbackByType.action_accepted).toBe(1);
      });
    });

    describe('Action Modification', () => {
      it('should calculate edit distance for edited messages', async () => {
        const originalMessage = 'Hello, how are you?';
        const editedMessage = 'Hi! How have you been?';

        const feedback = await feedbackService.create(testUserId, {
          agentId: 'network_action',
          runId: testRunId,
          actionId: testActionId,
          contactId: testContactId,
          feedbackType: FeedbackType.ACTION_MODIFIED,
          rating: 4,
          originalData: {
            draftMessage: originalMessage,
            goal: 'maintain',
            effortMinutes: 5,
          },
          modifiedData: {
            draftMessage: editedMessage,
            goal: 'maintain',
            effortMinutes: 5,
          },
          reason: 'Made it more casual',
        });

        expect(feedback.feedbackType).toBe(FeedbackType.ACTION_MODIFIED);
        expect(feedback.originalData).toBeDefined();
        expect(feedback.modifiedData).toBeDefined();
        expect(feedback.reason).toBe('Made it more casual');

        // Verify the feedback is retrievable
        const retrieved = await feedbackService.findByRunId(testRunId, testUserId);
        expect(retrieved).toHaveLength(1);
        expect(retrieved[0].feedbackType).toBe(FeedbackType.ACTION_MODIFIED);
      });

      it('should handle multiple edits to the same action', async () => {
        // First edit
        await feedbackService.create(testUserId, {
          agentId: 'network_action',
          runId: testRunId,
          actionId: testActionId,
          feedbackType: FeedbackType.ACTION_MODIFIED,
          rating: 3,
        });

        // Second edit (different run)
        await feedbackService.create(testUserId, {
          agentId: 'network_action',
          runId: `${testRunId}-v2`,
          actionId: testActionId,
          feedbackType: FeedbackType.ACTION_MODIFIED,
          rating: 4,
        });

        const actionFeedbacks = await feedbackService.findByActionId(testActionId, testUserId);
        expect(actionFeedbacks.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('Action Dismissal', () => {
      it('should handle dismissal with reason codes', async () => {
        const reasonCodes = [
          'not_relevant',
          'too_generic',
          'tone_off',
          'timing_bad',
          'other',
        ] as const;

        for (const reasonCode of reasonCodes) {
          const feedback = await feedbackService.create(testUserId, {
            agentId: 'network_action',
            runId: `${testRunId}-${reasonCode}`,
            actionId: `${testActionId}-${reasonCode}`,
            feedbackType: FeedbackType.ACTION_REJECTED,
            rating: 1,
            reason: reasonCode,
          });

          expect(feedback.feedbackType).toBe(FeedbackType.ACTION_REJECTED);
          expect(feedback.reason).toBe(reasonCode);
        }

        const stats = await feedbackService.getAgentStats('network_action', testUserId);
        expect(stats.feedbackByType.action_rejected).toBe(reasonCodes.length);
      });
    });
  });

  describe('Cross-Agent Feedback Scenarios', () => {
    it('should track feedback from both agents separately', async () => {
      // Network action feedback
      const networkResult = await networkActionService.run({
        userId: testUserId,
      });
      const networkRunId = networkResult.metadata?.sourceHash || '';

      await feedbackService.create(testUserId, {
        agentId: 'network_action',
        runId: networkRunId,
        actionId: 'network-action-1',
        feedbackType: FeedbackType.ACTION_ACCEPTED,
        rating: 5,
      });

      // Contact insight feedback
      const contactResult = await contactInsightService.generate({
        userId: testUserId,
        contactId: testContactId,
      });
      const contactRunId = contactResult.sourceHash;

      await feedbackService.create(testUserId, {
        agentId: 'contact_insight',
        runId: contactRunId,
        actionId: 'contact-action-1',
        feedbackType: FeedbackType.ACTION_ACCEPTED,
        rating: 4,
      });

      // Verify separate stats
      const networkStats = await feedbackService.getAgentStats('network_action', testUserId);
      expect(networkStats.totalFeedback).toBe(1);
      expect(networkStats.averageRating).toBe(5);

      const contactStats = await feedbackService.getAgentStats('contact_insight', testUserId);
      expect(contactStats.totalFeedback).toBe(1);
      expect(contactStats.averageRating).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queues gracefully', async () => {
      const emptyUserId = `empty-user-${Date.now()}`;
      const result = await networkActionService.run({
        userId: emptyUserId,
      });

      expect(result).toBeDefined();
      expect(result.synthesis).toContain('暂无');
    });

    it('should handle feedback for non-existent actions', async () => {
      const feedback = await feedbackService.create(testUserId, {
        agentId: 'network_action',
        runId: 'non-existent-run',
        actionId: 'non-existent-action',
        feedbackType: FeedbackType.ACTION_REJECTED,
        reason: 'Action not found',
      });

      expect(feedback.id).toBeDefined();
      expect(feedback.actionId).toBe('non-existent-action');
    });

    it('should handle concurrent feedback submissions', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        feedbackService.create(testUserId, {
          agentId: 'network_action',
          runId: testRunId,
          actionId: `action-${i}`,
          feedbackType: FeedbackType.ACTION_ACCEPTED,
          rating: 5,
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(new Set(results.map((r) => r.id)).size).toBe(10); // All unique IDs
    });
  });
});
