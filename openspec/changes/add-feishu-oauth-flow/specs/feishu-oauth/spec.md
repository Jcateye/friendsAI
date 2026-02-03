## ADDED Requirements
### Requirement: Feishu OAuth Authorization Initiation
The system SHALL provide an endpoint to initiate Feishu OAuth 2.0 authorization by returning an authorization URL with required parameters (app id, redirect uri, scopes, and state).

#### Scenario: Start authorization
- **WHEN** a client requests authorization initiation
- **THEN** the response includes an authorization URL and a server-generated state value stored with a short TTL

### Requirement: Feishu OAuth Callback Handling
The system SHALL handle the OAuth callback by validating the state and exchanging the authorization code for access and refresh tokens.

#### Scenario: Successful callback
- **WHEN** Feishu redirects back with a valid code and matching state
- **THEN** the system exchanges the code for tokens and stores them

#### Scenario: Invalid callback
- **WHEN** the callback state is missing, expired, or mismatched
- **THEN** the system rejects the request with an error response

### Requirement: Token Storage
The system SHALL persist Feishu access and refresh tokens with their expiry metadata in a storage layer.

#### Scenario: Persist tokens after exchange
- **WHEN** the code exchange succeeds
- **THEN** the token store contains access_token, refresh_token, and expires_at

### Requirement: Token Refresh
The system SHALL refresh access tokens using the refresh token and update the stored token record before or upon expiry.

#### Scenario: Refresh expired token
- **WHEN** a token is expired and refresh is requested
- **THEN** the system obtains a new access token and updates the store

### Requirement: Connection Status
The system SHALL provide an endpoint to query Feishu connection status and token expiry information.

#### Scenario: Query connection status
- **WHEN** a client requests status
- **THEN** the response indicates connected/disconnected and includes token expiry if available
