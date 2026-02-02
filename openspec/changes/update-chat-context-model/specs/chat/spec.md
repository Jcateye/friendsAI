## ADDED Requirements

### Requirement: Chat session model
The system SHALL store chat conversations as sessions that contain ordered messages with roles.

#### Scenario: Create session
- **WHEN** a user sends the first message in a new chat
- **THEN** the system creates a session and persists the user message

#### Scenario: Resume session
- **WHEN** the user opens the chat page later
- **THEN** the system loads existing session messages in order

### Requirement: Chat message model
The system SHALL persist each user/assistant/tool message with timestamp and role.

#### Scenario: Append message
- **WHEN** a user sends a message within an existing session
- **THEN** the system appends it to the session and returns updated message list

### Requirement: Contextual AI responses
The system SHALL generate assistant responses using prior session messages as context.

#### Scenario: Multi-turn context
- **WHEN** a user asks a follow-up question
- **THEN** the assistant reply reflects prior session content

### Requirement: Tool call messages in sessions
The system SHALL record tool call messages as part of the chat session history.

#### Scenario: Tool call status
- **WHEN** a tool call starts and completes
- **THEN** the session message list shows running/success/failed states
