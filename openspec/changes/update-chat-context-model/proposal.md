# Change: Add contextual chat sessions and messages

## Why
Current chat UX does not manage multi-turn context as a real session/message model. Users expect GPT-like multi-turn conversations with contextual continuity and message history.

## What Changes
- Introduce chat session and message data model for storing multi-turn conversations
- Add API endpoints for session creation, message append, and message list
- Update client to use session/message model for chat rendering and AI replies
- Preserve existing AI parsing page as a separate workflow

## Impact
- Affected specs: chat
- Affected code: server models/repos/routes, client conversation page, API client, local cache
- Data: new tables or storage for sessions/messages
