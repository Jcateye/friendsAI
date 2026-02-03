## 1. Implementation
- [ ] 1.1 Add Feishu OAuth config (app id/secret, redirect uri, scopes) and validation
- [ ] 1.2 Implement authorization initiation endpoint (build authorize URL + state)
- [ ] 1.3 Implement callback endpoint (state validation + code exchange)
- [ ] 1.4 Persist tokens in a storage layer and expose read/write helpers
- [ ] 1.5 Implement token refresh workflow and expiry checks
- [ ] 1.6 Add minimal API surface to query connection status

## 2. Documentation
- [ ] 2.1 Document environment variables and local setup steps
- [ ] 2.2 Add example curl flow for auth + refresh
