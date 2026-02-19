# Design: network_action Capability

## 1. Goals

- 输出“全体联系人层面”的关系盘点与行动建议
- 与旧 action-panel 返回字段可映射

## 2. Boundaries

### 2.1 独占路径
- `packages/server-nestjs/src/agent/capabilities/network_action/**`

## 3. Interface

- Input: `{ userId: string, limit?: number }`
- Output:
  - `followUps[]`
  - `recommendations[]`
  - `synthesis`
  - `nextActions[]`

## 4. Data Flow

input(user scope) -> build context(all contacts + recent interactions) -> template -> llm -> schema validate -> snapshot

## 5. Failure Modes

1. user scope 无联系人 -> 输出空集合 + 可读解释
2. recommendations 无法结构化 -> 校验失败
3. 快照过期字段异常

## 6. Test Plan

- 空联系人输入
- 正常结构化输出
- schema fail
- TTL 命中（12h）
