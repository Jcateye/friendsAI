## Context

chat 是 FriendsAI 用户感知最强的链路，且前端强依赖 `vercel-ai` 行协议与自定义 `2:` 事件。引入 OpenClaw 必须先保证事件映射兼容，再逐步扩大流量。

## Goals / Non-Goals

**Goals:**
- OpenClaw chat 事件无损映射到现有 `AgentStreamEvent`。
- 保持 `conversation.created` 与 `tool.awaiting_input` 兼容。
- OpenClaw 异常时稳定 fallback local 并输出完整终态。

**Non-Goals:**
- 不扩展 run migration。
- 不重写前端 chat 状态机。

## Decisions

### Decision 1: OpenClaw chat 首选 WS `agent` 方法
- 原因：WS 方法与会话执行语义最贴近，支持流式与会话上下文。
- 备选：`/hooks/agent`。
- 结论：`/hooks/agent` 仅保留为边缘场景，不作为主路径。

### Decision 2: 保持既有事件合同，新增字段只做可选扩展
- 保留 `agent.start/delta/message/tool.state/agent.end`。
- `2:` 事件保持 `conversation.created` 与 `tool.awaiting_input`。
- 可增加 `metadata.engine=openclaw`，但不得破坏旧解析。

### Decision 3: fallback 触发标准化
- timeout/network/5xx 触发 fallback 到 local。
- fallback 后必须补发 `agent.end`，防止前端悬挂。

## Contracts

- External API: `POST /v1/agent/chat` 不变。
- Stream contract: `X-Vercel-AI-Data-Stream: v1` 不变。
- Compatibility: parser 在未知字段时必须忽略。

## Edge Cases

1. OpenClaw 首包慢：仍输出 `agent.start` 并保持心跳。
2. OpenClaw 中途断流：fallback 或失败终态必须包含 `agent.end`。
3. tool awaiting_input 中字段缺失：使用兼容降级字段映射。

## Security

1. 不向前端泄露 OpenClaw 网关 token。
2. 仅透传必要业务字段，屏蔽敏感 headers。

## Risks / Trade-offs

- [Risk] 事件映射层复杂度上升 → Mitigation: 增加 adapter 和 parser 契约测试。
- [Risk] fallback 可能引入重复消息 → Mitigation: runId 去重 + 终态幂等。

## Rollout-Rollback

### Rollout
1. 小流量用户开启 openclaw chat。
2. 观察首 token 延迟、失败率、fallback 率。

### Rollback
1. 灰度开关关闭，全部回到 local。

## Open Questions

1. OpenClaw 工具事件与 FriendsAI tool.state 的最细粒度映射范围。
