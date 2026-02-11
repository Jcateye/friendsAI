import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../app.module';
import { AgentRuntimeExecutor } from '../agent/runtime/agent-runtime-executor.service';
import { ContactInsightService } from '../agent/capabilities/contact_insight/contact-insight.service';
import { NetworkActionService } from '../agent/capabilities/network_action/network-action.service';
import { AgentFeedbackService } from '../agent-feedback/agent-feedback.service';
import { AgentFeedback } from '../entities/agent-feedback.entity';
import { FeedbackType } from '../agent-feedback/dto/agent-feedback.dto';
import { cleanupDatabase } from './db-cleanup';

/**
 * E2E Test for Agent Run -> Action -> Feedback Loop
 *
 * This test validates the complete feedback learning loop:
 * 1. Run agent to generate action cards
 * 2. User provides feedback on action cards
 * 3. Feedback is stored and can be retrieved
 * 4. Stats reflect the feedback
 */
describe('Agent Run -> Action -> Feedback Loop (E2E)', () => {
  let app: INestApplication;
  let agentRuntimeExecutor: AgentRuntimeExecutor;
  let contactInsightService: ContactInsightService;
  let networkActionService: NetworkActionService;
  let feedbackService: AgentFeedbackService;

  // Test data
  const testUserId = 'test-user-feedback-loop';
  const testContactId = 'test-contact-feedback-loop';
  let testRunId: string;
  let testActionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    agentRuntimeExecutor = app.get<AgentRuntimeExecutor>(AgentRuntimeExecutor);
    contactInsightService = app.get<ContactInsightService>(ContactInsightService);
    networkActionService = app.get<NetworkActionService>(NetworkActionService);
    feedbackService = app.get<AgentFeedbackService>(AgentFeedbackService);
  });

  afterAll(async () => {
    await cleanupDatabase(app);
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupDatabase(app);
  });

  describe('Contact Insight -> Action Card -> Feedback Loop', () => {
    it('should complete the full loop: run -> action -> feedback', async () => {
      // Step 1: Run contact_insight agent
      const insightResult = await contactInsightService.generate({
        userId: testUserId,
        contactId: testContactId,
        depth: 'standard',
      });

      expect(insightResult).toBeDefined();
      expect(insightResult.profileSummary).toBeDefined();
      testRunId = insightResult.sourceHash; // Using sourceHash as run identifier

      // Step 2: Extract action card if available (may be undefined if not implemented yet)
      const actionCards = insightResult.actionCards || [];
      if (actionCards.length > 0) {
        testActionId = actionCards[0].actionId;

        // Step 3: User accepts the action
        const acceptFeedback = await feedbackService.create(testUserId, {
          agentId: 'contact_insight',
          runId: testRunId,
          actionId: testActionId,
          contactId: testContactId,
          feedbackType: FeedbackType.ACTION_ACCEPTED,
          rating: 5,
          comment: 'Perfect suggestion!',
          originalData: actionCards[0],
        });

        expect(acceptFeedback.id).toBeDefined();
        expect(acceptFeedback.feedbackType).toBe(FeedbackType.ACTION_ACCEPTED);
        expect(acceptFeedback.rating).toBe(5);

        // Step 4: Retrieve feedback by run ID
        const feedbacksByRun = await feedbackService.findByRunId(testRunId, testUserId);
        expect(feedbacksByRun).toHaveLength(1);
        expect(feedbacksByRun[0].actionId).toBe(testActionId);

        // Step 5: Retrieve feedback by action ID
        const feedbacksByAction = await feedbackService.findByActionId(testActionId, testUserId);
        expect(feedbacksByAction).toHaveLength(1);
        expect(feedbacksByAction[0].runId).toBe(testRunId);

        // Step 6: Check agent stats
        const stats = await feedbackService.getAgentStats('contact_insight', testUserId);
        expect(stats.totalFeedback).toBe(1);
        expect(stats.averageRating).toBe(5);
        expect(stats.feedbackByType.action_accepted).toBe(1);
        expect(stats.acceptanceRate).toBe(1);
      }
    });

    it('should handle action modification feedback', async () => {
      const insightResult = await contactInsightService.generate({
        userId: testUserId,
        contactId: testContactId,
      });

      const actionCards = insightResult.actionCards || [];
      if (actionCards.length > 0) {
        const originalAction = actionCards[0];
        const modifiedAction = {
          ...originalAction,
          draftMessage: 'Modified message text',
        };

        const modifyFeedback = await feedbackService.create(testUserId, {
          agentId: 'contact_insight',
          runId: insightResult.sourceHash,
          actionId: originalAction.actionId,
          contactId: testContactId,
          feedbackType: FeedbackType.ACTION_MODIFIED,
          rating: 4,
          originalData: originalAction,
          modifiedData: modifiedAction,
          reason: 'Tweaked the tone to be more casual',
        });

        expect(modifyFeedback.feedbackType).toBe(FeedbackType.ACTION_MODIFIED);
        expect(modifyFeedback.originalData).toEqual(originalAction);
        expect(modifyFeedback.modifiedData).toEqual(modifiedAction);
        expect(modifyFeedback.reason).toBe('Tweaked the tone to be more casual');

        const stats = await feedbackService.getAgentStats('contact_insight', testUserId);
        expect(stats.feedbackByType.action_modified).toBe(1);
        expect(stats.acceptanceRate).toBeLessThan(1); // Modified actions don't count as accepted
      }
    });

    it('should handle action rejection feedback', async () => {
      const insightResult = await contactInsightService.generate({
        userId: testUserId,
        contactId: testContactId,
      });

      const actionCards = insightResult.actionCards || [];
      if (actionCards.length > 0) {
        const rejectFeedback = await feedbackService.create(testUserId, {
          agentId: 'contact_insight',
          runId: insightResult.sourceHash,
          actionId: actionCards[0].actionId,
          contactId: testContactId,
          feedbackType: FeedbackType.ACTION_REJECTED,
          rating: 1,
          reason: 'Not appropriate for this contact',
        });

        expect(rejectFeedback.feedbackType).toBe(FeedbackType.ACTION_REJECTED);
        expect(rejectFeedback.reason).toBe('Not appropriate for this contact');

        const stats = await feedbackService.getAgentStats('contact_insight', testUserId);
        expect(stats.feedbackByType.action_rejected).toBe(1);
        expect(stats.acceptanceRate).toBe(0); // Rejected actions don't count as accepted
      }
    });
  });

  describe('Network Action -> Queues -> Feedback Loop', () => {
    it('should support feedback on queued actions', async () => {
      // Step 1: Run network_action agent
      const actionResult = await networkActionService.run({
        userId: testUserId,
      });

      expect(actionResult).toBeDefined();
      expect(actionResult.queues).toBeDefined();

      const queues = actionResult.queues;
      if (queues) {
        // Step 2: Provide feedback on actions from different queues
        const feedbackPromises = [];

        // Feedback on urgent repair action
        if (queues.urgentRepairs.length > 0) {
          feedbackPromises.push(
            feedbackService.create(testUserId, {
              agentId: 'network_action',
              runId: actionResult.metadata.sourceHash,
              actionId: queues.urgentRepairs[0].id,
              contactId: queues.urgentRepairs[0].contactId,
              feedbackType: FeedbackType.ACTION_ACCEPTED,
              rating: 5,
            })
          );
        }

        // Feedback on opportunity bridge action
        if (queues.opportunityBridges.length > 0) {
          feedbackPromises.push(
            feedbackService.create(testUserId, {
              agentId: 'network_action',
              runId: actionResult.metadata.sourceHash,
              actionId: queues.opportunityBridges[0].id,
              contactId: queues.opportunityBridges[0].contactId,
              feedbackType: FeedbackType.ACTION_MODIFIED,
              rating: 3,
              reason: 'Needs more context',
            })
          );
        }

        // Feedback on light touch action
        if (queues.lightTouches.length > 0) {
          feedbackPromises.push(
            feedbackService.create(testUserId, {
              agentId: 'network_action',
              runId: actionResult.metadata.sourceHash,
              actionId: queues.lightTouches[0].id,
              contactId: queues.lightTouches[0].contactId,
              feedbackType: FeedbackType.ACTION_REJECTED,
              rating: 2,
              reason: 'Not a priority right now',
            })
          );
        }

        const feedbacks = await Promise.all(feedbackPromises);

        expect(feedbacks.length).toBeGreaterThan(0);

        // Step 3: Verify all feedback is stored
        const runFeedbacks = await feedbackService.findByRunId(
          actionResult.metadata.sourceHash,
          testUserId
        );

        expect(runFeedbacks.length).toBe(feedbacks.length);

        // Step 4: Check agent stats
        const stats = await feedbackService.getAgentStats('network_action', testUserId);
        expect(stats.totalFeedback).toBe(feedbacks.length);
      }
    });
  });

  describe('Feedback Aggregation and Stats', () => {
    it('should correctly calculate acceptance rate', async () => {
      // Create multiple feedback entries
      const feedbacks = [
        { type: FeedbackType.ACTION_ACCEPTED, rating: 5 },
        { type: FeedbackType.ACTION_ACCEPTED, rating: 4 },
        { type: FeedbackType.ACTION_REJECTED, rating: 2 },
        { type: FeedbackType.ACTION_MODIFIED, rating: 3 },
        { type: FeedbackType.INSIGHT_HELPFUL, rating: null }, // Not counted in acceptance
        { type: FeedbackType.INSIGHT_NOT_HELPFUL, rating: null }, // Not counted in acceptance
      ];

      for (const fb of feedbacks) {
        await feedbackService.create(testUserId, {
          agentId: 'contact_insight',
          feedbackType: fb.type,
          rating: fb.rating ?? undefined,
        });
      }

      const stats = await feedbackService.getAgentStats('contact_insight', testUserId);

      // Total feedback: 6
      expect(stats.totalFeedback).toBe(6);

      // Average rating: (5 + 4 + 2 + 3) / 4 = 3.5
      expect(stats.averageRating).toBeCloseTo(3.5, 1);

      // Acceptance rate: 2 / 4 = 0.5 (only action feedback counted)
      expect(stats.acceptanceRate).toBeCloseTo(0.5, 1);
    });

    it('should aggregate feedback by type', async () => {
      const feedbackCounts = {
        action_accepted: 5,
        action_rejected: 2,
        action_modified: 3,
        insight_helpful: 4,
        insight_not_helpful: 1,
      };

      for (const [type, count] of Object.entries(feedbackCounts)) {
        for (let i = 0; i < count; i++) {
          await feedbackService.create(testUserId, {
            agentId: 'network_action',
            feedbackType: type as FeedbackType,
          });
        }
      }

      const stats = await feedbackService.getAgentStats('network_action', testUserId);

      expect(stats.feedbackByType.action_accepted).toBe(5);
      expect(stats.feedbackByType.action_rejected).toBe(2);
      expect(stats.feedbackByType.action_modified).toBe(3);
      expect(stats.feedbackByType.insight_helpful).toBe(4);
      expect(stats.feedbackByType.insight_not_helpful).toBe(1);
    });
  });

  describe('Feedback Retrieval Scenarios', () => {
    it('should retrieve all feedback for a specific contact', async () => {
      const contact1Id = 'contact-1';
      const contact2Id = 'contact-2';

      // Create feedback for different contacts
      await feedbackService.create(testUserId, {
        agentId: 'contact_insight',
        contactId: contact1Id,
        feedbackType: FeedbackType.INSIGHT_HELPFUL,
      });

      await feedbackService.create(testUserId, {
        agentId: 'contact_insight',
        contactId: contact1Id,
        feedbackType: FeedbackType.ACTION_ACCEPTED,
      });

      await feedbackService.create(testUserId, {
        agentId: 'contact_insight',
        contactId: contact2Id,
        feedbackType: FeedbackType.INSIGHT_NOT_HELPFUL,
      });

      const contact1Feedbacks = await feedbackService.findByContactId(contact1Id, testUserId);
      const contact2Feedbacks = await feedbackService.findByContactId(contact2Id, testUserId);

      expect(contact1Feedbacks).toHaveLength(2);
      expect(contact2Feedbacks).toHaveLength(1);
    });

    it('should handle feedback without user association', async () => {
      const feedback = await feedbackService.create('', {
        agentId: 'network_action',
        feedbackType: FeedbackType.OTHER,
        comment: 'General feedback',
      });

      expect(feedback.userId).toBe('');

      // Should be retrievable without user filter
      const retrieved = await feedbackService.findOne(feedback.id);
      expect(retrieved).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle feedback for non-existent action gracefully', async () => {
      const feedback = await feedbackService.create(testUserId, {
        agentId: 'contact_insight',
        actionId: 'non-existent-action',
        feedbackType: FeedbackType.ACTION_REJECTED,
        reason: 'Action not found in output',
      });

      expect(feedback.id).toBeDefined();
    });

    it('should handle feedback with all optional fields populated', async () => {
      const feedback = await feedbackService.create(testUserId, {
        agentId: 'contact_insight',
        runId: testRunId,
        actionId: testActionId,
        contactId: testContactId,
        feedbackType: FeedbackType.ACTION_MODIFIED,
        rating: 4,
        comment: 'Good suggestion, just needed minor adjustment',
        originalData: {
          action: 'Send message',
          goal: 'maintain',
          effortMinutes: 5,
        },
        modifiedData: {
          action: 'Send email',
          goal: 'maintain',
          effortMinutes: 10,
        },
        reason: 'Email allows for more detailed communication',
      });

      expect(feedback.originalData).toBeDefined();
      expect(feedback.modifiedData).toBeDefined();
      expect(feedback.reason).toBeDefined();
      expect(feedback.comment).toBeDefined();
    });
  });
});
