## 1. Parser

- [x] 1.1 [SIA-010] 新增 `SkillParserService` 与 `SkillInvocationIntent` 类型。
- [x] 1.2 [SIA-020] 支持 composer/slash/codeblock/natural-language 四类解析。
- [x] 1.3 [SIA-030] 增加歧义保护与低风险参数限制。

## 2. 接口集成

- [x] 2.1 [SIA-040] 在 `agent/chat` 前置 parser（log-only/enforce 受 flag 控制）。
- [x] 2.2 [SIA-050] 新增 `POST /v1/skills/parse:debug` 调试入口。
- [x] 2.3 [SIA-060] parse 结果落 `skill_invocation_logs` 审计。
