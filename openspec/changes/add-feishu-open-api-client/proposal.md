# Change: Add Feishu Open API client with auto token refresh

## Why
We need a server-side Feishu Open API client to support integrations that require authenticated Feishu requests with automatic token refresh.

## What Changes
- Add a Feishu Open API client service with tenant access token retrieval and caching.
- Implement automatic token refresh and retry on token-expired responses.
- Provide a typed request helper for Feishu Open API endpoints.

## Impact
- Affected specs: feishu-open-api
- Affected code: packages/server-nestjs/src (new feishu module/service), configuration/env handling
