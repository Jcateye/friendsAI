## Context

Web 端目前具备完整聊天与 Agent 调用能力，但历史遗留 runtime 导致同类逻辑多份实现，协议处理难统一，且构建体积在移动端首屏场景存在压力。本设计统一运行入口并加入构建质量守卫。

## Goals / Non-Goals

**Goals:**
- 保留 `useAgentChat` 作为唯一 runtime 入口。
- 将流协议解析下沉为独立 parser，提升可测性。
- 通过路由懒加载 + chunk 拆分降低首屏主包。
- 在 CI 增加 bundle size guard 防回退。

**Non-Goals:**
- 不改 API contract（仍由 `/v1/agent/chat` 与 `/v1/agent/run` 提供能力）。
- 不重写全站状态管理。
- 不做 UI 视觉层改造。

## Decisions

### Decision 1: 单 runtime 路径（FRT-010/FRT-020）
- 方案：删除 `FriendsAIRuntime/FriendsAIProvider`，仅保留 `useAgentChat`。
- 兼容策略：统一在 hook 内处理会话、流和动作，不再维护双轨。
- 备选方案：保留 deprecated 导出一段时间。
  - 未选原因：双轨会持续制造行为分叉和测试负担。

### Decision 2: 协议解析器独立（FRT-010）
- 方案：新增 `parseVercelAgentStream.ts`，hook 仅保留状态机逻辑。
- 备选方案：继续在 hook 内联解析。
  - 未选原因：难以复用 fixture 与做独立契约测试。

### Decision 3: 路由与构建性能优化（FRT-030）
- 方案：`routes.tsx` 页面懒加载，`vite.config.ts` 配置 `manualChunks`。
- 备选方案：仅靠 tree-shaking。
  - 未选原因：无法显式控制初始 chunk 边界。

### Decision 4: CI 包体积守卫（FRT-040）
- 方案：增加 `scripts/check-web-bundle-size.js`，在 `test:ci` 执行 `web:build` 后校验单 chunk 上限。
- 备选方案：人工观察 build 输出。
  - 未选原因：不可持续、无法自动阻断回退。

### Contracts

- `useAgentChat` MUST 是 Web 聊天运行时唯一入口。
- Legacy runtime exports MUST 被移除。
- Build MUST 产出路由级 chunk。
- CI MUST 执行 bundle size guard。

### Edge Cases

- 网络中断导致流半包：parser 要求具备增量缓冲能力。
- 首跳进入懒加载路由：需有 Suspense fallback。
- chunk 文件名变更：bundle guard 不能依赖固定文件名。

### Security

- runtime 收敛不改变鉴权边界。
- parser 不记录敏感 token 到日志。
- bundle guard 仅读取构建产物元数据，不触达用户数据。

## Risks / Trade-offs

- [Risk] 删除 legacy runtime 触发隐藏 import 错误 -> Mitigation: `rg` 全仓扫描 + build 验证。
- [Risk] 过度拆 chunk 增加请求数 -> Mitigation: 维持 vendor 粗粒度 chunk，而非每组件拆分。
- [Risk] bundle guard 阈值不合理导致 CI 噪音 -> Mitigation: 通过 `WEB_BUNDLE_MAX_KB` 可配置阈值。

## Migration Plan

1. 删除 legacy runtime 文件与导出，统一入口到 `useAgentChat`。
2. 新建 parser 并替换 hook 内联解析。
3. 开启路由懒加载与 manualChunks。
4. 接入 `web:bundle:check` 到 `test:ci`。

Rollback:
- 前端兼容异常时回滚前端包版本。
- bundle guard 可先提高阈值，随后再逐步收紧。

## Open Questions

- 后续是否需要把 bundle guard 改为 gzip/brotli 体积阈值而非原始 chunk 大小。
