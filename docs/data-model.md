# FriendsAI Data Model (Postgres)

## Conventions
- All tables include: id (uuid), created_at, updated_at
- Soft delete via deleted_at
- Multi-tenant isolation via workspace_id
- Offline sync: client_id, client_change_id, version
- Confidence fields use numeric(4,3) 0..1
- JSON fields use jsonb

## Core Tables

### user
- id uuid pk
- email text unique null
- phone text unique null
- name text
- settings jsonb
- created_at timestamptz
- updated_at timestamptz
- deleted_at timestamptz null

Indexes
- unique(email)
- unique(phone)

### workspace
- id uuid pk
- name text
- created_at timestamptz
- updated_at timestamptz
- deleted_at timestamptz

### workspace_member
- id uuid pk
- workspace_id uuid fk -> workspace
- user_id uuid fk -> user
- role text
- created_at timestamptz
- updated_at timestamptz

Indexes
- unique(workspace_id, user_id)

### device_session
- id uuid pk
- user_id uuid fk
- workspace_id uuid fk
- client_id text
- last_sync_cursor text
- created_at timestamptz
- updated_at timestamptz

## Contacts

### contact
- id uuid pk
- workspace_id uuid fk
- name text
- avatar_url text
- notes text
- status text
- version int default 1
- client_id text null
- client_change_id text null
- created_at timestamptz
- updated_at timestamptz
- deleted_at timestamptz

Indexes
- (workspace_id, updated_at)

### contact_identity
- id uuid pk
- contact_id uuid fk
- type text
- value text
- created_at timestamptz
- updated_at timestamptz

Indexes
- unique(contact_id, type, value)

### tag
- id uuid pk
- workspace_id uuid fk
- name text

Indexes
- unique(workspace_id, name)

### contact_tag
- id uuid pk
- contact_id uuid fk
- tag_id uuid fk

Indexes
- unique(contact_id, tag_id)

## Journal / Conversation

### journal_entry
- id uuid pk
- workspace_id uuid fk
- author_id uuid fk -> user
- raw_text text
- status text (new|processed)
- created_at timestamptz
- updated_at timestamptz
- client_id text null
- client_change_id text null
- deleted_at timestamptz

Indexes
- (workspace_id, created_at desc)

### journal_entry_contact
- id uuid pk
- journal_entry_id uuid fk
- contact_id uuid fk
- confidence numeric(4,3)

Indexes
- (journal_entry_id)
- (contact_id)

### extracted_item
- id uuid pk
- journal_entry_id uuid fk
- type text (event|fact|action)
- payload_json jsonb
- status text (proposed|confirmed|rejected)
- created_at timestamptz
- updated_at timestamptz

Indexes
- (journal_entry_id, status)

## Structured Derivatives

### event
- id uuid pk
- contact_id uuid fk
- occurred_at timestamptz
- summary text
- source_entry_id uuid fk -> journal_entry
- created_at timestamptz
- updated_at timestamptz

Indexes
- (contact_id, occurred_at desc)

### fact
- id uuid pk
- contact_id uuid fk
- key text
- value text
- confidence numeric(4,3)
- source_entry_id uuid fk -> journal_entry
- created_at timestamptz
- updated_at timestamptz

Indexes
- (contact_id, key)

### action_item
- id uuid pk
- contact_id uuid fk
- due_at timestamptz null
- status text (open|done|dismissed)
- suggestion_reason text
- source_entry_id uuid fk -> journal_entry
- created_at timestamptz
- updated_at timestamptz

Indexes
- (contact_id, status)
- (due_at)

## Brief

### brief_snapshot
- id uuid pk
- contact_id uuid fk
- content text
- generated_at timestamptz
- source_hash text
- created_at timestamptz

Indexes
- (contact_id, generated_at desc)
- unique(contact_id, source_hash)

## Context Retrieval

### embedding
- id uuid pk
- scope text (journal_entry|fact|event)
- ref_id uuid
- vector vector(1536)
- updated_at timestamptz

Indexes
- ivfflat (vector) with appropriate list size
- (scope, ref_id)

## Tool Calling

### tool_task
- id uuid pk
- action_item_id uuid fk
- type text (sms|email|calendar|webhook)
- payload_json jsonb
- execute_at timestamptz null
- status text (pending|confirmed|running|done|failed)
- created_at timestamptz
- updated_at timestamptz

Indexes
- (status, execute_at)

### tool_execution
- id uuid pk
- tool_task_id uuid fk
- provider text
- request_json jsonb
- response_json jsonb
- status text (success|error)
- created_at timestamptz

Indexes
- (tool_task_id)

## Sync (Offline)

### sync_change_log
- id uuid pk
- workspace_id uuid fk
- entity text
- entity_id uuid
- op text (upsert|delete)
- data jsonb
- version int
- created_at timestamptz

Indexes
- (workspace_id, created_at)

### sync_state
- id uuid pk
- workspace_id uuid fk
- user_id uuid fk
- client_id text
- last_cursor text
- updated_at timestamptz

Indexes
- unique(workspace_id, user_id, client_id)

## Notes
- Use RLS or app-level tenant filters for workspace isolation
- Keep JournalEntry immutable after creation (except status)
- For conflicts: accept server version if version higher; otherwise update and increment
- Soft delete rows must be filtered in all queries
