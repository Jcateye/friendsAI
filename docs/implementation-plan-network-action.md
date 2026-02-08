# Network Action Agent 落地实现计划

## 文档定位

- **类型**：实施计划文档（从 OpenSpec 到代码落地）
- **范围**：`agent-capability-network-action` 模块的完整实现路径
- **目标**：将 OpenSpec 设计转化为可执行的代码实现

## 一、架构上下文

### 1.1 整体架构

```
API Layer
  ├── POST /v1/agent/run (统一执行入口)
  └── POST /v1/agent/chat (流式兼容，保留)

Runtime Layer
  ├── AgentDefinitionRegistry (定义加载)
  ├── TemplateContextBuilder (上下文构建)
  ├── PromptTemplateRenderer (Mustache 渲染)
  ├── MemoryRuntime (声明式 Memory 执行)
  ├── ToolRuntime (白名单 Tools 执行)
  ├── OutputValidator (Schema 校验)
  └── SnapshotService (快照缓存)

Capability Layer
  └── network_action (本模块)
      ├── agent.json (Agent 定义)
      ├── templates/ (Mustache 模板)
      ├── schemas/ (输入输出 Schema)
      └── defaults.json (默认值配置)
```

### 1.2 模块依赖关系

```
agent-capability-network-action
  ├── 依赖: agent-runtime-core-contracts (核心运行时契约)
  ├── 依赖: agent-runtime-storage-cache (存储缓存层)
  └── 被依赖: agent-api-run-legacy-bridge (API 桥接层)
```

**实现顺序约束**：
1. 必须先完成 `agent-runtime-core-contracts`（提供核心抽象）
2. 必须先完成 `agent-runtime-storage-cache`（提供快照服务）
3. 本模块可与 `agent-capability-archive-brief`、`agent-capability-contact-insight`、`agent-capability-title-summary` 并行开发
4. 最后由 `agent-api-run-legacy-bridge` 集成所有 capability

## 二、实现范围

### 2.1 In Scope（本模块负责）

- ✅ `network_action` Agent 定义（JSON + 模板 + Schema）
- ✅ 输入输出契约实现
- ✅ 上下文构建逻辑（联系人数据聚合）
- ✅ 缓存策略实现（12h TTL + sourceHash）
- ✅ 错误处理与边界情况
- ✅ 单元测试与集成测试

### 2.2 Out of Scope（由其他模块负责）

- ❌ API 端点实现（`agent-api-run-legacy-bridge` 负责）
- ❌ Runtime 核心抽象（`agent-runtime-core-contracts` 负责）
- ❌ 快照存储实现（`agent-runtime-storage-cache` 负责）
- ❌ 前端 action-panel 改造（前端模块负责）

## 三、技术实现细节

### 3.1 目录结构

```
packages/server-nestjs/src/agent/
├── capabilities/
│   └── network_action/
│       ├── network-action.agent.json       # Agent 定义
│       ├── templates/
│       │   └── prompt.mustache            # 主提示模板
│       ├── schemas/
│       │   ├── input.schema.json          # 输入 Schema
│       │   └── output.schema.json         # 输出 Schema
│       ├── defaults.json                  # 默认值配置
│       ├── network-action.service.ts      # 业务逻辑服务
│       ├── network-action.context.ts      # 上下文构建器
│       └── network-action.spec.ts         # 单元测试
└── runtime/                                # Runtime 核心（其他模块）
    ├── registry/
    ├── renderer/
    └── validator/
```

### 3.2 Agent 定义结构（agent.json）

```json
{
  "id": "network_action",
  "name": "Network Action Agent",
  "version": "1.0.0",
  "description": "生成全体联系人层面的关系盘点与行动建议",
  "template": {
    "prompt": "templates/prompt.mustache",
    "system": "templates/system.mustache"
  },
  "memory": {
    "strategy": "declarative",
    "maxTokens": 4000,
    "includeRecentInteractions": true,
    "includeContactProfiles": true
  },
  "tools": {
    "allowlist": [],
    "requiresConfirmation": false
  },
  "output": {
    "schema": "schemas/output.schema.json",
    "validation": "strict"
  },
  "cache": {
    "ttl": 43200,
    "sourceHashFields": ["userId", "contactsHash", "interactionsHash"]
  }
}
```

### 3.3 输入输出契约

#### 输入（AgentRunRequest）

```typescript
interface NetworkActionInput {
  userId: string;
  limit?: number;  // 可选：限制返回数量
  forceRefresh?: boolean;  // 可选：强制刷新缓存
}
```

#### 输出（AgentRunResponse）

```typescript
interface NetworkActionOutput {
  followUps: Array<{
    contactId: string;
    contactName: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    suggestedAction: string;
  }>;
  recommendations: Array<{
    type: 'connection' | 'followup' | 'introduction';
    description: string;
    contacts: string[];  // 相关联系人 ID
    confidence: number;  // 0-1
  }>;
  synthesis: string;  // 可读的汇总解释
  nextActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    estimatedTime?: string;
  }>;
  metadata: {
    cached: boolean;
    sourceHash: string;
    generatedAt: number;  // epoch milliseconds
  };
}
```

### 3.4 模板设计（Mustache）

#### templates/prompt.mustache

```mustache
你是一个专业的人脉关系管理助手。基于以下联系人网络数据，生成关系盘点与行动建议。

## 联系人概览
{{#contacts}}
- {{name}} ({{company}}): {{lastInteractionAt}} 最后交互
{{/contacts}}

## 最近交互记录
{{#recentInteractions}}
- {{date}}: {{summary}}
{{/recentInteractions}}

## 任务
1. 识别需要跟进的联系人（followUps）
2. 生成关系网络建议（recommendations）
3. 提供整体关系盘点（synthesis）
4. 列出可执行的下一步行动（nextActions）

请以 JSON 格式输出，严格遵循输出 Schema。
```

### 3.5 上下文构建逻辑

```typescript
// network-action.context.ts
export class NetworkActionContextBuilder {
  async build(userId: string, limit?: number): Promise<TemplateContext> {
    // 1. 获取用户所有联系人
    const contacts = await this.contactService.findAllByUserId(userId);
    
    // 2. 获取最近交互记录（最近 30 天）
    const recentInteractions = await this.interactionService
      .findRecentByUserId(userId, 30);
    
    // 3. 计算 sourceHash（用于缓存）
    const contactsHash = this.computeHash(contacts);
    const interactionsHash = this.computeHash(recentInteractions);
    
    // 4. 构建模板上下文
    return {
      contacts: contacts.map(c => ({
        id: c.id,
        name: c.name,
        company: c.company || '未知',
        lastInteractionAt: c.lastInteractionAtMs 
          ? new Date(c.lastInteractionAtMs).toISOString() 
          : '从未交互'
      })),
      recentInteractions: recentInteractions.map(i => ({
        date: new Date(i.createdAtMs).toISOString(),
        summary: i.summary || i.content
      })),
      metadata: {
        totalContacts: contacts.length,
        totalInteractions: recentInteractions.length
      }
    };
  }
  
  private computeHash(data: any): string {
    // 使用稳定的哈希算法（如 SHA-256）
    // 仅包含影响输出的关键字段
  }
}
```

### 3.6 缓存策略实现

```typescript
// 在 network-action.service.ts 中
export class NetworkActionService {
  async run(input: NetworkActionInput): Promise<NetworkActionOutput> {
    // 1. 构建上下文并计算 sourceHash
    const context = await this.contextBuilder.build(input.userId, input.limit);
    const sourceHash = this.computeSourceHash(context);
    
    // 2. 检查缓存（除非 forceRefresh）
    if (!input.forceRefresh) {
      const cached = await this.snapshotService.get(
        'network_action',
        sourceHash
      );
      if (cached && !this.isExpired(cached, 43200)) {  // 12h = 43200s
        return {
          ...cached.output,
          metadata: { ...cached.output.metadata, cached: true }
        };
      }
    }
    
    // 3. 执行 Agent Runtime
    const output = await this.runtime.execute('network_action', {
      context,
      sourceHash
    });
    
    // 4. 保存快照
    await this.snapshotService.save('network_action', sourceHash, output, 43200);
    
    return {
      ...output,
      metadata: { ...output.metadata, cached: false, sourceHash }
    };
  }
}
```

## 四、实施步骤（按时间顺序）

### Phase 1: 基础结构搭建（2026-02-13）

**任务 WS-10.1: 定义输入输出字段**

- [ ] 创建 `network-action.agent.json` 定义文件
- [ ] 创建 `schemas/input.schema.json`（使用 Zod/JSON Schema）
- [ ] 创建 `schemas/output.schema.json`（包含 followUps/recommendations/synthesis/nextActions）
- [ ] 创建 TypeScript 类型定义（DTO）
- [ ] 验证输出字段可直接映射至旧 action-panel 格式

**验收标准**：
- ✅ Schema 文件通过 JSON Schema 验证
- ✅ TypeScript 类型与 Schema 一致
- ✅ 输出字段与旧 action-panel API 兼容

### Phase 2: 错误处理与边界情况（2026-02-13）

**任务 WS-10.2: 定义错误码与边界行为**

- [ ] 定义错误码枚举：
  - `NETWORK_ACTION_NO_CONTACTS`: 用户无联系人数据
  - `NETWORK_ACTION_OUTPUT_VALIDATION_FAILED`: 输出校验失败
  - `NETWORK_ACTION_CONTEXT_BUILD_FAILED`: 上下文构建失败
- [ ] 实现空联系人处理逻辑（返回空集合 + 友好提示）
- [ ] 实现输出校验失败处理（记录错误 + 返回标准错误对象）
- [ ] 编写边界情况单元测试

**验收标准**：
- ✅ 空联系人输入返回 `{ followUps: [], recommendations: [], synthesis: "暂无联系人数据", nextActions: [] }`
- ✅ Schema 校验失败返回 `{ error: "output_validation_failed", details: {...} }`
- ✅ 所有边界情况有对应的单元测试覆盖

### Phase 3: 模板与策略资产（2026-02-14 ~ 2026-02-16）

**任务 WS-20.1: 定义模板与 policy 资产**

- [ ] 创建 `templates/prompt.mustache`（主提示模板）
- [ ] 创建 `templates/system.mustache`（系统提示，可选）
- [ ] 创建 `defaults.json`（模板变量默认值）
- [ ] 在 `agent.json` 中配置 memory 策略：
  - `maxTokens: 4000`
  - `includeRecentInteractions: true`
  - `includeContactProfiles: true`
- [ ] 在 `agent.json` 中配置 tools 策略：
  - `allowlist: []`（network_action 不需要工具调用）
  - `requiresConfirmation: false`
- [ ] 验证模板渲染（使用 Runtime 的 TemplateRenderer）

**验收标准**：
- ✅ 模板文件符合 Mustache 语法
- ✅ 模板变量有对应的默认值配置
- ✅ Memory 策略配置正确
- ✅ 模板渲染测试通过（包括缺变量告警）

### Phase 4: 上下文构建实现（2026-02-15）

**任务: 实现上下文构建器**

- [ ] 创建 `network-action.context.ts`
- [ ] 实现 `build()` 方法：
  - 查询用户所有联系人（使用 ContactService）
  - 查询最近交互记录（使用 InteractionService/ConversationService）
  - 格式化数据为模板上下文格式
- [ ] 实现 `computeHash()` 方法（计算 sourceHash）
- [ ] 编写单元测试（Mock 数据服务）

**验收标准**：
- ✅ 上下文构建器正确聚合联系人数据
- ✅ sourceHash 计算稳定（相同输入产生相同 hash）
- ✅ 单元测试覆盖正常/空数据场景

### Phase 5: 缓存策略实现（2026-02-16）

**任务 WS-20.2: 定义缓存与 sourceHash**

- [ ] 在 `network-action.service.ts` 中实现缓存检查逻辑
- [ ] 集成 `SnapshotService`（由 storage-cache 模块提供）
- [ ] 实现 TTL 检查（12h = 43200 秒）
- [ ] 实现 `forceRefresh` 参数处理
- [ ] 在输出 metadata 中标记 `cached: true/false`
- [ ] 编写缓存命中/失效测试

**验收标准**：
- ✅ 相同 sourceHash 在 12h 内命中缓存
- ✅ `forceRefresh=true` 时跳过缓存
- ✅ 缓存过期后自动重新生成
- ✅ 输出 metadata 正确标记缓存状态

### Phase 6: 服务层集成（2026-02-16）

**任务: 实现 NetworkActionService**

- [ ] 创建 `network-action.service.ts`
- [ ] 注入依赖：
  - `AgentRuntime`（核心运行时）
  - `SnapshotService`
  - `NetworkActionContextBuilder`
  - `ContactService` / `InteractionService`
- [ ] 实现 `run()` 方法：
  1. 构建上下文
  2. 检查缓存
  3. 调用 Runtime 执行
  4. 保存快照
  5. 返回结果
- [ ] 实现错误处理与日志记录

**验收标准**：
- ✅ Service 正确调用 Runtime 执行 Agent
- ✅ 错误处理覆盖所有失败场景
- ✅ 日志记录完整（用于调试）

### Phase 7: 测试与验收（2026-02-17）

**任务 WS-30.1: 完成测试场景清单**

- [ ] **正常场景测试**：
  - 有联系人数据时生成完整输出
  - 输出符合 Schema 校验
  - 所有字段都有值
- [ ] **空数据场景测试**：
  - 无联系人时返回空集合 + 友好提示
  - 无交互记录时正常处理
- [ ] **Schema 校验失败测试**：
  - Mock LLM 返回无效输出
  - 验证错误处理逻辑
- [ ] **缓存测试**：
  - 首次请求生成并缓存
  - 12h 内重复请求命中缓存
  - 12h 后自动失效
  - `forceRefresh=true` 跳过缓存
- [ ] **集成测试**：
  - 端到端测试（从 API 到数据库）
  - 验证与 Runtime 核心模块集成

**验收标准**：
- ✅ 单元测试覆盖率 > 80%
- ✅ 所有测试场景通过
- ✅ 集成测试验证端到端流程
- ✅ 性能测试验证缓存效果（响应时间 < 100ms 当缓存命中）

## 五、依赖检查清单

在开始实现前，确保以下依赖已完成：

### 5.1 Runtime 核心模块（必须）

- [ ] `agent-runtime-core-contracts` 已完成：
  - ✅ `AgentDefinitionRegistry` 可用
  - ✅ `PromptTemplateRenderer` 可用
  - ✅ `TemplateContextBuilder` 抽象可用
  - ✅ `OutputValidator` 可用
- [ ] `agent-runtime-storage-cache` 已完成：
  - ✅ `SnapshotService` 可用
  - ✅ `agent_snapshots` 表已创建
  - ✅ 缓存读写接口可用

### 5.2 数据服务（必须）

- [ ] `ContactService` 可用（查询用户联系人）
- [ ] `InteractionService` 或 `ConversationService` 可用（查询交互记录）

### 5.3 基础设施（必须）

- [ ] 数据库连接正常（PostgreSQL）
- [ ] LLM Provider 配置正常（OpenAI-compatible）
- [ ] 日志系统可用

## 六、验收标准总结

### 6.1 功能验收

1. ✅ **输出完整性**：返回包含 `followUps`、`recommendations`、`synthesis`、`nextActions` 的完整输出
2. ✅ **Schema 校验**：输出严格符合 `output.schema.json`
3. ✅ **缓存策略**：12h TTL 正常工作，`forceRefresh` 参数生效
4. ✅ **错误处理**：空数据、校验失败等边界情况正确处理
5. ✅ **兼容性**：输出格式与旧 action-panel API 兼容

### 6.2 代码质量验收

1. ✅ **类型安全**：TypeScript 类型完整，无 `any` 扩散
2. ✅ **测试覆盖**：单元测试覆盖率 > 80%，集成测试通过
3. ✅ **文档完整**：代码注释清晰，README 说明使用方法
4. ✅ **目录规范**：代码组织符合项目约定（capabilities/network_action/**）

### 6.3 性能验收

1. ✅ **缓存命中**：相同 sourceHash 在 12h 内响应时间 < 100ms
2. ✅ **首次生成**：无缓存时完整流程 < 5s（取决于 LLM 响应时间）

## 七、风险与应对

### 7.1 技术风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| Runtime 核心模块未完成 | 阻塞 | 提前确认依赖模块进度，必要时先 Mock |
| LLM 输出不稳定 | 高 | 加强 Schema 校验，提供重试机制 |
| 缓存策略性能问题 | 中 | 使用 Redis（如果已部署），否则使用数据库索引优化 |

### 7.2 集成风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 与旧 action-panel 格式不兼容 | 高 | 在 Phase 1 就验证兼容性，必要时添加适配层 |
| 数据服务接口变更 | 中 | 使用接口抽象，便于 Mock 和替换 |

## 八、后续工作（Out of Scope）

本模块完成后，以下工作由其他模块负责：

1. **API 端点集成**（`agent-api-run-legacy-bridge`）：
   - 创建 `POST /v1/agent/run` 端点
   - 桥接到旧 `action-panel` 端点
   - 处理流式输出（如果需要）

2. **前端集成**（前端模块）：
   - 调用新 API 端点
   - 展示 network action 结果
   - 处理缓存状态显示

## 九、时间计划

| 日期 | 阶段 | 任务 | 负责人 |
|------|------|------|--------|
| 2026-02-13 | Phase 1-2 | WS-10: 契约定义 + 错误处理 | 业务工程师 B |
| 2026-02-14 | Phase 3 | WS-20.1: 模板与策略资产（开始） | 业务工程师 B |
| 2026-02-15 | Phase 3-4 | WS-20.1: 模板资产（完成）+ 上下文构建 | 业务工程师 B |
| 2026-02-16 | Phase 5-6 | WS-20.2: 缓存策略 + 服务层集成 | 业务工程师 B |
| 2026-02-17 | Phase 7 | WS-30: 测试与验收 | 业务工程师 B + QA |

**里程碑检查点**：
- 2026-02-14 晚：检查模板资产是否完成
- 2026-02-16 晚：检查核心逻辑是否完成
- 2026-02-17 晚：完成所有测试，准备集成

## 十、参考资料

- [Multi-Agent 统一方案总览](../friendsai-backend-multi-agent-unified-openspec-plan.md)
- [项目上下文](../../openspec/project.md)
- [Network Action Agent Spec](../../openspec/changes/agent-capability-network-action/specs/network-action-agent/spec.md)
- [Runtime Core Contracts Spec](../../openspec/changes/agent-runtime-core-contracts/specs/agent-runtime-core/spec.md)

---

**文档版本**: 1.0  
**最后更新**: 2026-02-09  
**维护者**: 业务工程师 B




