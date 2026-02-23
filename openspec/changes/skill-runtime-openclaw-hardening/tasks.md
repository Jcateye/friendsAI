## 1. friendsAI 协议与类型收敛

- [x] 1.1 [SRH-050] 在 `skills.types.ts` 新增 `OpenClawReloadRequestV2`、`OpenClawReloadResponseV2`、`EnginePolicy`、`SkillRuntimeMountDetailsV2`（Done when: 类型可被 service/loader 引用且编译通过）。
- [x] 1.2 [SRH-030] 在 loader/service 中接入 `SKILL_RUNTIME_ENGINE_POLICY` 与 `SKILL_OPENCLAW_RELOAD_PROTOCOL`（Done when: 默认 strict+v2，配置可切换）。

## 2. friendsAI Loader 硬化

- [x] 2.1 [SRH-010] 实现 `unloadActions` 差异计算并落 `appliedSkills` 快照（Done when: disable binding 后 plan 含 unload 动作）。
- [x] 2.2 [SRH-020] 实现 OpenClaw 调用超时、有限重试、错误分类（Done when: 5xx/timeout 可重试，4xx 不重试）。
- [x] 2.3 [SRH-030][SRH-040] 按 policy 处理失败并写入 `traceId/phaseDurationsMs/reloadAttempts/gatewaySummary`（Done when: applied/skipped/failed 都可审计）。

## 3. friendsAI API 边界收敛

- [x] 3.1 [SRH-050] 为 `POST /skills/runtime/reconcile` 引入 DTO，替换 controller `any`（Done when: swagger 展示明确 schema）。
- [x] 3.2 [SRH-030] 在 service 层补强 `tenantId/engine/agentScope` 输入校验（Done when: 非法入参返回 BadRequest）。

## 4. ClawFriends 网关接口

- [x] 4.1 [SRH-050] 新增 `src/gateway/skills-reload-http.ts`，实现 `/skills/reload` 控制面确认端点（Done when: 返回 executionMode=control-plane-only）。
- [x] 4.2 [SRH-050] 在 `src/gateway/server-http.ts` 接入新 handler 与鉴权流程（Done when: 未授权 401，授权可 200）。

## 5. 测试与联调验收

- [x] 5.1 [SRH-010][SRH-020][SRH-030][SRH-040] 新增/更新 friendsAI 单测覆盖卸载差异、重试、policy 与 details 字段（Done when: 对应测试通过）。
- [x] 5.2 [SRH-050] 新增 ClawFriends `skills-reload-http.test.ts` 覆盖 401/405/400/200（Done when: 测试通过）。
- [ ] 5.3 [SRH-050] 完成跨仓联调检查（Done when: 同 tenant+scope 连续 reconcile 能看到可解释 mount 状态变化）。
