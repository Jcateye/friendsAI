# FriendsAI 后端 Multi-Agent 统一方案 - 落地实现计划

## 文档说明

本文档基于以下输入生成：
- `docs/friendsai-backend-multi-agent-unified-openspec-plan.md` - 总体架构方案
- `openspec/project.md` - 项目上下文与技术栈
- `openspec/changes/*/` - 8个实现模块的详细文档

**当前阶段**：文档阶段（2026-02-09 ~ 2026-02-12），不实施代码

## 一、项目概览

### 1.1 目标
将 FriendsAI 后端 AI 能力收敛到统一 Agent Runtime，通过 OpenSpec 模块拆分支持多人并行开发，减少共享文件冲突。

### 1.2 核心架构
- **模板引擎化**：Mustache + JSON 定义 + 声明式 Memory/Tools + 统一 Runtime
- **统一入口**：`POST /v1/agent/run`（新增）+ `POST /v1/agent/chat`（保留）
- **模块化拆分**：8个独立 change，支持并行开发

### 1.3 技术约束（冻结）
1. 模板语法：Mustache（无逻辑模板）
2. 模板来源：代码库文件（Git 管理）
3. 缺变量策略：告警 + defaults 注入
4. Agent 定义：JSON 格式
5. Memory 策略：声明式定义，由 Runtime 执行
6. Tool 策略：白名单 + 最小权限
7. 输出校验：schema 校验失败直接报错并记录
8. 时间字段：epoch milliseconds（bigint），API 提供 `*Ms` 字段

## 二、模块拆分与依赖关系

### 2.1 模块清单

| 模块 | 类型 | 职责 | 独占路径 |
|------|------|------|----------|
| `agent-template-runtime` | Program 总览 | 架构治理、依赖图、门禁 | 无（仅文档） |
| `agent-runtime-core-contracts` | Runtime 核心 | 定义加载、模板渲染、上下文构建 | `src/agent/contracts/**`<br>`src/agent/runtime/**` |
| `agent-runtime-storage-cache` | 存储缓存 | 快照表、缓存策略、summary 字段 | `src/agent/snapshots/**`<br>Entity/Migration |
| `agent-capability-archive-brief` | 业务能力 | archive_extract + brief_generate | `src/agent/capabilities/archive_brief/**` |
| `agent-capability-network-action` | 业务能力 | 网络动作工具调用 | `src/agent/capabilities/network_action/**` |
| `agent-capability-contact-insight` | 业务能力 | 联系人洞察分析 | `src/agent/capabilities/contact_insight/**` |
| `agent-capability-title-summary` | 业务能力 | 标题摘要生成 | `src/agent/capabilities/title_summary/**` |
| `agent-api-run-legacy-bridge` | API 集成 | 统一入口 + 旧 endpoint 桥接 | `agent.controller.ts`<br>`agent.module.ts`<br>Legacy services |

### 2.2 依赖关系图

```
agent-template-runtime (Program)
    │
    ├─→ agent-runtime-core-contracts (无依赖，可最先实施)
    │
    ├─→ agent-runtime-storage-cache (与 core 并行，需契约对齐)
    │
    ├─→ agent-capability-archive-brief (依赖: core + storage)
    │
    ├─→ agent-capability-network-action (依赖: core + storage)
    │
    ├─→ agent-capability-contact-insight (依赖: core + storage)
    │
    ├─→ agent-capability-title-summary (依赖: core + storage)
    │
    └─→ agent-api-run-legacy-bridge (依赖: 所有上述模块)
```

### 2.3 并行开发策略

**阶段1：基础层（可并行）**
- `agent-runtime-core-contracts` + `agent-runtime-storage-cache`
- 时间：2026-02-10 ~ 2026-02-12

**阶段2：能力层（可并行）**
- 4个 capability changes
- 时间：2026-02-13 ~ 2026-02-17

**阶段3：集成层（串行）**
- `agent-api-run-legacy-bridge`
- 时间：2026-02-18 ~ 2026-02-23

## 三、详细实施计划

### 3.1 Phase 1: 文档阶段（当前阶段）

#### 3.1.1 时间线
- **2026-02-09**：完成 8 个 change 的 proposal/design 初稿
- **2026-02-10**：完成 specs 文档
- **2026-02-11**：完成 tasks 文档
- **2026-02-12**：文档评审冻结（Go/No-Go for implementation）

#### 3.1.2 验收标准
- [ ] 8 个 change 文档结构完整（proposal/design/specs/tasks）
- [ ] 模块边界、依赖、时间计划可直接分配给不同开发者
- [ ] 接口契约一致，无跨模块冲突字段
- [ ] 明确"本轮不实施代码"

#### 3.1.3 当前状态检查
根据文档扫描，各模块已有基础文档：
- ✅ `agent-template-runtime`: proposal.md, design.md, tasks.md, specs/
- ✅ `agent-runtime-core-contracts`: proposal.md, design.md, tasks.md, specs/
- ✅ `agent-runtime-storage-cache`: proposal.md, design.md, tasks.md
- ✅ `agent-capability-archive-brief`: proposal.md, design.md, tasks.md, specs/
- ✅ `agent-capability-network-action`: proposal.md, design.md, tasks.md
- ✅ `agent-capability-contact-insight`: proposal.md, design.md, tasks.md
- ✅ `agent-capability-title-summary`: proposal.md, design.md, tasks.md, specs/
- ✅ `agent-api-run-legacy-bridge`: proposal.md, design.md, tasks.md

**待完成**：需要检查各模块 specs 是否完整，tasks 是否细化到可执行级别。

### 3.2 Phase 2: 实现阶段（文档冻结后）

#### 3.2.1 Runtime Core & Contracts

**目标**：实现统一可复用的 Agent Runtime 核心

**关键任务**：
1. **WS-10 契约与注册（2026-02-10）**
   - 定义 `AgentDefinition` 类型（prompt/memory/tools/validation/cache）
   - 实现 `AgentDefinitionRegistry`（加载顺序、路径规则、错误码）

2. **WS-20 模板与上下文（2026-02-11）**
   - 实现 `PromptTemplateRenderer`（Mustache + 缺变量告警 + defaults 注入）
   - 实现 `TemplateContextBuilder`（上下文 JSON 分层字段）

3. **WS-30 校验与测试（2026-02-12）**
   - 实现 `OutputValidator`（schema 校验 + 错误码）
   - 实现 `MemoryRuntime` / `ToolRuntime` 抽象
   - 编写测试（registry/render/validator 场景）

**代码路径**：
- `packages/server-nestjs/src/agent/contracts/**`
- `packages/server-nestjs/src/agent/runtime/**`

**验收标准**：
- [ ] 可通过 `agentId` 读取完整 Agent 定义资产
- [ ] 模板渲染支持缺变量告警与默认值注入
- [ ] tools policy 支持 allowlist 过滤
- [ ] 输出 schema 校验失败返回标准错误对象

#### 3.2.2 Storage & Cache

**目标**：实现 Agent 运行结果持久化与缓存策略

**关键任务**：
1. **WS-10 模型设计（2026-02-10）**
   - 创建 `agent_snapshots` 表（字段/索引支持 hash 命中、过期查询、审计追踪）
   - 扩展 `conversations` 表，新增 `summary` 字段

2. **WS-20 缓存策略（2026-02-11）**
   - 实现 sourceHash + TTL 规则（命中优先级、forceRefresh、过期行为）
   - 实现错误处理（hash/序列化/过期异常错误码）

3. **WS-30 验收场景（2026-02-12）**
   - 编写缓存测试（命中/绕过/过期）
   - 编写 summary 回写测试

**代码路径**：
- `packages/server-nestjs/src/agent/snapshots/**`
- Entity/Migration 文件

**验收标准**：
- [ ] snapshot 数据模型字段完整且可支持 sourceHash 命中
- [ ] TTL 与过期索引策略明确
- [ ] conversation summary 字段语义与回写规则明确

#### 3.2.3 Capability: archive_brief

**目标**：实现归档提取与会前简报能力

**关键任务**：
1. **WS-10 能力契约（2026-02-13）**
   - 定义 `archive_extract` 输入输出契约
   - 定义 `brief_generate` 输入输出契约
   - 定义 operation 错误码

2. **WS-20 运行策略（2026-02-14 ~ 2026-02-16）**
   - 定义模板资产（systemTemplate, userTemplate, defaults）
   - 定义 memory、tools policy
   - 定义缓存策略（sourceHash 与 TTL）

3. **WS-30 验收（2026-02-17）**
   - 编写测试场景（双 operation + schema + cache）

**代码路径**：
- `packages/server-nestjs/src/agent/capabilities/archive_brief/**`
- Agent 定义资产：`assets/agents/archive_brief/**`

**验收标准**：
- [ ] `archive_extract` 输入输出契约清晰
- [ ] `brief_generate` 输入输出契约清晰
- [ ] ability 具备可配置模板与 schema 校验设计

#### 3.2.4 Capability: network_action

**目标**：实现网络动作工具调用能力

**关键任务**：
- 定义 network_action Agent 能力
- 实现工具调用策略（白名单 + 最小权限）
- 实现工具执行与结果处理

**代码路径**：
- `packages/server-nestjs/src/agent/capabilities/network_action/**`

#### 3.2.5 Capability: contact_insight

**目标**：实现联系人洞察分析能力

**关键任务**：
- 定义 contact_insight Agent 能力
- 实现联系人数据聚合与分析
- 实现洞察结果输出

**代码路径**：
- `packages/server-nestjs/src/agent/capabilities/contact_insight/**`

#### 3.2.6 Capability: title_summary

**目标**：实现标题摘要生成能力

**关键任务**：
- 定义 title_summary Agent 能力
- 实现标题与摘要生成逻辑
- 实现结果回写到 `conversations.summary`

**代码路径**：
- `packages/server-nestjs/src/agent/capabilities/title_summary/**`

#### 3.2.7 API Bridge & Legacy Integration

**目标**：实现统一执行入口与兼容桥接

**关键任务**：
1. **实现统一入口**
   - 实现 `POST /v1/agent/run`（非流式执行）
   - 保留 `POST /v1/agent/chat`（流式兼容）

2. **实现 Legacy Bridge**
   - 将旧 endpoint（brief/archive/action-panel）委托到新 runtime
   - 保持旧 endpoint 输出契约不变

3. **集成测试**
   - 端到端测试所有 agentId
   - 验证 legacy endpoint 兼容性

**代码路径**（共享文件，仅此模块可修改）：
- `packages/server-nestjs/src/agent/agent.controller.ts`
- `packages/server-nestjs/src/agent/agent.module.ts`
- `packages/server-nestjs/src/agent/agent.types.ts`
- `packages/server-nestjs/src/agent/agent.orchestrator.ts`
- Legacy services: `briefings/**`, `conversation-archives/**`, `action-panel/**`

**验收标准**：
- [ ] `/agent/run` 契约稳定且覆盖 5 个 agentId
- [ ] `/agent/chat` 保持流式兼容
- [ ] 旧 endpoint 输出契约不变且映射关系明确
- [ ] 共享路径修改权责在文档中明确

## 四、关键接口与数据模型

### 4.1 API 接口

#### 新增：`POST /v1/agent/run`
```typescript
interface AgentRunRequest {
  agentId: string;
  operation?: string;  // 可选，用于多 operation agent
  input: Record<string, any>;
  options?: {
    forceRefresh?: boolean;
    timeout?: number;
  };
}

interface AgentRunResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    sourceHash?: string;
    cached?: boolean;
    executionTimeMs?: number;
  };
}
```

#### 保留：`POST /v1/agent/chat`
- 保持现有流式接口不变
- 内部可委托到新 runtime

### 4.2 类型定义

```typescript
type AgentId = 
  | 'chat_conversation'
  | 'archive_brief'
  | 'title_summary'
  | 'network_action'
  | 'contact_insight';

interface AgentDefinition {
  id: AgentId;
  version: string;
  prompt: {
    systemTemplate: string;  // Mustache 模板路径
    userTemplate: string;    // Mustache 模板路径
    defaultsFile?: string;   // JSON 默认值文件路径
  };
  memory?: {
    strategy: 'none' | 'conversation' | 'contact' | 'custom';
    maxTokens?: number;
  };
  tools?: {
    mode: 'none' | 'allowlist' | 'all';
    allowedTools?: string[];
  };
  validation: {
    inputSchema?: JSONSchema;
    outputSchema: JSONSchema;
  };
  cache?: {
    enabled: boolean;
    ttlSeconds?: number;
  };
}
```

### 4.3 数据模型

#### `agent_snapshots` 表
```sql
CREATE TABLE agent_snapshots (
  id UUID PRIMARY KEY,
  agent_id VARCHAR(100) NOT NULL,
  operation VARCHAR(100),
  source_hash VARCHAR(64) NOT NULL,  -- 用于缓存命中
  input_data JSONB NOT NULL,
  output_data JSONB NOT NULL,
  created_at_ms BIGINT NOT NULL,
  expires_at_ms BIGINT,
  metadata JSONB,
  INDEX idx_source_hash (source_hash),
  INDEX idx_expires_at (expires_at_ms)
);
```

#### `conversations.summary` 字段
```sql
ALTER TABLE conversations 
ADD COLUMN summary JSONB;  -- 存储 title_summary 结果
```

## 五、冲突治理规则

### 5.1 路径独占原则
- 每个 capability change 只改各自 `capabilities/<agentId>/**` 目录
- Runtime core 只改 `contracts/**` 和 `runtime/**`
- Storage cache 只改 snapshot 相关代码和 migration

### 5.2 共享文件白名单
以下文件**仅允许** `agent-api-run-legacy-bridge` 修改：
- `agent.controller.ts`
- `agent.module.ts`
- `agent.types.ts`
- `agent.orchestrator.ts`
- `briefings/**`
- `conversation-archives/**`
- `action-panel/**`

### 5.3 合并顺序
1. 先合并 `runtime-core` + `storage-cache`（基础层）
2. 并行合并 4 个 capability（能力层）
3. 最后合并 `api-run-legacy-bridge`（集成层）

## 六、测试策略

### 6.1 单元测试
- **Runtime Core**：registry/render/validator 场景
- **Storage Cache**：命中/绕过/过期场景
- **Capabilities**：各 operation 的输入输出校验

### 6.2 集成测试
- **API Bridge**：端到端测试所有 agentId
- **Legacy Compatibility**：验证旧 endpoint 行为不变

### 6.3 验收测试
- 跨时区时间字段排序验证
- 缓存命中率验证
- 错误处理路径验证

## 七、风险与应对

### 7.1 技术风险
| 风险 | 影响 | 应对 |
|------|------|------|
| 模板渲染性能 | 中 | 模板缓存 + 异步渲染 |
| 缓存一致性 | 高 | sourceHash 严格校验 + TTL 策略 |
| Legacy 兼容性 | 高 | 充分测试 + 灰度发布 |

### 7.2 协作风险
| 风险 | 影响 | 应对 |
|------|------|------|
| 共享文件冲突 | 高 | 严格路径独占 + 共享文件白名单 |
| 契约漂移 | 中 | Program 级类型冻结 + 文档评审 |
| 时间漂移 | 中 | 依赖检查点作为 gate |

## 八、里程碑与门禁

### 8.1 文档阶段门禁（当前）
- **2026-02-12**：文档评审冻结
- **Go/No-Go 标准**：
  - 8 个 change 文档完整
  - 模块边界清晰
  - 接口契约一致
  - 明确"不实施代码"

### 8.2 实现阶段门禁
- **Phase 1 Gate**（2026-02-12）：Runtime Core + Storage 完成
- **Phase 2 Gate**（2026-02-17）：所有 Capabilities 完成
- **Phase 3 Gate**（2026-02-23）：API Bridge 完成，端到端验收通过

## 九、下一步行动

### 9.1 立即行动（文档阶段）
1. **检查文档完整性**
   - [ ] 验证所有模块 specs 文档是否完整
   - [ ] 验证所有模块 tasks 是否细化到可执行级别
   - [ ] 检查接口契约一致性

2. **准备文档评审**
   - [ ] 整理文档清单
   - [ ] 准备评审会议
   - [ ] 明确 Go/No-Go 标准

### 9.2 文档冻结后行动
1. **分配开发任务**
   - Runtime Core：分配给 Runtime 平台负责人
   - Storage Cache：分配给数据与后端工程师
   - Capabilities：分配给业务工程师（可并行）
   - API Bridge：分配给集成负责人

2. **建立开发环境**
   - 创建 feature branches
   - 设置 CI/CD 检查
   - 准备测试数据库

3. **开始实施**
   - 按照依赖顺序开始开发
   - 定期同步进度
   - 及时处理冲突

## 十、参考文档

- 总体方案：`docs/friendsai-backend-multi-agent-unified-openspec-plan.md`
- 项目上下文：`openspec/project.md`
- 各模块文档：`openspec/changes/*/`

---

**文档版本**：v1.0  
**创建日期**：2026-02-08  
**最后更新**：2026-02-08  
**状态**：待评审




