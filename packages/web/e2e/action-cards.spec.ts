/**
 * E2E Tests for Agent Action Cards UI
 *
 * These tests use Vitest + Testing Library for component testing.
 * For full browser automation, consider adding Playwright:
 * npm install -D @playwright/test
 *
 * Then run with: npx playwright test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ActionsPage } from '../src/pages/ActionsPage';
import { ActionCard } from '../src/components/ActionCard/ActionCard';
import { ActionQueue } from '../src/components/ActionQueue/ActionQueue';
import type { ActionCard as ActionCardType, ActionQueues, NetworkActionData } from '../src/lib/api/agent-types';

// Mock API client
vi.mock('../src/lib/api/client', () => ({
  api: {
    agent: {
      runNetworkAction: vi.fn(),
      submitFeedback: vi.fn(),
    },
  },
}));

import { api } from '../src/lib/api/client';

const mockRunNetworkAction = vi.mocked(api.agent.runNetworkAction);
const mockSubmitFeedback = vi.mocked(api.agent.submitFeedback);

// Helper: Wrap component with router
function withRouter(component: React.ReactNode) {
  return <MemoryRouter>{component}</MemoryRouter>;
}

// Helper: Create mock action card
function createMockActionCard(overrides?: Partial<ActionCardType>): ActionCardType {
  return {
    actionId: 'action-1',
    goal: 'maintain',
    actionType: 'message',
    whyNow: 'Last conversation was 3 weeks ago',
    evidence: [
      { type: 'event', source: 'conversation', reference: 'Coffee meeting on Jan 15' },
      { type: 'fact', source: 'contact', reference: 'Works at TechCorp' },
    ],
    draftMessage: 'Hey! It\'s been a while. How are things going?',
    effortMinutes: 5,
    confidence: 0.85,
    riskLevel: 'low',
    requiresConfirmation: false,
    contactId: 'contact-1',
    contactName: 'John Doe',
    ...overrides,
  };
}

// Helper: Create mock network action data
function createMockNetworkActionData(overrides?: Partial<NetworkActionData>): NetworkActionData {
  return {
    followUps: [],
    recommendations: [],
    synthesis: 'You have 5 contacts that need attention. 2 require urgent repairs, 2 have opportunity bridges, and 1 needs a light touch.',
    nextActions: [],
    metadata: {
      cached: false,
      sourceHash: 'test-source-hash-123',
      generatedAt: Date.now(),
    },
    queues: {
      urgentRepairs: [
        createMockActionCard({
          actionId: 'urgent-1',
          goal: 'repair',
          actionType: 'message',
          whyNow: 'Relationship has been cooling for 2 months',
          evidence: [{ type: 'recency', source: 'interaction', reference: 'Last interaction: 60 days ago' }],
          draftMessage: 'I\'ve been thinking about our last conversation...',
          effortMinutes: 10,
          confidence: 0.9,
          riskLevel: 'high',
          requiresConfirmation: true,
        }),
      ],
      opportunityBridges: [
        createMockActionCard({
          actionId: 'bridge-1',
          goal: 'grow',
          actionType: 'invite',
          whyNow: 'You both mentioned interest in AI startups',
          evidence: [{ type: 'conversation', source: 'chat', reference: 'Discussed AI trends' }],
          draftMessage: 'Would you be interested in joining a startup founder meetup?',
          effortMinutes: 15,
          confidence: 0.75,
          riskLevel: 'medium',
          requiresConfirmation: false,
        }),
      ],
      lightTouches: [
        createMockActionCard({
          actionId: 'light-1',
          goal: 'maintain',
          actionType: 'social',
          whyNow: 'Quick check-in to maintain the relationship',
          evidence: [],
          draftMessage: 'Saw this and thought of you!',
          effortMinutes: 2,
          confidence: 0.6,
          riskLevel: 'low',
          requiresConfirmation: false,
        }),
      ],
    },
    weeklyPlan: [
      {
        day: 'Mon',
        maxMinutes: 30,
        actions: [
          createMockActionCard({
            actionId: 'mon-1',
            effortMinutes: 15,
          }),
        ],
      },
      {
        day: 'Tue',
        maxMinutes: 30,
        actions: [],
      },
      {
        day: 'Wed',
        maxMinutes: 30,
        actions: [
          createMockActionCard({
            actionId: 'wed-1',
            effortMinutes: 20,
          }),
        ],
      },
      {
        day: 'Thu',
        maxMinutes: 30,
        actions: [],
      },
      {
        day: 'Fri',
        maxMinutes: 30,
        actions: [],
      },
      {
        day: 'Sat',
        maxMinutes: 10,
        actions: [],
      },
      {
        day: 'Sun',
        maxMinutes: 10,
        actions: [],
      },
    ],
    ...overrides,
  };
}

describe('Action Cards E2E (Component Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ActionsPage', () => {
    it('should display loading state initially', async () => {
      mockRunNetworkAction.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: createMockNetworkActionData() }), 100))
      );

      render(withRouter(<ActionsPage />));

      expect(screen.getByText(/加载中|Loading/i)).toBeInTheDocument();
    });

    it('should display action queues after data loads', async () => {
      const mockData = createMockNetworkActionData();
      mockRunNetworkAction.mockResolvedValue({ data: mockData });

      render(withRouter(<ActionsPage />));

      await waitFor(() => {
        expect(screen.getByText('紧急修复')).toBeInTheDocument();
        expect(screen.getByText('机会桥接')).toBeInTheDocument();
        expect(screen.getByText('轻触达')).toBeInTheDocument();
      });
    });

    it('should display weekly plan', async () => {
      const mockData = createMockNetworkActionData();
      mockRunNetworkAction.mockResolvedValue({ data: mockData });

      render(withRouter(<ActionsPage />));

      await waitFor(() => {
        expect(screen.getByText(/周一|Mon/i)).toBeInTheDocument();
      });
    });

    it('should display error state when API fails', async () => {
      mockRunNetworkAction.mockRejectedValue(new Error('Network error'));

      render(withRouter(<ActionsPage />));

      await waitFor(() => {
        expect(screen.getByText(/加载失败|Network error/i)).toBeInTheDocument();
      });
    });

    it('should handle refresh button click', async () => {
      const mockData = createMockNetworkActionData();
      mockRunNetworkAction.mockResolvedValue({ data: mockData });

      render(withRouter(<ActionsPage />));

      await waitFor(() => {
        expect(screen.getByText('紧急修复')).toBeInTheDocument();
      });

      const refreshButton = screen.getByLabelText('刷新');
      await userEvent.click(refreshButton);

      expect(mockRunNetworkAction).toHaveBeenCalledTimes(2);
    });
  });

  describe('ActionCard Component', () => {
    it('should display action card details', () => {
      const mockCard = createMockActionCard();
      const onAccept = vi.fn();
      const onDismiss = vi.fn();

      render(
        withRouter(
          <ActionCard card={mockCard} onAccept={onAccept} onDismiss={onDismiss} />
        )
      );

      expect(screen.getByText('保持联系')).toBeInTheDocument();
      expect(screen.getByText('低风险')).toBeInTheDocument();
      expect(screen.getByText('5 分钟')).toBeInTheDocument();
      expect(screen.getByText('置信度 85%')).toBeInTheDocument();
    });

    it('should display whyNow and evidence when expanded', async () => {
      const mockCard = createMockActionCard();
      const onAccept = vi.fn();
      const onDismiss = vi.fn();

      render(
        withRouter(
          <ActionCard card={mockCard} onAccept={onAccept} onDismiss={onDismiss} />
        )
      );

      // Click to expand
      const card = screen.getByText('保持联系').closest('.bg-bg-card');
      if (card) {
        await userEvent.click(card);
      }

      await waitFor(() => {
        expect(screen.getByText('为什么现在')).toBeInTheDocument();
        expect(screen.getByText(mockCard.whyNow)).toBeInTheDocument();
      });
    });

    it('should handle accept action', async () => {
      const mockCard = createMockActionCard();
      const onAccept = vi.fn();
      const onDismiss = vi.fn();

      render(
        withRouter(
          <ActionCard card={mockCard} onAccept={onAccept} onDismiss={onDismiss} />
        )
      );

      // Expand the card
      const card = screen.getByText('保持联系').closest('.bg-bg-card');
      if (card) {
        await userEvent.click(card);
      }

      await waitFor(() => {
        expect(screen.getByText('接受')).toBeInTheDocument();
      });

      const acceptButton = screen.getByText('接受');
      await userEvent.click(acceptButton);

      expect(onAccept).toHaveBeenCalledWith(mockCard.actionId);
    });

    it('should handle edit and accept action', async () => {
      const mockCard = createMockActionCard();
      const onAccept = vi.fn();
      const onDismiss = vi.fn();

      render(
        withRouter(
          <ActionCard card={mockCard} onAccept={onAccept} onDismiss={onDismiss} />
        )
      );

      // Expand the card
      const card = screen.getByText('保持联系').closest('.bg-bg-card');
      if (card) {
        await userEvent.click(card);
      }

      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument();
      });

      // Click edit
      const editButton = screen.getByText('编辑');
      await userEvent.click(editButton);

      // Modify the message
      const textarea = screen.getByRole('textbox');
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'Modified message');

      // Accept the modification
      const acceptButton = screen.getByText('接受修改');
      await userEvent.click(acceptButton);

      expect(onAccept).toHaveBeenCalledWith(mockCard.actionId, 'Modified message');
    });

    it('should handle dismiss action with reason', async () => {
      const mockCard = createMockActionCard();
      const onAccept = vi.fn();
      const onDismiss = vi.fn();

      render(
        withRouter(
          <ActionCard card={mockCard} onAccept={onAccept} onDismiss={onDismiss} />
        )
      );

      // Expand the card
      const card = screen.getByText('保持联系').closest('.bg-bg-card');
      if (card) {
        await userEvent.click(card);
      }

      await waitFor(() => {
        expect(screen.getByText('忽略')).toBeInTheDocument();
      });

      // Click dismiss
      const dismissButton = screen.getByText('忽略');
      await userEvent.click(dismissButton);

      // Select a reason
      await waitFor(() => {
        expect(screen.getByText('不相关')).toBeInTheDocument();
      });

      const notRelevantButton = screen.getByText('不相关');
      await userEvent.click(notRelevantButton);

      expect(onDismiss).toHaveBeenCalledWith(mockCard.actionId, 'not_relevant');
    });

    it('should cancel edit when cancel button clicked', async () => {
      const mockCard = createMockActionCard();
      const onAccept = vi.fn();
      const onDismiss = vi.fn();

      render(
        withRouter(
          <ActionCard card={mockCard} onAccept={onAccept} onDismiss={onDismiss} />
        )
      );

      // Expand and edit
      const card = screen.getByText('保持联系').closest('.bg-bg-card');
      if (card) {
        await userEvent.click(card);
      }

      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('编辑'));

      const textarea = screen.getByRole('textbox');
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'Modified message');

      // Cancel
      await userEvent.click(screen.getByText('取消'));

      // Textarea should be gone (collapsed)
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('ActionQueue Component', () => {
    it('should display queue tabs with counts', () => {
      const mockQueues: ActionQueues = {
        urgentRepairs: [createMockActionCard(), createMockActionCard()],
        opportunityBridges: [createMockActionCard()],
        lightTouches: [],
      };

      const onFeedback = vi.fn();

      render(
        withRouter(
          <ActionQueue queues={mockQueues} onFeedback={onFeedback} />
        )
      );

      expect(screen.getByText('紧急修复')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Count badge
      expect(screen.getByText('机会桥接')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should switch between queue tabs', async () => {
      const mockQueues: ActionQueues = {
        urgentRepairs: [createMockActionCard()],
        opportunityBridges: [createMockActionCard()],
        lightTouches: [createMockActionCard()],
      };

      const onFeedback = vi.fn();

      render(
        withRouter(
          <ActionQueue queues={mockQueues} onFeedback={onFeedback} />
        )
      );

      // Default: urgentRepairs
      expect(screen.getByText(mockQueues.urgentRepairs[0].whyNow)).toBeInTheDocument();

      // Switch to opportunityBridges
      await userEvent.click(screen.getByText('机会桥接'));
      expect(screen.getByText(mockQueues.opportunityBridges[0].whyNow)).toBeInTheDocument();

      // Switch to lightTouches
      await userEvent.click(screen.getByText('轻触达'));
      expect(screen.getByText(mockQueues.lightTouches[0].whyNow)).toBeInTheDocument();
    });

    it('should display empty state for queue with no actions', () => {
      const mockQueues: ActionQueues = {
        urgentRepairs: [],
        opportunityBridges: [],
        lightTouches: [],
      };

      const onFeedback = vi.fn();

      render(
        withRouter(
          <ActionQueue queues={mockQueues} onFeedback={onFeedback} />
        )
      );

      expect(screen.getByText(/暂无.*紧急修复.*行动/)).toBeInTheDocument();
    });

    it('should display queue summary with total actions and time', () => {
      const mockQueues: ActionQueues = {
        urgentRepairs: [
          createMockActionCard({ effortMinutes: 10 }),
          createMockActionCard({ effortMinutes: 15 }),
        ],
        opportunityBridges: [
          createMockActionCard({ effortMinutes: 5 }),
        ],
        lightTouches: [],
      };

      const onFeedback = vi.fn();

      render(
        withRouter(
          <ActionQueue queues={mockQueues} onFeedback={onFeedback} />
        )
      );

      expect(screen.getByText('共 3 个待处理行动')).toBeInTheDocument();
      expect(screen.getByText(/30.*分钟/)).toBeInTheDocument(); // 10 + 15 + 5
    });

    it('should forward feedback from ActionCard to parent', async () => {
      const mockCard = createMockActionCard();
      const mockQueues: ActionQueues = {
        urgentRepairs: [mockCard],
        opportunityBridges: [],
        lightTouches: [],
      };

      const onFeedback = vi.fn();

      render(
        withRouter(
          <ActionQueue queues={mockQueues} onFeedback={onFeedback} />
        )
      );

      // Expand and accept
      const card = screen.getByText('保持联系').closest('.bg-bg-card');
      if (card) {
        await userEvent.click(card);
      }

      await waitFor(() => {
        expect(screen.getByText('接受')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('接受'));

      expect(onFeedback).toHaveBeenCalledWith(mockCard.actionId, 'accepted');
    });
  });

  describe('Feedback Submission Flow', () => {
    it('should submit accepted feedback to API', async () => {
      const mockData = createMockNetworkActionData();
      mockRunNetworkAction.mockResolvedValue({ data: mockData });
      mockSubmitFeedback.mockResolvedValue({ success: true });

      render(withRouter(<ActionsPage />));

      await waitFor(() => {
        expect(screen.getByText('紧急修复')).toBeInTheDocument();
      });

      // Expand first card
      const card = screen.getByText('保持联系').closest('.bg-bg-card');
      if (card) {
        await userEvent.click(card);
      }

      await waitFor(() => {
        expect(screen.getByText('接受')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('接受'));

      await waitFor(() => {
        expect(mockSubmitFeedback).toHaveBeenCalledWith({
          runId: mockData.metadata?.sourceHash,
          agentId: 'network_action',
          actionId: expect.any(String),
          status: 'accepted',
          reasonCode: undefined,
          editedMessage: undefined,
        });
      });
    });

    it('should submit edited feedback to API', async () => {
      const mockData = createMockNetworkActionData();
      mockRunNetworkAction.mockResolvedValue({ data: mockData });
      mockSubmitFeedback.mockResolvedValue({ success: true });

      render(withRouter(<ActionsPage />));

      await waitFor(() => {
        expect(screen.getByText('紧急修复')).toBeInTheDocument();
      });

      // Expand first card
      const card = screen.getByText('保持联系').closest('.bg-bg-card');
      if (card) {
        await userEvent.click(card);
      }

      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('编辑'));

      const textarea = screen.getByRole('textbox');
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'My edited message');

      await userEvent.click(screen.getByText('接受修改'));

      await waitFor(() => {
        expect(mockSubmitFeedback).toHaveBeenCalledWith({
          runId: mockData.metadata?.sourceHash,
          agentId: 'network_action',
          actionId: expect.any(String),
          status: 'edited',
          reasonCode: undefined,
          editedMessage: 'My edited message',
        });
      });
    });

    it('should submit dismissed feedback to API', async () => {
      const mockData = createMockNetworkActionData();
      mockRunNetworkAction.mockResolvedValue({ data: mockData });
      mockSubmitFeedback.mockResolvedValue({ success: true });

      render(withRouter(<ActionsPage />));

      await waitFor(() => {
        expect(screen.getByText('紧急修复')).toBeInTheDocument();
      });

      // Expand first card
      const card = screen.getByText('保持联系').closest('.bg-bg-card');
      if (card) {
        await userEvent.click(card);
      }

      await waitFor(() => {
        expect(screen.getByText('忽略')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('忽略'));

      await waitFor(() => {
        expect(screen.getByText('不相关')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('不相关'));

      await waitFor(() => {
        expect(mockSubmitFeedback).toHaveBeenCalledWith({
          runId: mockData.metadata?.sourceHash,
          agentId: 'network_action',
          actionId: expect.any(String),
          status: 'dismissed',
          reasonCode: 'not_relevant',
          editedMessage: undefined,
        });
      });
    });

    it('should remove action from UI after successful feedback', async () => {
      const mockData = createMockNetworkActionData();
      mockRunNetworkAction.mockResolvedValue({ data: mockData });
      mockSubmitFeedback.mockResolvedValue({ success: true, feedbackId: 'fb-1' });

      render(withRouter(<ActionsPage />));

      await waitFor(() => {
        expect(screen.getByText('紧急修复')).toBeInTheDocument();
      });

      // There should be at least one action card
      const initialCards = screen.getAllByText('保持联系');
      expect(initialCards.length).toBeGreaterThan(0);

      // Expand and accept first card
      const card = initialCards[0].closest('.bg-bg-card');
      if (card) {
        await userEvent.click(card);
      }

      await waitFor(() => {
        expect(screen.getByText('接受')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('接受'));

      // The card should be removed from UI
      await waitFor(() => {
        const remainingCards = screen.queryAllByText('保持联系');
        expect(remainingCards.length).toBeLessThan(initialCards.length);
      });
    });
  });
});
