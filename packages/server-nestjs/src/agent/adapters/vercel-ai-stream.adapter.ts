import type { AgentStreamEvent } from '../agent.types';
import type {
  AgentError,
  AgentMessage,
  AgentMessageDelta,
  ToolStateUpdate,
  AgentContextPatch,
} from '../client-types';
import { generateUlid } from '../../utils/ulid';

/**
 * Vercel AI SDK v6 — UI Message Stream Protocol Adapter
 *
 * 将 AgentStreamEvent 转换为 AI SDK v6 的 UI Message Stream Protocol 格式。
 *
 * v6 使用 SSE (Server-Sent Events) 格式，每行 `data: <JSON>\n\n`，
 * JSON 遵循 UIMessageChunk schema：
 *
 *   - { type: "start", messageId?: string }
 *   - { type: "text-start", id: string }
 *   - { type: "text-delta", id: string, delta: string }
 *   - { type: "text-end", id: string }
 *   - { type: "tool-input-available", toolCallId, toolName, input, dynamic: true }
 *   - { type: "tool-output-available", toolCallId, output, dynamic: true }
 *   - { type: "tool-output-error", toolCallId, errorText, dynamic: true }
 *   - { type: "finish", finishReason: "stop" | "error" | ... }
 *   - { type: "error", errorText: string }
 *   - data: [DONE]
 *
 * 参考: https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol#ui-message-stream-protocol
 */
export class VercelAiStreamAdapter {
  private textPartId: string | null = null;
  private messageStarted = false;
  private messageId: string | null = null;

  /**
   * 转换事件为 AI SDK v6 UI Message Stream 格式
   * @returns SSE 格式化的字符串，或 null（忽略事件）
   */
  transform(event: AgentStreamEvent): string | null {
    switch (event.event) {
      case 'agent.start':
        return this.transformStart();

      case 'agent.delta':
        return this.transformTextDelta(event.data);

      case 'agent.message':
        return this.transformMessageComplete(event.data);

      case 'tool.state':
        return this.transformToolState(event.data);

      case 'error':
        return this.transformError(event.data);

      case 'context.patch':
        return this.transformContextPatch(event.data);

      case 'agent.end':
        return this.transformEnd();

      case 'ping':
        return null;

      default:
        return null;
    }
  }

  /**
   * 返回流结束标记
   */
  done(): string {
    return 'data: [DONE]\n\n';
  }

  // ── 内部方法 ──────────────────────────────────────────────

  private sse(chunk: Record<string, unknown>): string {
    return `data: ${JSON.stringify(chunk)}\n\n`;
  }

  private transformStart(): string {
    this.messageId = generateUlid();
    this.messageStarted = true;
    return this.sse({ type: 'start', messageId: this.messageId });
  }

  /**
   * agent.delta → text-start (首次) + text-delta
   */
  private transformTextDelta(delta: AgentMessageDelta): string {
    const parts: string[] = [];

    // 确保 message 已经 start
    if (!this.messageStarted) {
      this.messageId = generateUlid();
      this.messageStarted = true;
      parts.push(this.sse({ type: 'start', messageId: this.messageId }));
    }

    // 如果是第一个文本 part，先发 text-start
    if (!this.textPartId) {
      this.textPartId = generateUlid();
      parts.push(this.sse({ type: 'text-start', id: this.textPartId }));
    }

    parts.push(
      this.sse({ type: 'text-delta', id: this.textPartId, delta: delta.delta }),
    );

    return parts.join('');
  }

  /**
   * agent.message → text-end + finish
   */
  private transformMessageComplete(_message: AgentMessage): string {
    const parts: string[] = [];

    // 关闭打开的文本 part
    if (this.textPartId) {
      parts.push(this.sse({ type: 'text-end', id: this.textPartId }));
      this.textPartId = null;
    }

    parts.push(this.sse({ type: 'finish', finishReason: 'stop' }));

    return parts.join('');
  }

  /**
   * tool.state → tool-input-available / tool-output-available / tool-output-error
   */
  private transformToolState(update: ToolStateUpdate): string | null {
    const parts: string[] = [];

    switch (update.status) {
      case 'running':
      case 'queued':
        // 先关闭打开的文本 part
        if (this.textPartId) {
          parts.push(this.sse({ type: 'text-end', id: this.textPartId }));
          this.textPartId = null;
        }
        parts.push(
          this.sse({
            type: 'tool-input-available',
            toolCallId: update.toolId,
            toolName: update.name,
            input: update.input || {},
            dynamic: true,
          }),
        );
        return parts.join('');

      case 'succeeded':
        parts.push(
          this.sse({
            type: 'tool-output-available',
            toolCallId: update.toolId,
            output: update.output ?? null,
            dynamic: true,
          }),
        );
        return parts.join('');

      case 'failed':
        parts.push(
          this.sse({
            type: 'tool-output-error',
            toolCallId: update.toolId,
            errorText:
              update.error?.message ||
              update.message ||
              'Tool execution failed',
            dynamic: true,
          }),
        );
        return parts.join('');

      case 'awaiting_input':
        // 通过 data- 自定义事件透传 confirmationId 等信息
        parts.push(
          this.sse({
            type: 'data-tool-awaiting-input',
            id: update.toolId,
            data: {
              toolCallId: update.toolId,
              toolName: update.name,
              confirmationId: update.confirmationId,
              input: update.input || {},
              message: update.message,
            },
          }),
        );
        return parts.join('');

      default:
        return null;
    }
  }

  /**
   * error → { type: "error", errorText: string }
   */
  private transformError(error: AgentError): string {
    return this.sse({ type: 'error', errorText: error.message });
  }

  /**
   * context.patch → data-* 自定义事件
   * 用于传递 conversationId 等上下文信息给前端
   */
  private transformContextPatch(patch: AgentContextPatch): string | null {
    if (patch.layer === 'session' && patch.patch.conversationId) {
      return this.sse({
        type: 'data-conversation-created',
        id: generateUlid(),
        data: {
          type: 'conversation.created',
          conversationId: patch.patch.conversationId,
        },
      });
    }
    return null;
  }

  /**
   * agent.end → 关闭所有打开的 part，不重复发 finish（由 agent.message 触发）
   */
  private transformEnd(): string | null {
    const parts: string[] = [];

    // 安全关闭打开的文本 part（如果 agent.message 没有被发出）
    if (this.textPartId) {
      parts.push(this.sse({ type: 'text-end', id: this.textPartId }));
      this.textPartId = null;
    }

    return parts.length > 0 ? parts.join('') : null;
  }
}
