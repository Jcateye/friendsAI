## 1. 服务与接口

- [x] 1.1 [RHR-010,RHR-030] 新增 `RelationshipHealthService`，实现混合评分与 snapshot 写入。
- [x] 1.2 [RHR-040] 新增 `RelationshipsController` 暴露 `/health` 与 `/risk-queue`。
- [x] 1.3 [RHR-020] 风险队列返回 `factors[]` 与建议动作字段。

## 2. 配置与阈值

- [x] 2.1 [RHR-050] 支持用户级阈值/权重参数（query 或 profile 配置）。
- [x] 2.2 [RHR-010] 默认混合权重 `rule=0.7, llm=0.3`。

## 3. 测试

- [ ] 3.1 [RHR-010,RHR-020] 评分稳定性与风险分层测试。
- [ ] 3.2 [RHR-030,RHR-040] API 回归测试。
