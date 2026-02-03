# Change: Feishu OAuth 2.0 Authorization Flow

## Why
Current server has no Feishu integration, so the app cannot authorize users or access Feishu data. We need a secure OAuth 2.0 flow with token storage and refresh to enable Feishu connectors.

## What Changes
- Add Feishu OAuth 2.0 authorization initiation and callback handling endpoints.
- Exchange authorization code for access/refresh tokens and store them securely.
- Implement token refresh logic for expired/expiring tokens.
- Document required environment variables and setup steps.

## Impact
- Affected specs: feishu-oauth
- Affected code: server routes, configuration, token storage module
- External dependency: Feishu OAuth 2.0 API
