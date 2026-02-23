## Context

现有前端能力触发路径分散于硬编码按钮，服务端缺失可审计的输入解析层，不利于后续 OpenClaw 技能统一路由。

## Decisions

### Decision 1: 统一目标类型
定义 `SkillInvocationIntent` 作为 parser 唯一输出。

### Decision 2: 固定解析优先级
1. `composer.skillActionId`
2. `/skill` slash
3. ```skill``` code block
4. 自然语言关键词匹配

### Decision 3: 歧义保护
- top1-top2 < 0.10 返回 `awaiting_selection`
- 自然语言仅允许低风险参数，写操作要求显式命令

## Contracts

- `POST /v1/skills/parse:debug`
- `AgentComposerContext` 扩展：`skillActionId?`、`rawInputs?`

## Edge Cases

- slash 参数 JSON 解析失败时回退到 kv 解析。
- codeblock 非 JSON/YAML 时返回 warning，不中断聊天。

## Rollout

- `SKILL_INPUT_PARSER_ENABLED=true|false`
- `SKILL_PARSER_EXECUTE_MODE=log-only|enforce`
