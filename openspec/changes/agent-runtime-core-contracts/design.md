# Design: Agent Runtime Core

## 1. Goals

- 提供统一可复用的 Agent Runtime 核心
- 固化模板、内存、工具、校验的执行顺序
- 降低 capability 开发复杂度

## 2. Boundaries

### 2.1 独占代码路径
- `packages/server-nestjs/src/agent/contracts/**`
- `packages/server-nestjs/src/agent/runtime/**`（不含 controller/module wiring）

### 2.2 不可修改路径
- `agent.controller.ts`
- `agent.module.ts`
- 任何 legacy service

## 3. Interfaces & Types

### 3.1 AgentDefinition
关键字段：
- `id`, `version`
- `prompt.systemTemplate`, `prompt.userTemplate`, `prompt.defaultsFile`
- `memory.*`
- `tools.mode`, `tools.allowedTools`
- `validation.inputSchema`, `validation.outputSchema`

### 3.2 Runtime APIs
- `loadDefinition(agentId): AgentDefinitionBundle`
- `renderPrompt(bundle, context): RenderResult`
- `buildRuntimeContext(input, opts): RuntimeContext`
- `validateOutput(bundle, output): ValidationResult`

## 4. Data Flow

输入请求 -> DefinitionRegistry -> ContextBuilder -> TemplateRenderer -> MemoryRuntime -> ToolRuntime -> Validator（此 change 到此为止）

## 5. Failure Modes

1. 缺少模板文件：返回 `definition_template_missing`
2. 缺变量：记录 warning 并注入 default
3. schema 无效：返回 `definition_schema_invalid`
4. 输出校验失败：返回 `output_validation_failed`

## 6. Test Plan

- Registry 读取成功/失败
- 模板渲染（正常、缺变量、defaults）
- allowlist 过滤
- 输出校验错误路径

## 7. Milestones

- D1: contracts + registry
- D2: renderer + context
- D3: memory/tool/validator + tests
