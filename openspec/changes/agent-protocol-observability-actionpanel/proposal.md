## Why

当前流协议适配、前端解析、ActionPanel 输出来源与观测追踪缺少统一合同，导致协议演进和运行问题难以快速定位。需要建立协议契约测试与 runId 级观测，并把 ActionPanel 收敛到 Runtime 单一路径。

## Intent

完成 Agent 协议契约、运行观测、ActionPanel 收敛三件事，使链路具备“可验证 + 可追踪 + 可回放”能力。

## Scope

- 建立后端 stream adapter 与前端 parser 的端到端契约测试。
- 增加 runId 级指标实体与聚合 API：`GET /v1/metrics/agents`。
- ActionPanel dashboard 输出仅来源于 runtime（去 legacy fallback）。

## Non-Goals

- 不新增 Agent 能力。
- 不修改 `/v1/agent/chat` 与 `/v1/agent/run` 路径。
- 不引入额外日志平台依赖。

## What Changes

- 增强 `vercel-ai` line protocol 契约测试（后端适配器 + 前端解析 + e2e）。
- 增加 `agent_run_metrics` 落库实体、服务与聚合 API。
- 调整 ActionPanel 主链路，保证 dashboard 与 runtime 输出一致。

## Capabilities

### New Capabilities
- `agent-chat-contract`: 定义并验证 `vercel-ai` 数据流协议合同与前端解析合同。
- `agent-metrics`: 定义 runId 级指标存储、聚合查询与 ActionPanel 数据来源合同。

### Modified Capabilities
- 无。

## Impact

- Affected code:
  - `packages/server-nestjs/src/agent/adapters/**`
  - `packages/server-nestjs/src/action-tracking/**`
  - `packages/server-nestjs/src/action-panel/**`
  - `packages/web/src/lib/agent-stream/**`
- New API:
  - `GET /v1/metrics/agents`

## Risks

- 协议契约收紧后，旧前端解析实现可能出现兼容问题。
- metrics 写入失败若处理不当可能影响主链路延迟。

## Rollback

- metrics 写入失败视为非阻塞，主链路继续返回。
- 若协议兼容异常，回滚前端 parser 与 adapter 改动即可恢复。
- ActionPanel 如有展示问题，可回滚 controller 映射逻辑，不回滚 runtime。

## Acceptance

- `/v1/agent/chat?format=vercel-ai` 返回 `X-Vercel-AI-Data-Stream: v1`。
- 同一 fixture 可被后端适配器与前端 parser 共同消费。
- `GET /v1/metrics/agents` 返回 `successRate/cacheHitRate/validationFailRate/avgDurationMs/totalRuns`。
- `GET /v1/action-panel/dashboard` 输出来源可追溯到 Runtime 结果。
