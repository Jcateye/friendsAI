## 1. Artifact completion

- [x] 1.1 补齐 `proposal.md`（Why/What Changes/Non-Goals）
- [x] 1.2 补齐 `design.md`（根因、决策、风险）

## 2. Delta spec backfill

- [x] 2.1 为 `agent-chat-sse` 新增合法 delta（`ADDED`）
- [x] 2.2 为 `network-action-agent` 重写为合法 delta
- [x] 2.3 为 `title-summary-agent` 重写为合法 delta
- [x] 2.4 为 `contact-insight-agent` 重写为合法 delta
- [x] 2.5 为 `archive-brief-agent` 重写为合法 delta

## 3. Validation and archive

- [x] 3.1 运行 `openspec validate openspec-spec-sync-backfill-20260219 --strict`
- [x] 3.2 归档 change（不使用 `--skip-specs`），确认主 specs 同步成功
