## Why

前端同时存在 `useAgentChat` 与 legacy `FriendsAIRuntime/FriendsAIProvider` 两条运行路径，导致协议处理与状态行为分叉。与此同时，主包体积在移动端首屏存在压力，需要立即完成 runtime 收敛与加载优化。

## Intent

形成单一前端 runtime 执行路径，并把性能优化纳入 CI 守卫，避免后续回退到多 runtime 和包体积回涨。

## Scope

- 删除 legacy runtime 文件与导出，仅保留 `useAgentChat`。
- 抽离流协议解析器，hook 仅负责状态和发送。
- 实施路由懒加载与 `manualChunks` 拆分。
- 增加 CI bundle size guard。

## Non-Goals

- 不改动后端 API 入口定义。
- 不重写聊天页面视觉或交互设计。
- 不引入额外前端框架。

## What Changes

- 删除 `FriendsAIRuntime.ts`、`FriendsAIProvider.tsx`。
- 新增 `parseVercelAgentStream.ts` 并接入 `useAgentChat`。
- `routes.tsx` 改为路由级懒加载。
- `vite.config.ts` 增加 `manualChunks`。
- 新增 `web:bundle:check` 并接入 `test:ci`。

## Capabilities

### New Capabilities
- `web-runtime`: 定义 Web 聊天前端 runtime 的单路径合同与构建性能合同。

### Modified Capabilities
- 无。

## Impact

- Affected code:
  - `packages/web/src/hooks/useAgentChat.ts`
  - `packages/web/src/lib/assistant-runtime/**`
  - `packages/web/src/lib/agent-stream/**`
  - `packages/web/src/app/routes.tsx`
  - `packages/web/vite.config.ts`
  - `scripts/check-web-bundle-size.js`

## Risks

- 删除 legacy runtime 后，历史调用点若未迁移可能触发运行时 import 错误。
- 路由懒加载可能引入首跳白屏或 chunk 404 风险。

## Rollback

- 若出现线上兼容问题，可回滚前端包版本到删除前版本。
- bundle guard 阈值可通过 `WEB_BUNDLE_MAX_KB` 临时调整。

## Acceptance

- `useAgentChat` 成为唯一聊天 runtime 入口。
- legacy runtime 文件与导出不存在。
- `bun run web:build` 产出路由分片与 vendor chunk。
- `bun run web:bundle:check` 在 CI 路径生效并可阻断超限构建。
