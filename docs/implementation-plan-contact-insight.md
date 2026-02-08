# FriendsAI Multi-Agent 统一方案落地实现计划

## 文档概述

本文档基于 `friendsai-backend-multi-agent-unified-openspec-plan.md` 和 `openspec/project.md`，结合 `agent-capability-contact-insight` 的具体实现要求，提供详细的落地实施计划。

## 一、整体架构与模块依赖

### 1.1 模块结构（8个 Change）

```
agent-template-runtime (Program 总览)
├── agent-runtime-core-contracts (Runtime 核心契约)
├── agent-runtime-storage-cache (存储缓存)
├── agent-capability-archive-brief (归档简报能力)
├── agent-capability-network-action (网络行动能力)
├── agent-capability-contact-insight (联系人洞察能力) ⭐
├── agent-capability-title-summary (标题摘要能力)
└── agent-api-run-legacy-bridge (API 桥接)
```

### 1.2 实现顺序与依赖关系

```
阶段1: 基础 Runtime（并行）
├── agent-runtime-core-contracts (2026-02-10 ~ 2026-02-12)
└── agent-runtime-storage-cache (2026-02-10 ~ 2026-02-12)

阶段2: Capability 实现（并行）
├── agent-capability-archive-brief (2026-02-13 ~ 2026-02-17)
├── agent-capability-network-action (2026-02-13 ~ 2026-02-17)
├── agent-capability-contact-insight (2026-02-13 ~ 2026-02-17) ⭐
└── agent-capability-title-summary (2026-02-13 ~ 2026-02-17)

阶段3: 集成与桥接
└── agent-api-run-legacy-bridge (2026-02-18 ~ 2026-02-23)
```

### 1.3 关键约束

1. **模板语法**: Mustache（无逻辑模板）
2. **模板来源**: 代码库文件（Git 管理）
3. **缺变量策略**: 告警 + defaults 注入
4. **Agent 定义**: JSON 格式
5. **Memory 策略**: 声明式定义，由 Runtime 执行
6. **Tool 策略**: 白名单 + 最小权限
7. **输出校验**: schema 校验失败直接报错并记录
8. **API 设计**: 保留 `/v1/agent/chat`，新增 `/v1/agent/run`

## 二、阶段1: Runtime 核心实现

### 2.1 agent-runtime-core-contracts

#### 2.1.1 实现目标
- 定义 Agent 定义加载机制
- 实现 Mustache 模板渲染
- 实现上下文构建
- 实现输出校验抽象

#### 2.1.2 代码结构

```
packages/server-nestjs/src/agent/
├── contracts/
│   ├── agent-definition.types.ts      # AgentDefinition 类型定义
│   ├── agent-registry.types.ts        # Registry 相关类型
│   └── runtime-context.types.ts       # RuntimeContext 类型
├── runtime/
│   ├── agent-definition-registry.service.ts  # 定义加载服务
│   ├── prompt-template-renderer.service.ts    # 模板渲染服务
│   ├── template-context-builder.service.ts   # 上下文构建服务
│   ├── memory-runtime.service.ts              # Memory 运行时抽象
│   ├── tool-runtime.service.ts                # Tool 运行时抽象
│   └── output-validator.service.ts            # 输出校验服务
└── assets/
    └── agents/                              # Agent 定义目录
        ├── contact_insight/
        │   ├── agent.json                   # Agent 定义
        │   ├── templates/
        │   │   ├── system.mustache
        │   │   └── user.mustache
        │   ├── defaults.json                # 默认值配置
        │   └── schemas/
        │       ├── input.schema.json
        │       └── output.schema.json
        └── ... (其他 agent)
```

#### 2.1.3 关键实现点

**AgentDefinition 类型**:
```typescript
interface AgentDefinition {
  id: string;
  version: string;
  prompt: {
    systemTemplate: string;      // 模板文件路径
    userTemplate: string;
    defaultsFile?: string;
  };
  memory?: {
    strategy: 'conversation' | 'contact' | 'custom';
    maxTokens?: number;
  };
  tools?: {
    mode: 'allowlist' | 'denylist';
    allowedTools?: string[];
  };
  validation: {
    inputSchema?: string;         // JSON Schema 文件路径
    outputSchema: string;
  };
  cache?: {
    ttl?: number;                 // 缓存 TTL（秒）
  };
}
```

**模板渲染策略**:
- 使用 `mustache` 库渲染模板
- 缺失变量记录 warning，从 `defaults.json` 注入默认值
- 支持嵌套对象访问（如 `{{contact.name}}`）

**输出校验**:
- 使用 `ajv` 或 `zod` 进行 JSON Schema 校验
- 校验失败返回标准错误对象：`{ code: 'output_validation_failed', details: [...] }`

#### 2.1.4 验收标准
- [ ] 可通过 `agentId` 加载完整 Agent 定义资产
- [ ] 模板渲染支持缺变量告警与默认值注入
- [ ] tools policy 支持 allowlist 过滤
- [ ] 输出 schema 校验失败返回标准错误对象

### 2.2 agent-runtime-storage-cache

#### 2.2.1 实现目标
- 实现 `agent_snapshots` 表结构
- 实现 sourceHash + TTL 缓存策略
- 实现 `conversations.summary` 字段扩展

#### 2.2.2 数据库迁移

**agent_snapshots 表**:
```sql
CREATE TABLE agent_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(255) NOT NULL,
  source_hash VARCHAR(64) NOT NULL,  -- SHA256 hash
  user_id UUID NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB NOT NULL,
  created_at BIGINT NOT NULL,         -- epoch milliseconds
  expires_at BIGINT NOT NULL,         -- epoch milliseconds
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_agent_snapshots_lookup ON agent_snapshots(agent_id, source_hash, user_id);
CREATE INDEX idx_agent_snapshots_expires ON agent_snapshots(expires_at);
```

**conversations.summary 字段**:
```sql
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS summary TEXT;
```

#### 2.2.3 缓存服务实现

```typescript
@Injectable()
export class AgentSnapshotService {
  async getSnapshot(
    agentId: string,
    sourceHash: string,
    userId: string
  ): Promise<AgentSnapshot | null> {
    // 查询未过期的快照
  }

  async saveSnapshot(
    agentId: string,
    sourceHash: string,
    userId: string,
    input: any,
    output: any,
    ttl: number
  ): Promise<AgentSnapshot> {
    // 保存快照，计算 expires_at
  }

  async computeSourceHash(input: any): Promise<string> {
    // 计算输入数据的 SHA256 hash
  }
}
```

#### 2.2.4 验收标准
- [ ] `agent_snapshots` 表结构正确，索引有效
- [ ] sourceHash 计算一致，支持缓存命中
- [ ] TTL 过期策略正确执行
- [ ] `conversations.summary` 字段可读写

## 三、阶段2: contact_insight Capability 实现

### 3.1 实现范围

**独占路径**: `packages/server-nestjs/src/agent/capabilities/contact_insight/**`

**依赖**: 
- `agent-runtime-core-contracts` (必须)
- `agent-runtime-storage-cache` (必须)

### 3.2 实现步骤

#### WS-10: 契约设计（2026-02-13）

**任务 10.1: 定义输入输出 schema**

创建文件:
- `packages/server-nestjs/src/agent/assets/agents/contact_insight/schemas/input.schema.json`
- `packages/server-nestjs/src/agent/assets/agents/contact_insight/schemas/output.schema.json`

**输入 Schema**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["userId", "contactId"],
  "properties": {
    "userId": { "type": "string" },
    "contactId": { "type": "string" },
    "depth": {
      "type": "string",
      "enum": ["brief", "standard", "deep"],
      "default": "standard"
    },
    "forceRefresh": {
      "type": "boolean",
      "default": false
    }
  }
}
```

**输出 Schema**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "profileSummary",
    "relationshipSignals",
    "opportunities",
    "risks",
    "suggestedActions",
    "openingLines",
    "citations"
  ],
  "properties": {
    "profileSummary": { "type": "string" },
    "relationshipSignals": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "description"],
        "properties": {
          "type": { "type": "string" },
          "description": { "type": "string" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    },
    "opportunities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title", "description", "priority"],
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "priority": { "type": "string", "enum": ["low", "medium", "high"] },
          "citations": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "risks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title", "description", "severity"],
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "severity": { "type": "string", "enum": ["low", "medium", "high"] },
          "citations": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "suggestedActions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["action", "reason", "priority"],
        "properties": {
          "action": { "type": "string" },
          "reason": { "type": "string" },
          "priority": { "type": "string", "enum": ["low", "medium", "high"] },
          "citations": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "openingLines": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["line", "context"],
        "properties": {
          "line": { "type": "string" },
          "context": { "type": "string" },
          "citations": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "citations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "reference"],
        "properties": {
          "type": { "type": "string", "enum": ["message", "conversation", "event", "fact"] },
          "reference": { "type": "string" },
          "span": { "type": "string" }
        }
      }
    }
  }
}
```

**任务 10.2: 定义引用字段规范**

创建文档: `packages/server-nestjs/src/agent/capabilities/contact_insight/CITATIONS.md`

引用格式规范:
- `type`: `message` | `conversation` | `event` | `fact`
- `reference`: 资源 ID（如 messageId, conversationId, eventId）
- `span`: 可选，文本片段标识（用于 message 引用）

#### WS-20: 策略设计（2026-02-14 ~ 2026-02-16）

**任务 20.1: 定义模板和上下文策略**

创建文件:
- `packages/server-nestjs/src/agent/assets/agents/contact_insight/agent.json`
- `packages/server-nestjs/src/agent/assets/agents/contact_insight/templates/system.mustache`
- `packages/server-nestjs/src/agent/assets/agents/contact_insight/templates/user.mustache`
- `packages/server-nestjs/src/agent/assets/agents/contact_insight/defaults.json`

**agent.json**:
```json
{
  "id": "contact_insight",
  "version": "1.0.0",
  "prompt": {
    "systemTemplate": "templates/system.mustache",
    "userTemplate": "templates/user.mustache",
    "defaultsFile": "defaults.json"
  },
  "memory": {
    "strategy": "contact",
    "maxTokens": 4000
  },
  "tools": {
    "mode": "allowlist",
    "allowedTools": []
  },
  "validation": {
    "inputSchema": "schemas/input.schema.json",
    "outputSchema": "schemas/output.schema.json"
  },
  "cache": {
    "ttl": 21600
  }
}
```

**上下文构建服务**:
```typescript
@Injectable()
export class ContactInsightContextBuilder {
  constructor(
    private contactRepository: Repository<Contact>,
    private conversationRepository: Repository<Conversation>,
    private archiveRepository: Repository<Archive>,
  ) {}

  async buildContext(
    userId: string,
    contactId: string,
    depth: 'brief' | 'standard' | 'deep'
  ): Promise<ContactInsightContext> {
    // 1. 加载联系人基本信息
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, userId }
    });
    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    // 2. 加载最近交互（conversations）
    const recentConversations = await this.conversationRepository.find({
      where: { contactId, userId },
      order: { createdAt: 'DESC' },
      take: depth === 'brief' ? 5 : depth === 'standard' ? 10 : 20
    });

    // 3. 加载归档数据（events/facts/todos）
    const archives = await this.archiveRepository.find({
      where: { contactId, userId },
      order: { createdAt: 'DESC' },
      take: depth === 'brief' ? 10 : depth === 'standard' ? 20 : 50
    });

    // 4. 构建上下文对象
    return {
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        company: contact.company,
        title: contact.title,
        tags: contact.tags,
        lastInteractionAt: contact.lastInteractionAt,
        // ... 其他字段
      },
      recentInteractions: recentConversations.map(c => ({
        id: c.id,
        summary: c.summary,
        createdAt: c.createdAt,
        // ... 其他字段
      })),
      archivedData: {
        events: archives.filter(a => a.type === 'event'),
        facts: archives.filter(a => a.type === 'fact'),
        todos: archives.filter(a => a.type === 'todo'),
      },
      depth
    };
  }
}
```

**任务 20.2: 定义缓存策略**

实现缓存逻辑:
- TTL: 6小时（21600秒）
- sourceHash: 基于 `userId + contactId + depth` 计算
- `forceRefresh=true` 时绕过缓存

#### WS-30: 验收场景（2026-02-17）

**任务 30.1: 定义核心测试场景**

创建测试文件: `packages/server-nestjs/src/agent/capabilities/contact_insight/contact-insight.service.spec.ts`

测试场景:
1. **Contact not found**: 返回 404
2. **Normal output**: 生成完整洞察，包含所有必需字段
3. **Schema fail**: LLM 输出不符合 schema，返回验证错误
4. **Cache hit**: 相同输入命中缓存，返回缓存结果
5. **Cache miss**: 缓存未命中，执行 LLM 调用
6. **Force refresh**: `forceRefresh=true` 时绕过缓存

### 3.3 代码实现结构

```
packages/server-nestjs/src/agent/capabilities/contact_insight/
├── contact-insight.service.ts              # 主服务
├── contact-insight-context-builder.service.ts  # 上下文构建
├── contact-insight.service.spec.ts         # 单元测试
└── contact-insight.types.ts                # 类型定义
```

**contact-insight.service.ts**:
```typescript
@Injectable()
export class ContactInsightService {
  constructor(
    private definitionRegistry: AgentDefinitionRegistry,
    private templateRenderer: PromptTemplateRenderer,
    private contextBuilder: ContactInsightContextBuilder,
    private snapshotService: AgentSnapshotService,
    private outputValidator: OutputValidator,
    private aiService: AiService,
  ) {}

  async generateInsight(
    userId: string,
    contactId: string,
    options?: { depth?: 'brief' | 'standard' | 'deep', forceRefresh?: boolean }
  ): Promise<ContactInsightOutput> {
    // 1. 加载 Agent 定义
    const bundle = await this.definitionRegistry.loadDefinition('contact_insight');

    // 2. 构建输入并计算 sourceHash
    const input = { userId, contactId, depth: options?.depth || 'standard' };
    const sourceHash = await this.snapshotService.computeSourceHash(input);

    // 3. 检查缓存（除非 forceRefresh）
    if (!options?.forceRefresh) {
      const cached = await this.snapshotService.getSnapshot(
        'contact_insight',
        sourceHash,
        userId
      );
      if (cached) {
        return cached.output_data as ContactInsightOutput;
      }
    }

    // 4. 构建上下文
    const context = await this.contextBuilder.buildContext(
      userId,
      contactId,
      input.depth
    );

    // 5. 渲染模板
    const renderResult = await this.templateRenderer.render(
      bundle,
      context
    );

    // 6. 调用 LLM
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: renderResult.systemPrompt },
      { role: 'user', content: renderResult.userPrompt },
    ];

    const response = await this.aiService.streamChat(messages, {
      model: 'gpt-4',
      temperature: 0.7,
    });

    // 收集完整响应
    let fullResponse = '';
    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
      }
    }

    // 7. 解析 JSON 输出
    let output: ContactInsightOutput;
    try {
      output = JSON.parse(fullResponse);
    } catch (e) {
      throw new BadRequestException('LLM output is not valid JSON');
    }

    // 8. 校验输出
    const validationResult = await this.outputValidator.validate(
      bundle,
      output
    );
    if (!validationResult.valid) {
      throw new BadRequestException({
        code: 'output_validation_failed',
        details: validationResult.errors,
      });
    }

    // 9. 保存缓存
    await this.snapshotService.saveSnapshot(
      'contact_insight',
      sourceHash,
      userId,
      input,
      output,
      bundle.definition.cache?.ttl || 21600
    );

    return output;
  }
}
```

### 3.4 验收标准

- [ ] 输出至少包含 `profileSummary`/`opportunities`/`risks`/`suggestedActions`/`openingLines`/`citations`
- [ ] schema 失败时明确报错
- [ ] 默认 TTL 6h 策略明确
- [ ] 所有测试场景通过

## 四、阶段3: API 桥接与集成

### 4.1 agent-api-run-legacy-bridge

#### 4.1.1 实现目标
- 实现 `POST /v1/agent/run` 统一入口
- 保持 `POST /v1/agent/chat` 兼容
- 桥接旧端点到新能力

#### 4.1.2 API 实现

**新增 `/v1/agent/run` 端点**:
```typescript
@Post('run')
async run(@Body() request: AgentRunRequest): Promise<AgentRunResponse> {
  const { agentId, operation, options } = request;

  switch (agentId) {
    case 'contact_insight':
      const insight = await this.contactInsightService.generateInsight(
        request.userId,
        options.contactId,
        { depth: options.depth, forceRefresh: options.forceRefresh }
      );
      return { success: true, data: insight };

    case 'archive_brief':
      // ...

    default:
      throw new BadRequestException(`Unknown agent: ${agentId}`);
  }
}
```

#### 4.1.3 验收标准
- [ ] `/v1/agent/run` 可调用所有 capability
- [ ] `/v1/agent/chat` 保持向后兼容
- [ ] 旧端点正确映射到新能力

## 五、实施时间线

### 5.1 详细时间表

| 日期 | 阶段 | 任务 | 负责人 |
|------|------|------|--------|
| 2026-02-10 | Runtime Core | 契约与注册 | Runtime 平台负责人 |
| 2026-02-10 | Storage Cache | 模型设计 | Runtime 平台负责人 |
| 2026-02-11 | Runtime Core | 模板与上下文 | Runtime 平台负责人 |
| 2026-02-11 | Storage Cache | 缓存策略 | Runtime 平台负责人 |
| 2026-02-12 | Runtime Core | 校验与测试 | Runtime 平台负责人 |
| 2026-02-12 | Storage Cache | 验收场景 | Runtime 平台负责人 |
| 2026-02-13 | contact_insight | WS-10 契约设计 | 业务工程师 C |
| 2026-02-14 | contact_insight | WS-20 策略设计（开始） | 业务工程师 C |
| 2026-02-15 | contact_insight | WS-20 策略设计（继续） | 业务工程师 C |
| 2026-02-16 | contact_insight | WS-20 策略设计（完成） | 业务工程师 C |
| 2026-02-17 | contact_insight | WS-30 验收场景 | 业务工程师 C |
| 2026-02-18 | API Bridge | WS-10 API 契约 | 集成工程师 |
| 2026-02-19 | API Bridge | WS-10 API 契约（完成） | 集成工程师 |
| 2026-02-20 | API Bridge | WS-20 Legacy 映射（开始） | 集成工程师 |
| 2026-02-21 | API Bridge | WS-20 Legacy 映射（继续） | 集成工程师 |
| 2026-02-22 | API Bridge | WS-20 Legacy 映射（完成） | 集成工程师 |
| 2026-02-23 | API Bridge | WS-30 集成门禁 | 集成工程师 |

### 5.2 关键里程碑

- **M1 (2026-02-12)**: Runtime Core + Storage Cache 完成
- **M2 (2026-02-17)**: 所有 Capability 完成
- **M3 (2026-02-23)**: API Bridge 完成，整体集成完成

## 六、风险与应对

### 6.1 技术风险

1. **模板渲染性能**: Mustache 渲染大量数据可能较慢
   - 应对: 限制上下文大小，使用分页加载

2. **LLM 输出格式不稳定**: 可能返回不符合 schema 的 JSON
   - 应对: 加强 prompt 设计，使用结构化输出模式（如 OpenAI 的 `response_format`）

3. **缓存一致性**: 数据更新后缓存未失效
   - 应对: 实现基于数据变更的缓存失效机制

### 6.2 协作风险

1. **共享文件冲突**: 多人修改同一文件
   - 应对: 严格执行独占路径原则，bridge change 最后合并

2. **接口契约不一致**: 不同模块对同一接口理解不同
   - 应对: 在 Runtime Core 中明确定义接口契约，各模块严格遵循

## 七、验收检查清单

### 7.1 Runtime Core
- [ ] AgentDefinition 类型完整
- [ ] 模板渲染支持缺变量告警
- [ ] 输出校验正确工作
- [ ] 单元测试覆盖率 > 80%

### 7.2 Storage Cache
- [ ] `agent_snapshots` 表结构正确
- [ ] 缓存命中/失效逻辑正确
- [ ] `conversations.summary` 字段可用

### 7.3 contact_insight
- [ ] 输入输出 schema 完整
- [ ] 上下文构建正确加载数据
- [ ] 缓存策略正确执行
- [ ] 所有测试场景通过
- [ ] 输出包含所有必需字段

### 7.4 API Bridge
- [ ] `/v1/agent/run` 可调用所有 capability
- [ ] `/v1/agent/chat` 保持兼容
- [ ] 错误处理正确

## 八、后续优化方向

1. **性能优化**: 
   - 实现批量上下文加载
   - 优化模板渲染性能
   - 实现更智能的缓存策略

2. **功能增强**:
   - 支持增量更新洞察
   - 支持自定义洞察维度
   - 支持洞察版本管理

3. **可观测性**:
   - 添加详细的日志记录
   - 实现性能监控
   - 实现错误追踪

---

**文档版本**: 1.0  
**最后更新**: 2026-02-09  
**维护者**: FriendsAI 开发团队




