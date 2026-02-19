## 1. API 与类型

- [x] 1.1 [FDS-010] 在 web `types.ts/client.ts` 增加 skills catalog 类型与接口。
- [x] 1.2 [FDS-020] 扩展 `AgentComposerContext` 前后端类型支持 `skillActionId/rawInputs`。

## 2. 页面接入

- [x] 2.1 [FDS-030] `ConversationDetailPage` 动态拉取 catalog 并构建 skillActions。
- [x] 2.2 [FDS-040] catalog 失败时 fallback 到硬编码技能动作。

## 3. 回归

- [x] 3.1 [FDS-050] 保持现有聊天协议解析与工具确认流程不回归。
