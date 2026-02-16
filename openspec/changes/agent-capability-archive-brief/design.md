# Design: archive_brief Capability

## 1. Goals

- 用一个 capability 统一归档与简报能力
- 通过 operation 区分行为，减少能力碎片化

## 2. Boundaries

### 2.1 独占路径
- `packages/server-nestjs/src/agent/capabilities/archive_brief/**`

### 2.2 不可改路径
- controller/module/shared bridge 文件

## 3. Interfaces

### 3.1 Operation: archive_extract
- Input: `{ conversationId: string }`
- Output: `{ id, status, summary, payload }`

### 3.2 Operation: brief_generate
- Input: `{ contactId: string }`
- Output: `{ id, contact_id, content, generated_at, source_hash }`

## 4. Data Flow

input -> context builder -> prompt render -> memory inject -> llm -> output validate -> snapshot write

## 5. Failure Modes

1. conversation/contact 不存在
2. 输出不满足 operation 对应 schema
3. 缓存命中数据结构不合法

## 6. Test Plan

- operation 路由正确性
- 双 operation 输出 schema 校验
- 缓存命中与强制刷新
