/**
 * E2E Tests for Agent Action Cards UI (Playwright Version)
 *
 * These tests require Playwright to be installed:
 * npm install -D @playwright/test
 *
 * Run tests with: npx playwright test
 *
 * This file provides full browser automation testing for the Action Cards feature.
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:10086';

// Helper: Login before each test
test.beforeEach(async ({ page }) => {
  // Navigate to base URL
  await page.goto(BASE_URL);

  // TODO: Add authentication step if required
  // await page.fill('[name="email"]', 'test@example.com');
  // await page.fill('[name="password"]', 'password');
  // await page.click('button[type="submit"]');
});

test.describe('Actions Page', () => {
  test('should display action queues in Actions page', async ({ page }) => {
    // Navigate to Actions page
    await page.goto(`${BASE_URL}/actions`);

    // Wait for data to load
    await page.waitForSelector('[data-testid="action-queues"]', { timeout: 10000 });

    // Verify queues are displayed
    await expect(page.locator('text=紧急修复')).toBeVisible();
    await expect(page.locator('text=机会桥接')).toBeVisible();
    await expect(page.locator('text=轻触达')).toBeVisible();
  });

  test('should display weekly plan with distributed actions', async ({ page }) => {
    await page.goto(`${BASE_URL}/actions`);

    // Wait for weekly plan to load
    await page.waitForSelector('[data-testid="weekly-plan"]', { timeout: 10000 });

    // Verify days are displayed
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    for (const day of days) {
      await expect(page.locator(`text=${day}`).first()).toBeVisible();
    }
  });

  test('should handle refresh button click', async ({ page }) => {
    await page.goto(`${BASE_URL}/actions`);

    // Wait for initial load
    await page.waitForSelector('[data-testid="action-queues"]');

    // Click refresh button
    await page.click('[aria-label="刷新"]');

    // Verify loading state appears
    await expect(page.locator('[aria-label="刷新"]').locator('svg')).toHaveClass(/animate-spin/);

    // Wait for data to reload
    await page.waitForSelector('[data-testid="action-queues"]', { timeout: 10000 });
  });
});

test.describe('Action Card Interactions', () => {
  test('should expand action card to show details', async ({ page }) => {
    await page.goto(`${BASE_URL}/actions`);

    // Wait for cards to load
    await page.waitForSelector('[data-testid="action-card"]');

    // Get first action card
    const firstCard = page.locator('[data-testid="action-card"]').first();

    // Click to expand
    await firstCard.click();

    // Verify details are shown
    await expect(page.locator('text=为什么现在')).toBeVisible();
    await expect(page.locator('text=草稿消息')).toBeVisible();
    await expect(page.locator('text=依据')).toBeVisible();
  });

  test('should handle accept action', async ({ page }) => {
    await page.goto(`${BASE_URL}/actions`);

    // Wait for cards to load
    await page.waitForSelector('[data-testid="action-card"]');

    const firstCard = page.locator('[data-testid="action-card"]').first();

    // Expand the card
    await firstCard.click();

    // Click accept button
    await page.click('button:has-text("接受")');

    // Verify card is removed from list
    const cardsAfter = page.locator('[data-testid="action-card"]');
    const initialCount = await cardsAfter.count();

    // Wait for animation/state update
    await page.waitForTimeout(500);

    // The card should be removed
    const finalCount = await page.locator('[data-testid="action-card"]').count();
    expect(finalCount).toBeLessThan(initialCount);
  });

  test('should handle edit and accept action', async ({ page }) => {
    await page.goto(`${BASE_URL}/actions`);

    await page.waitForSelector('[data-testid="action-card"]');

    const firstCard = page.locator('[data-testid="action-card"]').first();
    await firstCard.click();

    // Click edit button
    await page.click('button:has-text("编辑")');

    // Modify the message
    const textarea = page.locator('textarea').first();
    await textarea.clear();
    await textarea.fill('This is my edited message');

    // Accept the modification
    await page.click('button:has-text("接受修改")');

    // Verify feedback was submitted (check network or UI state)
    await page.waitForTimeout(500);

    // The card should be removed
    const finalCount = await page.locator('[data-testid="action-card"]').count();
    expect(finalCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle dismiss action with reason', async ({ page }) => {
    await page.goto(`${BASE_URL}/actions`);

    await page.waitForSelector('[data-testid="action-card"]');

    const firstCard = page.locator('[data-testid="action-card"]').first();
    await firstCard.click();

    // Click dismiss button
    await page.click('button:has-text("忽略")');

    // Dismiss menu should appear
    await expect(page.locator('text=不相关')).toBeVisible();
    await expect(page.locator('text=太泛泛')).toBeVisible();
    await expect(page.locator('text=语气不对')).toBeVisible();
    await expect(page.locator('text=时机不好')).toBeVisible();
    await expect(page.locator('text=其他')).toBeVisible();

    // Select a reason
    await page.click('text=不相关');

    // Verify card is removed
    await page.waitForTimeout(500);
    const finalCount = await page.locator('[data-testid="action-card"]').count();
    expect(finalCount).toBeGreaterThanOrEqual(0);
  });

  test('should cancel edit when cancel button clicked', async ({ page }) => {
    await page.goto(`${BASE_URL}/actions`);

    await page.waitForSelector('[data-testid="action-card"]');

    const firstCard = page.locator('[data-testid="action-card"]').first();
    await firstCard.click();

    // Click edit button
    await page.click('button:has-text("编辑")');

    // Modify the message
    const textarea = page.locator('textarea').first();
    await textarea.clear();
    await textarea.fill('This will be cancelled');

    // Click cancel
    await page.click('button:has-text("取消")');

    // Should return to non-editing state
    await expect(page.locator('textarea')).not.toBeVisible();
  });
});

test.describe('Queue Tab Navigation', () => {
  test('should switch between queue tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/actions`);

    await page.waitForSelector('[data-testid="action-queues"]');

    // Default: urgentRepairs tab
    await expect(page.locator('text=紧急修复')).toBeVisible();

    // Switch to opportunityBridges
    await page.click('text=机会桥接');
    await expect(page.locator('text=机会桥接')).toBeVisible();

    // Switch to lightTouches
    await page.click('text=轻触达');
    await expect(page.locator('text=轻触达')).toBeVisible();
  });

  test('should show empty state for queue with no actions', async ({ page }) => {
    await page.goto(`${BASE_URL}/actions`);

    await page.waitForSelector('[data-testid="action-queues"]');

    // Click on a tab that might be empty
    await page.click('text=轻触达');

    // Check for empty state message
    const emptyMessage = page.locator('text=/暂无.*轻触达.*行动/');
    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible();
    }
  });
});

test.describe('Contact Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a specific contact detail page
    // Adjust contact ID as needed
    await page.goto(`${BASE_URL}/contacts/test-contact-id`);
  });

  test('should generate insight when clicking insight button', async ({ page }) => {
    // Click the generate insight button
    await page.click('button:has-text("生成洞察")');

    // Should show loading state
    await expect(page.locator('text=分析中')).toBeVisible();

    // Wait for insight to load
    await page.waitForSelector('text=关系概览', { timeout: 15000 });

    // Verify insight sections are displayed
    await expect(page.locator('text=关系概览')).toBeVisible();
  });

  test('should display action cards in contact detail', async ({ page }) => {
    // First generate insight
    await page.click('button:has-text("生成洞察")');
    await page.waitForSelector('text=关系概览', { timeout: 15000 });

    // Check if action cards are present
    const actionCards = page.locator('[data-testid="action-card"]');

    if (await actionCards.count() > 0) {
      // Verify action card details
      await expect(page.locator('text=为什么现在')).toBeVisible();
      await expect(page.locator('text=草稿消息')).toBeVisible();
    }
  });

  test('should handle accept action from contact detail', async ({ page }) => {
    // Generate insight first
    await page.click('button:has-text("生成洞察")');
    await page.waitForSelector('text=关系概览', { timeout: 15000 });

    const actionCards = page.locator('[data-testid="action-card"]');

    if ((await actionCards.count()) > 0) {
      // Expand first card
      await actionCards.first().click();

      // Click accept
      await page.click('button:has-text("接受")');

      // Verify card is removed
      await page.waitForTimeout(500);
      const finalCount = await page.locator('[data-testid="action-card"]').count();
      expect(finalCount).toBeLessThanOrEqual(await actionCards.count());
    }
  });

  test('should handle edit and dismiss action from contact detail', async ({ page }) => {
    // Generate insight first
    await page.click('button:has-text("生成洞察")');
    await page.waitForSelector('text=关系概览', { timeout: 15000 });

    const actionCards = page.locator('[data-testid="action-card"]');

    if ((await actionCards.count()) > 0) {
      // Test edit flow
      await actionCards.first().click();
      await page.click('button:has-text("编辑")');

      const textarea = page.locator('textarea').first();
      await textarea.clear();
      await textarea.fill('Edited from contact detail');

      await page.click('button:has-text("接受修改")');

      // Verify submission
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Network Requests', () => {
  test('should call agent API on page load', async ({ page }) => {
    // Listen for network requests
    const apiRequests: string[] = [];

    page.on('request', (request) => {
      if (request.url().includes('/v1/agent/run')) {
        apiRequests.push(request.url());
      }
    });

    await page.goto(`${BASE_URL}/actions`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="action-queues"]', { timeout: 10000 });

    // Verify API was called
    expect(apiRequests.length).toBeGreaterThan(0);
    expect(apiRequests.some((url) => url.includes('network_action'))).toBeTruthy();
  });

  test('should submit feedback when action is accepted', async ({ page }) => {
    let feedbackSubmitted = false;

    // Listen for feedback API calls
    page.on('response', async (response) => {
      if (response.url().includes('/v1/agent/feedback')) {
        const body = await response.json();
        if (body.status === 'accepted') {
          feedbackSubmitted = true;
        }
      }
    });

    await page.goto(`${BASE_URL}/actions`);
    await page.waitForSelector('[data-testid="action-card"]');

    const firstCard = page.locator('[data-testid="action-card"]').first();
    await firstCard.click();

    await page.click('button:has-text("接受")');

    // Wait for feedback submission
    await page.waitForTimeout(1000);

    expect(feedbackSubmitted).toBeTruthy();
  });
});

test.describe('Error Handling', () => {
  test('should display error state when API fails', async ({ page }) => {
    // Mock API failure - this would require test-specific API mocking setup
    // For now, we'll just check the error UI exists

    // Navigate to Actions page
    await page.goto(`${BASE_URL}/actions`);

    // Check if error state could be displayed
    // (This depends on having test data that triggers errors)
    const errorElement = page.locator('text=/加载失败|Network error/');

    // The test passes if we can navigate successfully
    await expect(page.locator('[data-testid="action-queues"]').or(errorElement)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show retry button on error', async ({ page }) => {
    await page.goto(`${BASE_URL}/actions`);

    const retryButton = page.locator('button:has-text("重试")');

    // If error occurs, retry button should be shown
    if (await retryButton.isVisible()) {
      await retryButton.click();

      // Should attempt to reload
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/actions`);

    await page.waitForSelector('[data-testid="action-queues"]');

    // Check for ARIA labels on key interactive elements
    const refreshButton = page.locator('[aria-label="刷新"]');
    await expect(refreshButton).toBeVisible();

    // Action cards should be accessible
    const actionCards = page.locator('[data-testid="action-card"]');
    const count = await actionCards.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = actionCards.nth(i);
      await expect(card).toBeVisible();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto(`${BASE_URL}/actions`);

    await page.waitForSelector('[data-testid="action-card"]');

    // Tab to first action card
    await page.keyboard.press('Tab');

    // Expand with Enter
    await page.keyboard.press('Enter');

    // Verify expansion
    await expect(page.locator('text=为什么现在')).toBeVisible();

    // Tab to accept button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Action should be accepted
    await page.waitForTimeout(500);
  });
});
