## ADDED Requirements
### Requirement: AI reply citations
The system SHALL include source citations with AI replies and persist them for later retrieval.

#### Scenario: Briefing response includes citations
- **WHEN** a briefing is generated for a contact
- **THEN** the response includes citations linked to the source records used
- **AND** the reply and citations are stored in the database

### Requirement: Citation metadata
The system SHALL store citation metadata identifying the source type and source record.

#### Scenario: Store source identifiers
- **WHEN** citations are created for an AI reply
- **THEN** each citation stores the source type and source ID

### Requirement: Citation delivery
The system SHALL return citations alongside AI reply content in API responses.

#### Scenario: Client receives citations
- **WHEN** a client requests an AI-generated reply
- **THEN** the API response includes both reply content and citations
