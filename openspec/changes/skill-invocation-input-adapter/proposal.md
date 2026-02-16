## Why

聊天入口目前只做 composer 清洗，未对 skill 意图做统一解析，导致前端硬编码动作无法演进为多输入统一触发模式。

## Intent

在 `/v1/agent/chat` 增加 Skill Invocation Input Adapter，把多形态输入统一解析为 `SkillInvocationIntent`，支持日志模式与执行模式。

## Scope

- 新增 skill parser 服务。
- 支持四类输入：composer action、slash、skill codeblock、自然语言。
- 新增 parse debug API。
- parse 结果写审计日志。

## Non-Goals

- 不替换现有消息流协议。
- 不做复杂 LLM parser 微调。

## Acceptance

- 主入口输入可稳定解析为统一 intent。
- 歧义场景返回 awaiting_selection。
- parse 失败统一 400 语义（debug API）且主链路不 500。
