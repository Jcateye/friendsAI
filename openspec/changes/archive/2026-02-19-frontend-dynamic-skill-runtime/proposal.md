## Why

前端当前 skill actions 硬编码在页面内，不利于技能扩展与租户差异化。需要以动态 catalog 为主并保留兼容回退。

## Intent

在 `useAgentChat` 与会话页接入动态 skills catalog，支持服务端驱动 skill action 渲染，同时保持硬编码 fallback。

## Scope

- 前端 API types/client 增加 skills catalog 类型与接口。
- 会话页从动态 catalog 构建 skillActions。
- `useAgentChat` 支持透传 `composer.skillActionId/rawInputs`。
- 动态失败时自动回退到现有硬编码动作。

## Non-Goals

- 不重写聊天组件体系。
- 不改变现有 vercel-ai 流协议解析器语义。

## Acceptance

- catalog 成功时前端按服务端 skill actions 渲染。
- catalog 失败时继续使用硬编码技能。
