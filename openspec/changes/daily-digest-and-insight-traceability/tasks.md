## 1. Digest 后端

- [x] 1.1 [DDI-010,DDI-020] 新增 digest 实体与 migration。
- [x] 1.2 [DDI-010,DDI-020] 新增 `ActionDigestService`，聚合 network_action + contact_insight 生成 top-3。
- [x] 1.3 [DDI-020] 新增 `ActionDigestController` 提供 today/refresh API。

## 2. Insight 可追溯增强

- [x] 2.1 [DDI-030,DDI-040] 扩展 `ContactInsightOutput` 类型和 schema。
- [x] 2.2 [DDI-030,DDI-040,DDI-050] 在 `contact_insight` 结果构建 evidenceChains/sourceRefs/confidence。

## 3. 前端消费

- [x] 3.1 [DDI-030,DDI-040] 扩展 web API types。
- [x] 3.2 [DDI-030,DDI-040,DDI-050] 联系人洞察页面新增证据链渲染。

## 4. 验证

- [ ] 4.1 [DDI-010,DDI-020] digest 幂等性测试。
- [ ] 4.2 [DDI-030,DDI-040] insight traceability 合同测试。
