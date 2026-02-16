## 1. Runtime 收敛

- [ ] 1.1 [FRT-010] 保留 `useAgentChat` 作为唯一聊天 runtime 入口（Done When: 聊天相关页面仅通过 `useAgentChat` 发起对话流）。
- [ ] 1.2 [FRT-020] 删除 `FriendsAIRuntime/FriendsAIProvider` 文件与导出（Done When: 仓库搜索不再存在 legacy runtime export）。
- [ ] 1.3 [FRT-010] 抽离 `parseVercelAgentStream` 并补解析测试（Done When: parser 单测覆盖 `conversation.created/tool.awaiting_input`）。

## 2. 性能优化

- [ ] 2.1 [FRT-030] 路由级懒加载改造（Done When: `routes.tsx` 使用 `React.lazy` + `Suspense` 且 `web:build` 出现页面分片）。
- [ ] 2.2 [FRT-030] 配置 `manualChunks`（Done When: build 产物存在稳定 vendor chunk 分组）。
- [ ] 2.3 [FRT-040] 新增 bundle size guard 脚本并接入 CI（Done When: `bun run web:bundle:check` 可在超限时失败退出）。

## 3. 验收与回归

- [ ] 3.1 [FRT-010,FRT-030] 执行 `bun run web:build` 并确认首包体积下降趋势（Done When: 主入口 chunk 小于历史基线）。
- [ ] 3.2 [FRT-040] 在 `test:ci` 路径验证 bundle guard（Done When: CI 命令含 `web:build + web:bundle:check`）。
