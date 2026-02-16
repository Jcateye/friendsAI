## 1. 流协议契约

- [ ] 1.1 [APO-010] 后端 `vercel-ai` adapter 增加 canonical line protocol 契约测试（Done When: 覆盖 `0:/2:/9:/a:/d:/3:` 事件序列和响应头断言）。
- [ ] 1.2 [APO-020] 前端 parser 增加 `conversation.created` 与 `tool.awaiting_input` 解析测试（Done When: 同一 fixture 在 parser 测试中通过）。
- [ ] 1.3 [APO-010,APO-020] 增加 `/v1/agent/chat?format=vercel-ai` e2e 契约回归（Done When: 断言 `X-Vercel-AI-Data-Stream: v1` 且协议行可解析）。

## 2. runId 观测与指标 API

- [ ] 2.1 [APO-030] 新增 `agent_run_metrics` 实体和迁移（Done When: 可落库 runId/status/cached/duration/errorCode）。
- [ ] 2.2 [APO-030] 新增 `AgentRunMetricsService` 与 `GET /v1/metrics/agents` 聚合（Done When: 返回成功率、缓存命中率、校验失败率、平均耗时、总运行数）。
- [ ] 2.3 [APO-030] `/agent/chat` 与 `/agent/run` 接入统一埋点（Done When: 成功/失败路径均写 run 记录，失败不阻塞主链路）。

## 3. ActionPanel 收敛

- [ ] 3.1 [APO-040] `GET /v1/action-panel/dashboard` 去除 legacy fallback（Done When: controller 仅通过 Runtime 结果组装响应）。
- [ ] 3.2 [APO-040] 对 dashboard 输出来源补单测（Done When: 输出字段可追溯到 runtime output 映射）。
