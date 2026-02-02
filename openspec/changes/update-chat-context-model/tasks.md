## 1. Implementation
- [ ] Define server-side chat session and chat message schema + repository access
- [ ] Add API endpoints: create/list sessions, append message, list messages
- [ ] Add AI reply endpoint that uses session message context
- [ ] Update client API layer for chat session/message operations
- [ ] Update conversation page to load session + render messages from API
- [ ] Ensure AI reply uses prior context in UI (display assistant response tied to session)
- [ ] Update tool-call flow to attach to message list and show status

## 2. Verification
- [ ] Update/add user stories for contextual chat
- [ ] Verify API responses with sample requests
- [ ] Manually validate multi-turn chat retains context across reload
