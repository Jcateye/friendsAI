export interface ParsedAwaitingToolEvent {
  toolCallId: string;
  toolName?: string;
  confirmationId?: string;
  input?: unknown;
  message?: string;
}

export interface ParsedVercelAgentCustomData {
  conversationId?: string;
  awaitingTools: ParsedAwaitingToolEvent[];
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
    }
  }

  if (!conversationId && awaitingTools.length === 0) {
    return null;
  }

  return {
    conversationId,
    awaitingTools,
  };
}
