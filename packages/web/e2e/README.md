# E2E Tests for Agent Action Cards

This directory contains end-to-end tests for the Agent Action Cards enhancement feature.

## Test Files

### Backend E2E Tests
- **Location**: `packages/server-nestjs/test/e2e/agent-action-cards.e2e-spec.ts`
- **Framework**: Jest/NestJS Testing
- **Coverage**:
  - `network_action` agent output validation (queues, weekly plan, whyNow, evidence)
  - `contact_insight` agent output validation (action cards, relationship state, moment signals)
  - Feedback API (accept, edit, dismiss with reasons)
  - Cross-agent feedback tracking
  - Edge cases (empty queues, non-existent actions, concurrent feedback)

### Frontend E2E Tests
Two test files are provided:

#### 1. Component Tests (Vitest + Testing Library)
- **Location**: `packages/web/e2e/action-cards.spec.ts`
- **Framework**: Vitest + @testing-library/react
- **Run**: `npm run test -- packages/web/e2e/action-cards.spec.ts`
- **Coverage**:
  - ActionsPage loading and rendering
  - ActionCard display and interactions (accept, edit, dismiss)
  - ActionQueue tab navigation
  - Feedback submission flow
  - Error states

#### 2. Browser Automation Tests (Playwright)
- **Location**: `packages/web/e2e/action-cards.playwright.spec.ts`
- **Framework**: Playwright (requires installation)
- **Setup**: `npm install -D @playwright/test`
- **Run**: `npx playwright test`
- **Coverage**:
  - Full user flows in browser
  - Network request verification
  - Accessibility testing
  - Keyboard navigation

## Running Tests

### Backend Tests

```bash
# From project root
cd packages/server-nestjs

# Run all E2E tests
npm test test/e2e/agent-action-cards.e2e-spec.ts

# Run with coverage
npm test -- --coverage test/e2e/agent-action-cards.e2e-spec.ts
```

### Frontend Tests (Vitest)

```bash
# From project root
cd packages/web

# Run component E2E tests
npm run test e2e/action-cards.spec.ts

# Run with UI
npm run test:ui -- e2e/action-cards.spec.ts
```

### Frontend Tests (Playwright)

First, install Playwright:

```bash
cd packages/web
npm install -D @playwright/test
npx playwright install
```

Then run tests:

```bash
# Run all Playwright tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific file
npx playwright test e2e/action-cards.playwright.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed
```

## Test Scenarios

### Backend Scenarios

1. **Network Action Agent**
   - Returns action queues with whyNow and evidence
   - Returns weekly plan with distributed actions
   - Uses fallback strategy for low data
   - Filters by intent (maintain/grow/repair)
   - Filters by relationship mix (business/friend/mixed)

2. **Contact Insight Agent**
   - Returns action cards with evidence
   - Includes whyNow and evidence fields
   - Includes relationship state and type
   - Includes moment signals when relevant
   - Supports different insight depths

3. **Feedback API**
   - Accepts feedback and updates metrics
   - Calculates edit distance for edited messages
   - Handles dismissal with reason codes
   - Tracks feedback from both agents separately

### Frontend Scenarios

1. **Actions Page**
   - Displays loading state
   - Displays action queues after data loads
   - Displays weekly plan
   - Handles error state
   - Handles refresh button click

2. **Action Card Component**
   - Displays action card details
   - Shows whyNow and evidence when expanded
   - Handles accept action
   - Handles edit and accept action
   - Handles dismiss action with reason
   - Cancels edit when cancel button clicked

3. **Action Queue Component**
   - Displays queue tabs with counts
   - Switches between queue tabs
   - Displays empty state for queue with no actions
   - Displays queue summary with total actions and time
   - Forwards feedback from ActionCard to parent

4. **Feedback Submission Flow**
   - Submits accepted feedback to API
   - Submits edited feedback to API
   - Submits dismissed feedback to API
   - Removes action from UI after successful feedback

## Environment Variables

### Backend
- `DATABASE_URL`: Test database connection string
- `OPENAI_API_KEY`: Required for AI agent testing

### Frontend (Playwright)
- `BASE_URL`: Base URL for tests (default: `http://localhost:10086`)

## Test Data

Tests use the following test data identifiers:
- User ID: `test-action-cards-user`
- Contact ID: `test-action-cards-contact`

Test data is cleaned up before each test run using `cleanupDatabase()`.

## Notes

- Backend tests use the actual NestJS test utilities with in-memory database
- Frontend Vitest tests use component mocking for API calls
- Playwright tests require the dev server to be running on `localhost:10086`
- Tests are designed to be isolated and can run in parallel
