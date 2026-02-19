# Design: title_summary Capability

## 1. Goals

- 统一会话标题与概要生成能力
- 为异步触发与手动运行提供同一输出契约

## 2. Boundaries

### 2.1 独占路径
- `packages/server-nestjs/src/agent/capabilities/title_summary/**`

## 3. Interface

- Input: `{ userId: string, conversationId: string }`
- Output: `{ conversationId, title, summary, sourceHash, generatedAt }`

## 4. Data Flow

conversation input -> history context -> template render -> llm -> schema validate -> snapshot

## 5. Failure Modes

1. 会话不存在
2. title/summary 为空或超长
3. 输出结构不满足 schema

## 6. Test Plan

- conversation not found
- 正常 title+summary 生成
- schema fail
- ttl 24h cache
