## Context
AI replies are generated in multiple services without any source attribution. We need a backend mechanism to attach and persist citations for user-facing AI outputs.

## Goals / Non-Goals
- Goals:
  - Store AI reply text with structured citations in the database.
  - Expose citations in API responses for client rendering.
  - Keep citation generation deterministic based on known source records.
- Non-Goals:
  - Full RAG pipeline or web browsing sources.
  - Frontend rendering changes.

## Decisions
- Decision: Introduce `AiReply` and `AiCitation` entities.
  - `AiReply`: id, type (briefing|recommendation), content, userId, contactId?, createdAt
  - `AiCitation`: id, replyId, sourceType (conversation|event|contact), sourceId, label, snippet?, createdAt
- Decision: Extend AI generation flow to accept a list of sources and produce citation markers like [1], [2].
- Decision: Return `{ content, citations }` from AI endpoints instead of raw strings.

## Risks / Trade-offs
- Storing reply content may duplicate data, but enables audit and UI display.
- Citation markers require prompt discipline; fallback to server-generated mapping if model omits them.

## Migration Plan
- Add new entities and rely on TypeORM `synchronize` for dev environments.
- Backfill is not required for existing replies (none persisted today).

## Open Questions
- Which endpoints must include citations initially (briefings only, or action recommendations too)?
- Do we need snippet text in citations, or only source identifiers?
