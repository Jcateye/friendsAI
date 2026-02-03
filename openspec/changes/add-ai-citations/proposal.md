# Change: Add source citations for AI replies

## Why
AI replies need traceable sources for trust, review, and debugging. Persisting citations also enables auditing and UI rendering.

## What Changes
- Generate source citations alongside AI replies.
- Persist AI replies and their citations to the database.
- Return citations with AI reply payloads for client rendering.

## Impact
- Affected specs: ai-citations (new)
- Affected code: AI service, briefings, action panel, database entities
