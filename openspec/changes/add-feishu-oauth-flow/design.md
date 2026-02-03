## Context
We need a server-side OAuth 2.0 flow for Feishu. The current server is a minimal Express app with no persistence layer or auth framework.

## Goals / Non-Goals
- Goals: secure authorization initiation, callback handling, token storage, and refresh; simple integration without a full auth system.
- Non-Goals: user management, multi-tenant admin UI, or full Feishu API integration beyond token lifecycle.

## Decisions
- Decision: Implement OAuth endpoints in the Express server and keep logic in a dedicated Feishu auth module.
- Decision: Use a lightweight token store with pluggable persistence (file-backed JSON by default) to avoid adding a database dependency.
- Decision: Validate `state` for CSRF protection and store it with short TTL.

## Risks / Trade-offs
- File-based token storage is not suitable for multi-instance deployments. Mitigation: abstract storage to allow swapping to a DB later.
- Missing test framework may limit automated coverage. Mitigation: provide curl examples and keep functions pure for later tests.

## Migration Plan
- No data migration required; introduces new config and token storage file.

## Open Questions
- Should tokens be stored per-user (multi-tenant) or single workspace-wide token?
- Preferred persistence: JSON file, SQLite, or external DB?
