## Why

当前 FriendsAI 仅有 Agent 能力列表，缺少 Skills 的统一生命周期治理。随着 OpenClaw 双栈引擎接入，技能定义必须具备版本、发布、灰度、租户覆盖和审计能力，才能支撑可回退的架构升级。

## Intent

建立 Skills Center（DB SoT + Git 导出）作为技能治理核心，统一管理 skill 定义、版本发布、绑定规则和运行态装载状态。

## Scope

- 新增 Skills 领域 API（catalog、create、version、publish、binding、disable、reconcile）。
- 新增 skills 相关 v3 数据模型与迁移。
- 增加技能发布灰度与绑定优先级规则。
- 增加 skills 快照导出到 Git 目录。

## Non-Goals

- 不引入 skills marketplace。
- 不改变 `/v1/agent/chat` 与 `/v1/agent/run` 的外部职责。
- 不实现多区域同步。

## Risks

- 全局与租户覆盖规则冲突导致 catalog 结果不稳定。
- 版本发布流程若缺校验，可能发布不可执行 manifest。

## Rollback

- 关闭 `SKILL_CENTER_ENABLED` 可禁用新路径。
- DB 表保留，不执行 destructive rollback。

## Acceptance

- Skills Center API 可完成定义/版本/发布/绑定全链路。
- catalog 返回可用于前端动态渲染的统一 skill actions。
- 发布后可导出 manifest 快照至 Git 目录。
