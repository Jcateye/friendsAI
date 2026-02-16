# Tasks: Storage & Cache

## WS-10 模型设计（2026-02-10）

- [ ] **10.1** 定义 `agent_snapshots` 字段与索引
  Done When: 字段/索引可支持 hash 命中、过期查询、审计追踪

- [ ] **10.2** 定义 `conversations.summary` 字段
  Done When: 文档中明确类型、语义、更新来源

## WS-20 缓存策略（2026-02-11）

- [ ] **20.1** 完成 sourceHash + TTL 规则定义
  Done When: 命中优先级、forceRefresh、过期行为无歧义

- [ ] **20.2** 完成错误处理定义
  Done When: hash/序列化/过期异常都有明确错误码

## WS-30 验收场景（2026-02-12）

- [ ] **30.1** 定义缓存测试场景
  Done When: 命中/绕过/过期三场景完整

- [ ] **30.2** 定义 summary 回写场景
  Done When: 读写流程与边界条件明确
