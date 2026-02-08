# Feature: Agent Runtime Core & Contracts

## Summary

定义并规范化 Agent Runtime 核心层：
- Agent 定义加载
- Prompt 模板渲染
- 上下文拼装
- Memory/Tools/Validation 运行时抽象

本 change 聚焦“运行时核心能力与契约”，不包含存储迁移和 API 桥接。

## Motivation

当前 AI 能力缺少统一 runtime，导致：
- 模板渲染规则不统一；
- 缺变量处理策略不一致；
- memory/tools/schema 约束难复用。

## Scope

### In Scope
- `AgentDefinition` 契约
- `AgentDefinitionRegistry`
- `PromptTemplateRenderer`（Mustache + defaults + warnings）
- `TemplateContextBuilder`
- `MemoryRuntime` / `ToolRuntime` / `OutputValidator` 抽象

### Out of Scope
- 数据库迁移
- endpoint/controller 改造
- legacy bridge

## Owner & Dependencies
- Owner: Runtime 平台负责人
- Dependencies: 无（可最先实施）

## Timeline
- 2026-02-10 ~ 2026-02-12

## Acceptance Criteria
1. 可通过 `agentId` 读取完整 Agent 定义资产。
2. 模板渲染支持缺变量告警与默认值注入。
3. tools policy 支持 allowlist 过滤。
4. 输出 schema 校验失败返回标准错误对象。
