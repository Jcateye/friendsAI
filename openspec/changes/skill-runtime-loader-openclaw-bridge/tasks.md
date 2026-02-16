## 1. Loader 基础

- [x] 1.1 [SRL-010] 新增 `SkillBindingResolverService` 计算目标技能集。
- [x] 1.2 [SRL-020] 新增 `SkillLoaderService` 生成 `SkillRuntimePlan` 与 desired hash。
- [x] 1.3 [SRL-030] 实现 reconcile 幂等（hash 相同跳过）。

## 2. OpenClaw 桥接

- [x] 2.1 [SRL-040] 导出 skill 快照并支持 runtime reload 调用。
- [x] 2.2 [SRL-050] 失败状态落 `skill_runtime_mounts` 并返回可读错误。
- [x] 2.3 [SRL-060] binding disable 后支持卸载计划生成。
