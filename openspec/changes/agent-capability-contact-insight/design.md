# Design: contact_insight Capability

## 1. Goals

- 输出可执行、可解释的单联系人洞察
- 支持引用来源字段，增强可追溯性

## 2. Boundaries

### 2.1 独占路径
- `packages/server-nestjs/src/agent/capabilities/contact_insight/**`

## 3. Interface

- Input: `{ userId: string, contactId: string, depth?: 'brief'|'standard'|'deep' }`
- Output:
  - `profileSummary`
  - `relationshipSignals[]`
  - `opportunities[]`
  - `risks[]`
  - `suggestedActions[]`
  - `openingLines[]`
  - `citations[]`

## 4. Data Flow

contact scope input -> context(contact + recent interactions + facts/todos/events) -> template -> llm -> validate -> snapshot

## 5. Failure Modes

1. contact 不存在或无权限
2. 输出缺关键字段
3. citations 格式不合法

## 6. Test Plan

- contact not found
- normal output
- schema fail
- cache ttl 6h
