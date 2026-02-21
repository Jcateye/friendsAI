# Agent API 职责边界

## `/v1/agent/chat` vs `/v1/agent/run`

### `/v1/agent/chat` - 流式对话端点

**用途**: 用于实时对话场景，支持流式输出（SSE）和工具调用。

**特点**:
- 流式输出（Server-Sent Events）
- 支持 `format=vercel-ai`（AI SDK v6 UI Message Stream 协议）
- 支持工具调用（tool_calls）
- 自动管理对话历史
- 隐式使用 `chat_conversation` agent

**请求格式**:
```typescript
{
  messages?: AgentChatMessage[];
  prompt?: string;
  context?: {
    composer?: {
      enabledTools?: string[];
      attachments?: Array<{
        name: string;
        mimeType?: string;
        size?: number;
        kind: 'image' | 'file';
      }>;
      feishuEnabled?: boolean;
      inputMode?: 'text' | 'voice';
    };
    // 允许业务透传其它上下文字段
    [key: string]: unknown;
  };
  llm?: {
    provider: 'openai' | 'claude' | 'gemini' | 'openai-compatible';
    model: string;
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
    seed?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    providerOptions?: Record<string, Record<string, unknown>>;
  };
  userId?: string;
  conversationId?: string;
  sessionId?: string;
}
```

**响应**: SSE 流式事件（agent.start, agent.delta, agent.message, tool.state, agent.end）

**`format=vercel-ai` 协议说明**:
- `Content-Type: text/event-stream; charset=utf-8`
- Header: `x-vercel-ai-ui-message-stream: v1`
- Body: `data: {...}` chunk 流 + 结尾 `data: [DONE]`

**兼容约束**:
- 顶层旧字段 `model`、`temperature`、`maxTokens`、`max_tokens` 已下线。
- 这些字段若出现在 `/v1/agent/chat` 或 `/v1/agent/run` 请求体中，会返回 `400 invalid_llm_request`。

**`context.composer` 约定**:
- 用于承载前端聊天输入区（工具、多媒体、模式）元信息，仅透传元数据，不上传二进制内容。
- 后端会对该字段做安全清洗（长度裁剪、数组上限、未知字段丢弃），避免污染 prompt。
- 当 `enabledTools` 有值时，编排层会优先按该列表过滤工具；若过滤为空，会自动回退到默认工具集。

**示例**:
```json
{
  "messages": [
    { "role": "user", "content": "帮我发一条飞书模板消息给客户" }
  ],
  "context": {
    "composer": {
      "enabledTools": ["feishu_send_template_message"],
      "attachments": [
        { "name": "meeting-notes.pdf", "mimeType": "application/pdf", "size": 20480, "kind": "file" }
      ],
      "feishuEnabled": true,
      "inputMode": "text"
    }
  }
}
```

### `/v1/agent/run` - 统一执行入口

**用途**: 用于执行预定义的 Agent 能力，支持缓存和批量操作。

**特点**:
- 同步响应（JSON）
- 支持缓存机制（useCache, forceRefresh）
- 支持多个 agentId 和 operation
- 输出验证（schema validation）
- 快照管理

**请求格式**:
```typescript
{
  agentId: 'archive_brief' | 'title_summary' | 'network_action' | 'contact_insight' | 'chat_conversation';
  operation?: string | null;
  input: Record<string, unknown>;
  options?: {
    useCache?: boolean;
    forceRefresh?: boolean;
  };
  llm?: {
    provider: 'openai' | 'claude' | 'gemini' | 'openai-compatible';
    model: string;
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
    seed?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    providerOptions?: Record<string, Record<string, unknown>>;
  };
  userId?: string;
  conversationId?: string;
  sessionId?: string;
}
```

**响应格式**:
```typescript
{
  runId: string;
  agentId: string;
  operation: string | null;
  cached: boolean;
  snapshotId?: string;
  generatedAt: string; // ISO 8601
  generatedAtMs: number;
  data: Record<string, unknown>;
}
```

## 使用场景

### 使用 `/v1/agent/chat` 当:
- 需要实时流式对话
- 需要工具调用交互
- 需要前端 Assistant-UI 集成
- 需要 AI SDK v6 UI Message Stream 兼容

### 使用 `/v1/agent/run` 当:
- 需要执行预定义的 Agent 能力（brief, archive, insight 等）
- 需要利用缓存机制
- 需要批量处理
- 需要同步响应

## Legacy 端点桥接

以下 legacy 端点已桥接到 `/v1/agent/run`:

- `GET/POST /contacts/:id/brief` → `agentId: 'archive_brief', operation: 'brief_generate'`
- `POST /conversations/:id/archive` → `agentId: 'archive_brief', operation: 'archive_extract'`
- `GET /action-panel/dashboard` → `agentId: 'network_action'`

所有 legacy 端点保持响应格式不变，确保向后兼容。
