# Tasks: feishu-button-webhook

## 1. Planning

### 1.1 Review requirements
- [x] 与用户确认需求边界（只读 + 触发按钮，不需要写操作）
- [x] 确认飞书 Automation + Webhook 方案可行性
- [x] 梳理现有 connectors 模块可复用的部分

### 1.2 Design API/interface
- [ ] 定义 Webhook 接口的请求/响应 DTO（`ButtonClickDto`、`ButtonClickResponse`）
- [ ] 定义配置管理的请求/响应结构（`FeishuConfigDto`、`FeishuConfigResponse`）
- [ ] 设计错误码枚举（`FeishuWebhookError`）
- [ ] 编写 Swagger 注解（`@ApiTags('feishu')`、`@ApiOperation()`）

## 2. Implementation

### 2.1 Implement core logic

#### Webhook 接收模块
- [ ] **创建 `feishu/webhook` 模块目录**
  - [ ] `feishu/webhook.controller.ts` - Webhook 接收入口
  - [ ] `feishu/webhook.service.ts` - 核心业务逻辑
  - [ ] `feishu/webhook.dto.ts` - 请求数据传输对象
  - [ ] `feishu/webhook.module.ts` - 模块定义

#### 飞书 API 封装
- [ ] **创建 `feishu/api.service.ts`** - 飞书 OpenAPI 客户端
  - [ ] 实现 `searchRecords()` - 查询 Bitable 记录
  - [ ] 实现 `getRecord()` - 获取单条记录详情
  - [ ] 实现 `updateRecord()` - 更新记录状态
  - [ ] 实现 `sendCardMessage()` - 发送卡片消息通知
  - [ ] 实现 `getUserInfo()` - 获取用户信息

#### 配置管理模块
- [ ] **创建 `feishu/config` 模块目录**
  - [ ] `feishu/config.controller.ts` - 配置管理接口
  - [ ] `feishu/config.service.ts` - 配置存储与查询
  - [ ] `feishu/config.dto.ts` - 配置数据传输对象

#### 数据模型
- [ ] **创建 `feishu_config.entity.ts`** - 用户配置表
  - [ ] **创建 `feishu_webhook_log.entity.ts`** - Webhook 调用日志表
  - [ ] **生成数据库迁移文件** - Migration SQL

### 2.2 Add error handling
- [ ] Webhook 签名验证失败时返回 401
- [ ] 飞书 API 调用失败时记录错误并重试
- [ ] Webhook 请求格式错误时返回 400
- [ ] 未授权时返回 403
- [ ] 实现全局异常过滤器（`FeishuWebhookExceptionFilter`）

### 2.3 Write unit tests
- [ ] **Webhook 签名验证测试** - 测试 HMAC-SHA256 签名算法
- [ ] **Service 层逻辑测试** - Mock 飞书 API，测试业务流程
- [ ] **DTO 验证测试** - 测试请求数据校验
- [ ] **配置管理测试** - 测试配置保存/查询
- [ ] 测试覆盖率目标：> 80%

## 3. Integration

### 3.1 Integration testing
- [ ] 本地使用 ngrok 或类似工具暴露 Webhook 端点
- [ ] 在飞书 Automation 中配置测试 Webhook URL
- [ ] 端到端真实按钮点击测试
- [ ] 验证 Webhook 日志正确记录
- [ ] 测试与现有 OAuth 模块的兼容性

### 3.2 Documentation
- [ ] 更新 Swagger 文档（新增飞书相关接口）
- [ ] 编写用户配置指南（如何在 Bitable 中配置按钮和 Automation）
- [ ] 添加 Webhook 调试说明（如何查看日志）

### 3.3 Code review
- [ ] 确保 TypeScript 类型安全（无 any）
- [ ] 确保 DTO 类使用 class-validator 装饰器
- [ ] 确保敏感信息（如 token）不记录到日志
- [ ] 确保数据库查询使用参数化查询（防 SQL 注入）

---

## Task 分解说明

### Phase 1: 基础设施（预计 2-3 天）
- 创建新的 `feishu/webhook` 和 `feishu/config` 模块
- 实现 Webhook 接收和签名验证
- 实现数据库迁移

### Phase 2: 核心功能（预计 3-4 天）
- 完成 `FeishuApiService` 封装
- 实现配置管理模块
- 添加错误处理

### Phase 3: 测试与文档（预计 1-2 天）
- 单元测试和集成测试
- Swagger 文档更新
- 用户配置指南编写

---

## 验收标准

### 功能验收
- [ ] 用户可在飞书 Bitable 中点击按钮，触发 friendsAI 处理
- [ ] friendsAI 成功接收 Webhook 请求并验证签名
- [ ] friendsAI 可调用飞书 API 查询记录详情
- [ ] friendsAI 可更新记录状态（可选）
- [ ] friendsAI 可发送飞书卡片消息通知用户（可选）
- [ ] 用户可配置 Webhook URL

### 技术验收
- [ ] Webhook 接口有完整 Swagger 文档
- [ ] 所有接口有 DTO 类定义和 class-validator 校验
- [ ] 数据库迁移文件正确执行
- [ ] 单元测试覆盖率 > 80%
- [ ] 签名验证算法正确（HMAC-SHA256）
- [ ] 错误处理完善（错误码、重试、异常过滤器）

---

## 相关文档

- [proposal](../proposal.md) - 需求提案
- [design](../design.md) - 技术设计
- [飞书官方文档](https://open.feishu.cn/document/common-c3xc3r/automation/trigger-condition)
- [查询记录 API](https://open.feishu.cn/document/docs/bitable-v1/app-table-record/search)
