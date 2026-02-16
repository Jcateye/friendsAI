# FriendsAI Architecture

## Goals & Constraints
- Target: individual / small teams, low cost, easy to maintain
- Data is not simple tables; needs narrative + structured facts
- AI handles parse/summarize/suggest, but human confirmation is required
- Core loop: post-meeting natural language -> AI parse -> user confirm -> structured archive
- Pre-meeting brief is usable in ~5 minutes
- Multi-client (H5/iOS/Android/mini-program), unified backend
- Clean Architecture variant
- Multi-tenant isolation required
- Offline / local-first required
- No export of structured archive + raw + vectors
- Backend stack: Node + TypeScript
- AI must call tools (e.g., reminders, messages)

## Layered Architecture (Clean Architecture Variant)

### Presentation (API)
- HTTP REST (or GraphQL later)
- Auth, input validation, DTO mapping only
- No business logic

### Application (Use Cases)
- Orchestrates transactions, calls AI, repositories, policies
- Idempotency, outbox, and sync handling

### Domain (Entities / Aggregates)
- Pure business rules and invariants
- No I/O, no frameworks

### Infrastructure
- Postgres (pgvector), caches, file storage
- LLM/Embedding providers
- External tool adapters (SMS/email/calendar)

## Modules (Monolith-first, modular-ready)

1) Auth & Tenant
- Users, workspaces, roles, device sessions

2) Contacts
- Contact profile, identities, tags, relationships

3) Journal / Conversation
- Raw entries, conversation threads

4) Action
- Action items, reminders, tool tasks

5) Brief
- Pre-meeting brief generation and caching

6) Context (Core)
- Multi-layer context retrieval and ranking

7) AI Orchestrator
- Unified agent entry + tool routing

8) Sync
- Offline-first sync, conflict resolution, device states

## Core Domain Concepts
- JournalEntry is the source of truth (immutable raw text)
- Structured derivatives (Event/Fact/Action) are traceable via source_entry_id
- ExtractedItem is AI-proposed only until user confirms

## Key Flows

### Post-Meeting Loop
1. Create JournalEntry (raw text)
2. AI Extract -> ExtractedItem (status=proposed)
3. User confirm/edit -> write Event/Fact/Action
4. Update BriefSnapshot and embeddings

### Pre-Meeting Brief
1. Assemble Context (Stable + Dynamic + Action)
2. LLM summarize using fixed prompt
3. Cache BriefSnapshot (re-use within TTL)

### Tool Call (Reminder / Message)
1. AI proposes ActionItem + ToolTask
2. User confirms tool action
3. Worker executes tool task via adapter
4. Persist ToolExecution result

## Context System (Retrieval)

### Context Layers
- Stable Context: profile facts (role, family, preferences)
- Dynamic Context: recent events, commitments, timeline
- Action Context: pending action items and reminders

### Retrieval Strategy
- Exact: recent N events + open actions + top K facts
- Semantic: vector similarity on journal entries + facts
- Merge and dedupe, rank by recency and confidence

## Offline / Local-First Strategy
- Client writes include client_id and client_change_id
- Server upserts and returns authoritative versions
- Conflict resolution by version + updated_at (last-write-wins, with audit)
- Sync cursor per device, delta pull
- Soft deletes via deleted_at for reliable sync

## API (Module-Level Routes + DTOs)

### Auth & Tenant
- POST /v1/auth/login
- POST /v1/auth/refresh
- POST /v1/auth/logout
- GET /v1/me
- POST /v1/workspaces
- GET /v1/workspaces
- POST /v1/workspaces/:id/invite
- PATCH /v1/workspaces/:id/members/:memberId

DTOs
- LoginRequest { emailOrPhone, password }
- SessionResponse { accessToken, refreshToken, user, workspace }
- WorkspaceCreateRequest { name }
- MemberUpdateRequest { role }

### Contacts
- GET /v1/contacts
- POST /v1/contacts
- GET /v1/contacts/:id
- PATCH /v1/contacts/:id
- POST /v1/contacts/:id/identities
- DELETE /v1/contacts/:id/identities/:identityId
- POST /v1/contacts/:id/tags
- DELETE /v1/contacts/:id/tags/:tagId

DTOs
- ContactCreateRequest { name, avatarUrl?, notes?, status? }
- ContactUpdateRequest { name?, avatarUrl?, notes?, status? }
- ContactIdentityRequest { type, value }

### Journal / Conversation
- POST /v1/journal-entries
- GET /v1/journal-entries?contactId=&status=&cursor=
- GET /v1/journal-entries/:id
- POST /v1/journal-entries/:id/extract
- POST /v1/journal-entries/:id/confirm

DTOs
- JournalEntryCreateRequest { workspaceId, contactIds?, rawText, createdAt?, clientChangeId? }
- JournalExtractRequest { mode?: "fast" | "full" }
- ExtractedItemConfirmRequest { itemId, action: "confirm"|"reject"|"edit", payloadJson? }

### Context / Brief
- GET /v1/contacts/:id/context
- POST /v1/contacts/:id/brief
- GET /v1/contacts/:id/brief

DTOs
- ContextResponse { stableFacts, recentEvents, openActions, similarHistory }
- BriefCreateRequest { forceRefresh?: boolean }
- BriefResponse { content, generatedAt, sourceHash }

### Action / Tooling
- POST /v1/action-items
- PATCH /v1/action-items/:id
- POST /v1/action-items/:id/execute
- GET /v1/action-items?status=

DTOs
- ActionItemCreateRequest { contactId, dueAt?, suggestionReason?, sourceEntryId?, toolTask? }
- ToolTaskRequest { type, payloadJson, executeAt? }

### Sync
- POST /v1/sync/push
- GET /v1/sync/pull?cursor=
- GET /v1/sync/state

DTOs
- SyncPushRequest { clientId, changes:[{ entity, op, data, clientChangeId }] }
- SyncPullResponse { nextCursor, changes:[{ entity, op, data }] }

## Application Use Cases (Examples)
- CreateJournalEntry
- ExtractJournalItems
- ConfirmExtractedItems
- UpsertContactIdentity
- GenerateBriefSnapshot
- BuildContactContext
- CreateActionItem
- ExecuteToolTask
- SyncPush
- SyncPull

## AI Orchestrator
- LLMProvider.chat(messages, tools, json_schema)
- Extractor.extract(journal_text) -> ExtractedItem[]
- Summarizer.brief(contact_context) -> brief
- Tool registry + policy gate (only after user confirm)

## Infrastructure Adapters
- Postgres repositories
- pgvector embedding store
- Outbox worker for tool tasks
- SMS/email/calendar adapters (Twilio/SendGrid/Google)

## AI Provider (MVP)

MVP 先支持两种模式：
- `mock`：本地规则解析（不依赖外部 LLM）
- `openai_compat`：OpenAI API 兼容协议（可接多家头部厂商/自建网关/本地 LLM server）

实现方式：使用 Vercel AI SDK 作为统一 Provider 接入层：
- `ai`
- `@ai-sdk/openai-compatible`

Server 侧通过 env 选择：`AI_PROVIDER`，并配置：
- `AI_BASE_URL`（例如你的本地：`http://127.0.0.1:9739/v1`）
- `AI_API_KEY`
- `AI_MODEL`（例如：`gemini-3-flash`）

Embeddings（向量）单独配置（常见：只有 OpenAI 有 embedding key）：
- `EMBEDDING_BASE_URL`
- `EMBEDDING_API_KEY`
- `EMBEDDING_MODEL`（默认 `text-embedding-3-small`；需与 pgvector 维度一致）

## Testing Strategy
- Domain unit tests: rules, transitions
- Use case tests: in-memory repos + fake LLM
- AI contract tests: JSON schema + golden fixtures
- Repository integration tests: real Postgres
