# Ralph Agent Log

This file tracks what each agent run has completed. Append your changes below.

---

## 2026-02-01 - MVP polish (auth auto-login, tool results, dev setup)

**Task:** Make MVP smoother to run and observe tool execution results

**Changes:**

- `packages/server/src/application/usecases/authUsecases.ts` - Register now issues access/refresh tokens (auto-login)
- `packages/client/src/pages/login/index.tsx` - Register stores tokens + redirects to conversation
- `packages/server/src/infrastructure/ai/openaiCompat.ts` - Extraction uses structured output with runtime schema validation; invalid output returns empty list
- `packages/server/src/worker.ts` - Record real tool provider name + mark tasks failed on error; record execution on exceptions
- `packages/server/src/presentation/http/routes/toolTasks.ts` - Tool task list supports more statuses + executions endpoint
- `packages/server/src/infrastructure/repositories/contextRepo.ts` - List tool tasks (with latest execution) + list tool executions (workspace scoped)
- `packages/client/src/pages/action/index.tsx` - Show recent tool execution results and view details
- `docs/dev-setup.md` + `docker-compose.dev.yml` - One-command dev DB + runbook

**Verification:** `npm run build` (client+server) passes (client has size warnings only).

**Notes:** E2E runtime (Postgres/worker) still requires Docker Desktop running locally.

## 2026-01-31 - Core backend + client integration

**Task:** Implement core flows and wire frontend to backend

**Changes:**

- `docs/user-stories/*` - Added core user stories and marked passing
- `scripts/verify-user-stories.js` - Story format verifier
- `scripts/ralph/*` - Ralph loop scaffolding
- `packages/server/src/presentation/http/routes/context.ts` - Workspace guard on contact context/brief
- `packages/server/src/presentation/http/routes/journal.ts` - Workspace guard on confirm
- `packages/client/src/services/api.ts` - Real API integration
- `packages/client/src/pages/login/index.tsx` - Auth with register/login
- `packages/client/src/pages/conversation/*.tsx` - Journal flow + AI extract confirm
- `packages/client/src/pages/contact-detail/index.tsx` - Brief/context integration
- `packages/client/src/pages/action/index.tsx` - Open actions list

**Status:** Completed

**Notes:** UI still minimal; add create contact UI and tool execution UI if needed.

---
## 2026-02-01 - Chat flow + Feishu tool call UI

**Task:** Implement default chat flow, AI entry, and Feishu template tool call with backend mock

**Changes:**

- `packages/client/src/pages/conversation-chat/index.tsx` - New multi-turn chat UI with AI trigger + tool card
- `packages/client/src/pages/conversation-chat/index.scss` - Chat layout and tool call status styles
- `packages/client/src/pages/conversation/index.tsx` - Navigate to chat page after send
- `packages/client/src/components/BottomSheet/index.tsx` - Template loading/empty state + reset
- `packages/client/src/services/api.ts` - Feishu templates + send API
- `packages/server/src/presentation/http/routes/feishu.ts` - Mock Feishu endpoints
- `packages/server/src/presentation/http/router.ts` - Feishu routes mount
- `docs/user-stories/chat-feishu-tool.json` - Added user stories (passing)

**Status:** Completed

**Notes:** Feishu tool execution is mocked; hook to real provider/worker later.

---
## 2026-02-01 - Contextual chat sessions/messages

**Task:** Implement chat session/message model with contextual replies

**Changes:**

- `packages/server/migrations/005_chat.sql` - Added chat_session and chat_message tables
- `packages/server/src/infrastructure/repositories/chatRepo.ts` - Chat session/message repository
- `packages/server/src/presentation/http/routes/chat.ts` - Chat APIs with contextual reply + tool suggestion
- `packages/server/src/presentation/http/router.ts` - Mounted /chat routes
- `packages/client/src/services/api.ts` - chatApi + mapping for sessions/messages
- `packages/client/src/pages/conversation/index.tsx` - Chat UI uses session/message model with context + tool calls
- `docs/user-stories/chat-context.json` - Marked passing

**Status:** Completed

**Notes:** Assistant replies are rule-based but contextual to prior user message.

---
