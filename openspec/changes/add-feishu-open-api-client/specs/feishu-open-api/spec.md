## ADDED Requirements
### Requirement: Tenant Access Token Management
The system SHALL retrieve a Feishu tenant access token using the configured app credentials, cache it with an expiry, and refresh it before it expires.

#### Scenario: Token retrieved and cached
- **WHEN** the client needs a token and no valid cached token exists
- **THEN** the system requests a new tenant access token from Feishu
- **AND THEN** the token is cached with its expiry

#### Scenario: Token refreshed before expiry
- **WHEN** the cached token is within the refresh window
- **THEN** the system refreshes the token and updates the cache

### Requirement: Authenticated Feishu Requests
The client SHALL attach the tenant access token to Feishu Open API requests and retry once if the token is invalid or expired.

#### Scenario: Request succeeds with valid token
- **WHEN** a request is sent with a valid cached token
- **THEN** the request is executed with the proper authorization header

#### Scenario: Request retries after token invalid
- **WHEN** a request fails due to token invalidation
- **THEN** the client refreshes the token and retries the request once

### Requirement: Configuration Validation
The system SHALL fail fast when Feishu app credentials are missing or invalid in configuration.

#### Scenario: Missing credentials
- **WHEN** the application starts without Feishu app credentials configured
- **THEN** the system throws a configuration error
