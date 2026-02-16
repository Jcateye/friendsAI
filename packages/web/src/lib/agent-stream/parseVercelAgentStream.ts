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

export function parseVercelAgentCustomDataLine(
  line: string,
): ParsedVercelAgentCustomData | null {
  if (!line.startsWith('2:')) {
    return null;
  }

  const payload = line.slice(2);
  let decoded: unknown;
  try {
    decoded = JSON.parse(payload);
  } catch {
    return null;
  }

  const events = Array.isArray(decoded) ? decoded : [decoded];
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
        toolName: typeof event.toolName === 'string' ? event.toolName : undefined,
        confirmationId:
          typeof event.confirmationId === 'string' ? event.confirmationId : undefined,
        input: event.input,
        message: typeof event.message === 'string' ? event.message : undefined,
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
