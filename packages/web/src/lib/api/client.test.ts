import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, setAuthToken } from './client';
import type { AgentFeedbackRequest } from './agent-types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('API Client - Agent Feedback', () => {
  const mockToken = 'test-auth-token';
  const mockRunId = 'test-run-id';
  const mockActionId = 'test-action-id';

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up localStorage mock
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => {
        if (key === 'auth_token' || key === 'token') return mockToken;
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  describe('submitFeedback', () => {
    it('should submit feedback successfully', async () => {
      const feedbackRequest: AgentFeedbackRequest = {
        runId: mockRunId,
        agentId: 'contact_insight',
        actionId: mockActionId,
        status: 'accepted',
      };

      const mockResponse: Response = {
        ok: true,
        status: 201,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: async () => ({
          success: true,
          feedbackId: 'feedback-123',
        }),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const result = await api.agent.submitFeedback(feedbackRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        '/v1/agent/feedback',
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
          body: JSON.stringify(feedbackRequest),
        })
      );

      expect(result.success).toBe(true);
      expect(result.feedbackId).toBe('feedback-123');
    });

    it('should include auth token in request headers', async () => {
      setAuthToken(mockToken);

      const feedbackRequest: AgentFeedbackRequest = {
        runId: mockRunId,
        agentId: 'network_action',
        actionId: mockActionId,
        status: 'dismissed',
        reasonCode: 'not_relevant',
      };

      const mockResponse: Response = {
        ok: true,
        status: 201,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: async () => ({ success: true }),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      await api.agent.submitFeedback(feedbackRequest);

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;

      expect(headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    });

    it('should handle edited feedback with message', async () => {
      const feedbackRequest: AgentFeedbackRequest = {
        runId: mockRunId,
        agentId: 'contact_insight',
        actionId: mockActionId,
        status: 'edited',
        editedMessage: 'Custom edited message',
        editDistance: 0.35,
      };

      const mockResponse: Response = {
        ok: true,
        status: 201,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: async () => ({ success: true, feedbackId: 'feedback-456' }),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const result = await api.agent.submitFeedback(feedbackRequest);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/v1/agent/feedback',
        expect.objectContaining({
          body: JSON.stringify(feedbackRequest),
        })
      );
    });

    it('should handle executed feedback with timestamp', async () => {
      const executedAtMs = Date.now();

      const feedbackRequest: AgentFeedbackRequest = {
        runId: mockRunId,
        agentId: 'network_action',
        actionId: mockActionId,
        status: 'executed',
        executedAtMs,
      };

      const mockResponse: Response = {
        ok: true,
        status: 201,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: async () => ({ success: true }),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      await api.agent.submitFeedback(feedbackRequest);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle all reason codes', async () => {
      const reasonCodes: AgentFeedbackRequest['reasonCode'][] = [
        'not_relevant',
        'too_generic',
        'tone_off',
        'timing_bad',
        'other',
      ];

      const mockResponse: Response = {
        ok: true,
        status: 201,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: async () => ({ success: true }),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      for (const reasonCode of reasonCodes) {
        const feedbackRequest: AgentFeedbackRequest = {
          runId: mockRunId,
          agentId: 'contact_insight',
          actionId: mockActionId,
          status: 'dismissed',
          reasonCode,
        };

        await api.agent.submitFeedback(feedbackRequest);

        const requestBody = JSON.parse(mockFetch.mock.calls.at(-1)?.[1]?.body as string);
        expect(requestBody.reasonCode).toBe(reasonCode);
      }
    });

    it('should handle all statuses', async () => {
      const statuses: AgentFeedbackRequest['status'][] = [
        'accepted',
        'edited',
        'dismissed',
        'executed',
      ];

      const mockResponse: Response = {
        ok: true,
        status: 201,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: async () => ({ success: true }),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      for (const status of statuses) {
        const feedbackRequest: AgentFeedbackRequest = {
          runId: mockRunId,
          agentId: 'contact_insight',
          actionId: mockActionId,
          status,
        };

        await api.agent.submitFeedback(feedbackRequest);

        const requestBody = JSON.parse(mockFetch.mock.calls.at(-1)?.[1]?.body as string);
        expect(requestBody.status).toBe(status);
      }
    });
  });

  describe('runContactInsight with action cards', () => {
    it('should request contact insight with action cards', async () => {
      const mockResponse: Response = {
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: async () => ({
          runId: mockRunId,
          agentId: 'contact_insight',
          operation: null,
          cached: false,
          data: {
            profileSummary: 'VIP prospect interested in enterprise plan',
            relationshipSignals: [],
            opportunities: [],
            risks: [],
            suggestedActions: [],
            openingLines: [],
            citations: [],
            sourceHash: 'abc123',
            generatedAt: Date.now(),
            relationshipState: 'warming',
            relationshipType: 'business',
            actionCards: [
              {
                actionId: mockActionId,
                goal: 'maintain',
                actionType: 'message',
                whyNow: 'Last interaction was 30 days ago',
                draftMessage: 'Hey! Saw this and thought of you...',
                effortMinutes: 5,
                confidence: 0.85,
                riskLevel: 'low',
                requiresConfirmation: true,
              },
            ],
          },
        }),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const result = await api.agent.runContactInsight({
        contactId: 'contact-123',
        depth: 'standard',
      });

      expect(result.data.actionCards).toBeDefined();
      expect(result.data.actionCards).toHaveLength(1);
      expect(result.data.actionCards?.[0].actionId).toBe(mockActionId);
      expect(result.data.relationshipState).toBe('warming');
    });
  });

  describe('runNetworkAction with queues', () => {
    it('should request network action with categorized queues', async () => {
      const mockResponse: Response = {
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: async () => ({
          runId: mockRunId,
          agentId: 'network_action',
          operation: null,
          cached: false,
          data: {
            followUps: [],
            recommendations: [],
            synthesis: '3 contacts need attention',
            nextActions: [],
            metadata: {
              cached: false,
              sourceHash: 'xyz789',
              generatedAt: Date.now(),
            },
            queues: {
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
              opportunityBridges: [],
              lightTouches: [],
            },
            weeklyPlan: [
              {
                day: 'Mon',
                maxMinutes: 30,
                actions: [],
              },
            ],
          },
        }),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const result = await api.agent.runNetworkAction({});

      expect(result.data.queues).toBeDefined();
      expect(result.data.queues?.urgentRepairs).toHaveLength(1);
      expect(result.data.queues?.urgentRepairs?.[0].goal).toBe('repair');
      expect(result.data.weeklyPlan).toBeDefined();
      expect(result.data.weeklyPlan).toHaveLength(1);
    });
  });

  describe('Error handling', () => {
    it('should handle 401 unauthorized error', async () => {
      const feedbackRequest: AgentFeedbackRequest = {
        runId: mockRunId,
        agentId: 'contact_insight',
        actionId: mockActionId,
        status: 'accepted',
      };

      const mockResponse: Response = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        text: async () => 'Invalid token',
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      // Mock window.location
      const mockLocation = { href: '' };
      vi.stubGlobal('window', {
        location: mockLocation,
        pathname: '/contacts',
      });

      await expect(api.agent.submitFeedback(feedbackRequest)).rejects.toThrow();

      // Should have cleared auth token
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('should handle network error', async () => {
      const feedbackRequest: AgentFeedbackRequest = {
        runId: mockRunId,
        agentId: 'contact_insight',
        actionId: mockActionId,
        status: 'accepted',
      };

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(api.agent.submitFeedback(feedbackRequest)).rejects.toThrow('Network error');
    });
  });
});
