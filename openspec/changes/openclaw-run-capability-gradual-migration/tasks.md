## 1. Capability 策略接入

- [ ] 1.1 [ARM-010] router 支持 capability 级策略决策（Done When: 可按 capability 命中不同 engine）。
- [ ] 1.2 [ARM-010] 配置 `title_summary` 灰度策略（Done When: `title_summary` 可独立命中 openclaw）。

## 2. 回退与一致性

- [ ] 2.1 [ARM-020] run openclaw 失败时 fallback local（Done When: timeout/5xx 场景 fallback 生效）。
- [ ] 2.2 [ARM-030] 保持 schema 校验语义一致（Done When: local/openclaw 对照用例通过）。

## 3. 分阶段迁移

- [ ] 3.1 [ARM-010][ARM-030] 扩展至 `contact_insight` 灰度（Done When: 迁移后合同测试通过）。
- [ ] 3.2 [ARM-020] 完成回滚脚本与策略（Done When: capability 可一键回切 local）。

## 4. 验收

- [ ] 4.1 [ARM-010][ARM-020][ARM-030] 执行 OpenSpec 严格校验（Done When: `openspec validate openclaw-run-capability-gradual-migration --type change --strict --json` 通过）。
- [ ] 4.2 [ARM-030] 执行 run 一致性回归（Done When: `title_summary/contact_insight` 结构化输出兼容）。
