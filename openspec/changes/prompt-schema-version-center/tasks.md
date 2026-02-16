## 1. 数据模型

- [x] 1.1 [PSV-010,PSV-020] 新增版本中心三张表 migration + entities。

## 2. 服务与接口

- [x] 2.1 [PSV-010,PSV-020] 实现版本列表/创建 API。
- [x] 2.2 [PSV-040] 实现发布前校验 API。
- [x] 2.3 [PSV-030] 实现 publish API 与灰度规则保存。
- [x] 2.4 [PSV-050] 实现导出 active 版本到 Git 快照目录。

## 3. 运行时接入

- [x] 3.1 [PSV-030] AgentDefinitionRegistry 增加 DB 版本中心读取能力（flag 控制）。

## 4. 测试

- [ ] 4.1 [PSV-040] validate 失败阻断 publish 测试。
- [ ] 4.2 [PSV-030] userId 灰度路由稳定性测试。
