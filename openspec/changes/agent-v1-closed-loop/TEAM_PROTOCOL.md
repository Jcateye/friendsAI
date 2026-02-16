# AI 团队协作协议

## 1. 团队角色定义

| 角色 | 职责 | 工作目录 |
|------|------|----------|
| **TestFixer** | 修复现有测试失败 | `packages/server-nestjs/src/**` |
| **ApiValidator** | 验证 API 端点可访问性 | `packages/server-nestjs/src/**` |
| **DocWriter** | 编写 API 文档 | `openspec/changes/agent-v1-closed-loop/` |
| **IntegrationTester** | 集成测试与验证 | `packages/server-nestjs/test/` |

## 2. 任务边界与文件范围

### 严格禁止的修改
- ❌ **禁止修改 `friendsai_v2` 数据库结构**
- ❌ **禁止修改前端代码** (`packages/client/`)
- ❌ **禁止修改无关的现有测试** (除非被指派)

### 允许的修改范围
- ✅ `packages/server-nestjs/src/v3-entities/` - V3 实体
- ✅ `packages/server-nestjs/src/action-tracking/` - 事件追踪
- ✅ `packages/server-nestjs/src/connectors/` - 飞书集成
- ✅ `packages/server-nestjs/src/agent/` - Agent 相关
- ✅ `packages/server-nestjs/src/tool-confirmations/` - 工具确认
- ✅ `packages/server-nestjs/test/` - 测试文件

## 3. 协作规矩

### 3.1 文件锁定机制
- 每个 Agent 修改文件前，先声明"我将修改 X 文件"
- 其他 Agent 看到声明后避免修改同一文件
- 冲突时，优先级：TestFixer > ApiValidator > IntegrationTester > DocWriter

### 3.2 通信协议
- **完成声明**：使用 `@team-lead` 汇报完成状态
- **问题报告**：使用 `@team-lead` 汇报阻塞问题
- **跨团队协作**：需要共享信息时使用 `@all`

### 3.3 输出格式
每个任务完成后输出：
```markdown
## [角色名] 任务完成

### 修改的文件
- file1.ts (修改内容摘要)
- file2.ts (新增)

### 验证结果
- ✅ 测试通过: X/Y
- ✅ 构建成功
- ⚠️  需要注意的问题
```

## 4. Phase 分解

### Phase 1: 修复现有测试失败 (TestFixer)
**目标**: 将测试失败数降到最低
**文件**: 修复以下测试文件
- `ai/ai.service.spec.ts`
- `agent/snapshots/snapshot.service.spec.ts`
- `briefings/briefings.controller.spec.ts`
- `agent/agent.orchestrator.spec.ts`
- `contacts/contacts.service.spec.ts`

### Phase 2: 验证 API 端点 (ApiValidator)
**目标**: 确保所有新增 API 端点可访问
**端点列表**:
- `/v1/actions/track`
- `/v1/metrics/weekly`
- `/v1/metrics/events`
- `/v1/connectors/feishu/oauth/*`

### Phase 3: 创建 API 文档 (DocWriter)
**目标**: 生成完整的 API 文档
**输出**: `API.md`

### Phase 4: 集成测试 (IntegrationTester)
**目标**: 端到端验证 V1 功能
**测试场景**: 建议展示 -> 采纳 -> 发送 -> 回复

### Phase 5: 最终联调 (team-lead)
**目标**: 汇总所有结果，生成最终报告

## 5. 启动命令

```bash
# 按角色并行启动 4 个 Agent
Agent 1 (TestFixer): 修复测试
Agent 2 (ApiValidator): 验证 API
Agent 3 (DocWriter): 编写文档
Agent 4 (IntegrationTester): 集成测试
```
