# web-runtime

## ADDED Requirements

### Requirement: FRT-010 Web chat MUST use single runtime entry (useAgentChat)
Web 聊天系统 MUST 统一通过 `useAgentChat` 作为唯一 runtime 入口。

#### Scenario: 聊天流程统一入口
- **GIVEN** 用户在 Web 聊天页发送消息
- **WHEN** 前端触发 agent chat 请求
- **THEN** 请求与状态更新路径全部由 `useAgentChat` 管理

### Requirement: FRT-020 Legacy runtime exports MUST be removed
系统 MUST 删除并停止导出 legacy runtime（`FriendsAIRuntime` / `FriendsAIProvider`）。

#### Scenario: legacy runtime 不可用
- **GIVEN** 开发者尝试从 assistant-runtime 导入 legacy runtime
- **WHEN** 执行构建或类型检查
- **THEN** 不存在对应导出，避免回流到旧路径

### Requirement: FRT-030 Build MUST apply route-level lazy loading
前端构建 MUST 应用路由级懒加载与合理 chunk 切分，降低首屏主包体积。

#### Scenario: 路由分片生效
- **GIVEN** 执行 `bun run web:build`
- **WHEN** 检查 `dist/assets`
- **THEN** 页面路由与 vendor 代码以多个 chunk 产出而非单大包

### Requirement: FRT-040 Bundle size guard MUST be added to CI check
CI MUST 对 web bundle 体积执行守卫，并在超限时阻断流程。

#### Scenario: 包体积超限阻断
- **GIVEN** 构建后某 JS chunk 超过 `WEB_BUNDLE_MAX_KB`
- **WHEN** 执行 `bun run web:bundle:check` 或 `bun run test:ci`
- **THEN** 命令以非零状态退出并输出超限文件信息
