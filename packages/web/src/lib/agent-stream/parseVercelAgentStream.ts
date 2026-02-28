export interface ParsedAwaitingToolEvent {
  toolCallId: string;
  toolName?: string;
  confirmationId?: string;
  input?: unknown;
  message?: string;
}

export interface ParsedExecutionTraceStep {
  id: string;
  kind: 'agent' | 'tool' | 'skill';
  itemId: string;
  title: string;
  status: string;
  at?: string;
  message?: string;
  input?: unknown;
  output?: unknown;
  error?: unknown;
  runId?: string;
}

export interface ParsedVercelAgentCustomData {
  conversationId?: string;
  awaitingTools: ParsedAwaitingToolEvent[];
  executionSteps: ParsedExecutionTraceStep[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 解析 AI SDK v6 UI Message Stream Protocol 的 SSE data 行。
 *
 * 后端现在发送 `data: <JSON>\n\n` 格式的 SSE 流。
 * 我们在前端拦截中间件中提取自定义事件（conversation-created、tool-awaiting-input）。
 *
 * 同时保持对旧格式 `2:<JSON>` 的向后兼容。
 */
export function parseVercelAgentCustomDataLine(
  line: string,
): ParsedVercelAgentCustomData | null {
  let payload: string | null = null;

  // v6 SSE 格式: "data: {...}"
  if (line.startsWith('data: ')) {
    payload = line.slice(6);
  }
  // 兼容旧的 Data Stream Protocol: "2:[...]"
  else if (line.startsWith('2:')) {
    payload = line.slice(2);
  } else {
    return null;
  }

  // 忽略 [DONE] 标识
  if (payload === '[DONE]') {
    return null;
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(payload);
  } catch {
    return null;
  }

  // v6 格式: 单个 JSON 对象
  if (isRecord(decoded)) {
    return parseSingleChunk(decoded);
  }

  // 旧格式: JSON 数组
  if (Array.isArray(decoded)) {
    return parseLegacyArray(decoded);
  }

  return null;
}

/**
 * 解析 v6 单个 UIMessageChunk JSON 对象
 */
function parseSingleChunk(
  chunk: Record<string, unknown>,
): ParsedVercelAgentCustomData | null {
  // data-conversation-created 自定义事件
  if (
    chunk.type === 'data-conversation-created' &&
    isRecord(chunk.data)
  ) {
    const data = chunk.data;
    if (
      typeof data.conversationId === 'string' &&
      data.conversationId.length > 0
    ) {
      return {
        conversationId: data.conversationId,
        awaitingTools: [],
        executionSteps: [],
      };
    }
  }

  // data-tool-awaiting-input 自定义事件
  if (
    chunk.type === 'data-tool-awaiting-input' &&
    isRecord(chunk.data)
  ) {
    const data = chunk.data;
    if (
      typeof data.toolCallId === 'string' &&
      data.toolCallId.length > 0
    ) {
      return {
        awaitingTools: [
          {
            toolCallId: data.toolCallId,
            toolName:
              typeof data.toolName === 'string' ? data.toolName : undefined,
            confirmationId:
              typeof data.confirmationId === 'string'
                ? data.confirmationId
                : undefined,
            input: data.input,
            message:
              typeof data.message === 'string' ? data.message : undefined,
          },
        ],
        executionSteps: [],
      };
    }
  }

  if (
    chunk.type === 'data-execution-step' &&
    isRecord(chunk.data) &&
    typeof chunk.id === 'string'
  ) {
    const data = chunk.data;
    const kind =
      data.kind === 'agent' || data.kind === 'tool' || data.kind === 'skill'
        ? data.kind
        : undefined;
    const itemId = typeof data.itemId === 'string' ? data.itemId : undefined;
    const title = typeof data.title === 'string' ? data.title : undefined;
    const status = typeof data.status === 'string' ? data.status : undefined;

    if (kind && itemId && title && status) {
      return {
        awaitingTools: [],
        executionSteps: [
          {
            id: chunk.id,
            kind,
            itemId,
            title,
            status,
            at: typeof data.at === 'string' ? data.at : undefined,
            message: typeof data.message === 'string' ? data.message : undefined,
            input: data.input,
            output: data.output,
            error: data.error,
            runId: typeof data.runId === 'string' ? data.runId : undefined,
          },
        ],
      };
    }
  }

  return null;
}

/**
 * 兼容旧格式: 解析 `2:[{...}, ...]` 数组
 */
function parseLegacyArray(
  events: unknown[],
): ParsedVercelAgentCustomData | null {
  let conversationId: string | undefined;
  const awaitingTools: ParsedAwaitingToolEvent[] = [];
  const executionSteps: ParsedExecutionTraceStep[] = [];

  for (const event of events) {
    if (!isRecord(event)) {
      continue;
    }

    if (
      event.type === 'conversation.created' &&
      typeof event.conversationId === 'string' &&
      event.conversationId.length > 0
    ) {
      conversationId = event.conversationId;
      continue;
    }

    if (
      event.type === 'tool.awaiting_input' &&
      typeof event.toolCallId === 'string' &&
      event.toolCallId.length > 0
    ) {
      awaitingTools.push({
        toolCallId: event.toolCallId,
        toolName:
          typeof event.toolName === 'string' ? event.toolName : undefined,
        confirmationId:
          typeof event.confirmationId === 'string'
            ? event.confirmationId
            : undefined,
        input: event.input,
        message:
          typeof event.message === 'string' ? event.message : undefined,
      });
      continue;
    }

    if (
      event.type === 'execution.step' &&
      typeof event.id === 'string' &&
      (event.kind === 'agent' || event.kind === 'tool' || event.kind === 'skill') &&
      typeof event.itemId === 'string' &&
      typeof event.title === 'string' &&
      typeof event.status === 'string'
    ) {
      executionSteps.push({
        id: event.id,
        kind: event.kind,
        itemId: event.itemId,
        title: event.title,
        status: event.status,
        at: typeof event.at === 'string' ? event.at : undefined,
        message: typeof event.message === 'string' ? event.message : undefined,
        input: event.input,
        output: event.output,
        error: event.error,
        runId: typeof event.runId === 'string' ? event.runId : undefined,
      });
    }
  }

  if (!conversationId && awaitingTools.length === 0 && executionSteps.length === 0) {
    return null;
  }

  return {
    conversationId,
    awaitingTools,
    executionSteps,
  };
}
