## 1. OpenClaw chat 适配

- [ ] 1.1 [ACS-030] 新增 `OpenClawEngine.streamChat()` 与事件映射层（Done When: OpenClaw 分片可转为 `agent.delta`）。
- [ ] 1.2 [ACS-010] 保留 `2:` 事件语义（Done When: `conversation.created` 与 `tool.awaiting_input` 兼容）。

## 2. 回退与稳定性

- [ ] 2.1 [ACS-020] 实现 timeout/5xx fallback（Done When: 故障注入用例触发 fallback 并完成）。
- [ ] 2.2 [ACS-020] 确保失败路径终态一致（Done When: 任意失败均输出 `agent.end`）。

## 3. 测试与验收

- [ ] 3.1 [ACS-010][ACS-030] 增加 adapter/parser 契约测试（Done When: `parseVercelAgentStream.test.ts` 与 adapter 相关单测通过）。
- [ ] 3.2 [ACS-020] 增加 chat fallback 场景测试（Done When: timeout/5xx 场景测试通过）。
- [ ] 3.3 [ACS-010][ACS-020][ACS-030] 执行 OpenSpec 严格校验（Done When: `openspec validate openclaw-chat-adapter-stream-compat --type change --strict --json` 通过）。
