# Tasks: Runtime Core & Contracts

## WS-10 契约与注册（2026-02-10）

- [ ] **10.1** 定义 `AgentDefinition` 与相关类型
  Done When: 类型字段覆盖 prompt/memory/tools/validation/cache

- [ ] **10.2** 实现 Definition Registry 设计文档
  Done When: 文档中明确加载顺序、路径规则、错误码

## WS-20 模板与上下文（2026-02-11）

- [ ] **20.1** 完成 PromptTemplateRenderer 设计
  Done When: 覆盖缺变量告警与 defaults 注入策略

- [ ] **20.2** 完成 TemplateContextBuilder 设计
  Done When: 上下文 JSON 分层字段清晰

## WS-30 校验与测试（2026-02-12）

- [ ] **30.1** 完成 OutputValidator 设计
  Done When: schema fail 的错误码与行为明确

- [ ] **30.2** 完成测试场景定义
  Done When: 至少包含 registry/render/validator 三类场景
