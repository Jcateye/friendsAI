## Why

目前 Agent 定义依赖文件系统，缺少版本生命周期、灰度发布和发布前校验能力，线上 prompt/schema 改动治理成本高且风险不可控。

## Intent

建立 Prompt/Schema 版本中心：DB 作为 source of truth，支持 draft/active/deprecated 生命周期、灰度发布和 Git 导出。

## Scope

- 新增版本管理 API 与数据模型。
- 新增发布前校验 API。
- 支持百分比灰度规则。
- 支持版本导出到 Git 快照目录。

## Non-Goals

- 不替代 OpenSpec artifact 流程。
- 不实现复杂可视化后台页面（先 API）。

## What Changes

- 新增实体：
  - `agent_definition_versions`
  - `agent_definition_release_rules`
  - `agent_definition_publish_logs`
- 新增 `AgentDefinitionCenterService` 与 controller。
- 运行时 registry 支持从版本中心读取 active 版本（feature flag 控制）。

## Risks

- 运行时从文件切到 DB 可能影响热更新链路。
- 灰度规则错误会造成版本路由偏差。

## Rollback

- 关闭 `AGENT_DEFINITION_CENTER_ENABLED`，回退到文件系统 registry。

## Acceptance

- 可创建版本、校验版本、发布版本并查询版本历史。
- 同一 `userId` 在灰度规则下路由稳定。
- 可将 active 版本导出到 Git 快照目录。
