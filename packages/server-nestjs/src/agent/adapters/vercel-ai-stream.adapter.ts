import type { AgentStreamEvent } from '../agent.types';
import type {
  AgentError,
  AgentMessage,
  AgentMessageDelta,
  ToolStateUpdate,
} from '../client-types';

/**
 * Vercel AI SDK Stream Protocol Adapter
 * 
 * 将 AgentStreamEvent 转换为 Vercel AI SDK 兼容的流格式
 * 
 * 格式说明：
 * - 0: 文本增量 (text delta)
 * - d: 消息完成 (data)
 * - 9: 工具调用开始 (tool call)
 * - a: 工具执行结果 (tool result)
 * - 2: 自定义数据 (custom data, 用于 A2UI)
 * - 3: 错误 (error)
 * 
 * 参考: https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol
 */
export class VercelAiStreamAdapter {
  /**
   * 转换事件为 Vercel AI SDK 格式
   * @param event AgentStreamEvent
   * @returns 格式化的字符串，如果事件不需要转换则返回 null
   */
  transform(event: AgentStreamEvent): string | null {
    switch (event.event) {
      case 'agent.delta':
        return this.transformTextDelta(event.data);
      
      case 'agent.message':
        return this.transformMessageComplete(event.data);
      
      case 'tool.state':
        return this.transformToolState(event.data);
      
      case 'error':
        return this.transformError(event.data);
      
      // 以下事件在 Vercel AI SDK 中不需要或通过其他方式处理
      case 'agent.start':
      case 'agent.end':
      case 'context.patch':
      case 'ping':
        return null;
      
      default:
        // 未知事件类型，返回 null 忽略
        return null;
    }
  }

  /**
   * 转换文本增量: agent.delta -> 0:
   * 格式: 0:${JSON.stringify(text)}\n
   */
  private transformTextDelta(delta: AgentMessageDelta): string {
    return `0:${JSON.stringify(delta.delta)}\n`;
  }

  /**
   * 转换消息完成: agent.message -> d:
   * 格式: d:${JSON.stringify({finishReason:'stop'})}\n
   * 
   * 同时检查 metadata 中是否有 A2UI 数据，如果有则发送 2: 事件
   */
  private transformMessageComplete(message: AgentMessage): string {
    const result: string[] = [];
    
    // 发送完成事件
    result.push(`d:${JSON.stringify({ finishReason: 'stop' })}\n`);
    
    // 检查是否有 A2UI 数据
    if (message.metadata?.a2ui) {
      const a2uiData = Array.isArray(message.metadata.a2ui)
        ? message.metadata.a2ui
        : [message.metadata.a2ui];
      
      result.push(`2:${JSON.stringify(a2uiData)}\n`);
    }
    
    return result.join('');
  }

  /**
   * 转换工具状态: tool.state -> 9: 或 a:
   * - running: 9:${JSON.stringify(toolCall)}\n
   * - succeeded: a:${JSON.stringify(result)}\n
   */
  private transformToolState(update: ToolStateUpdate): string | null {
    switch (update.status) {
      case 'running':
      case 'queued':
        // 工具调用开始
        return `9:${JSON.stringify({
          toolCallId: update.toolId,
          toolName: update.name,
          args: update.input || {},
        })}\n`;
      
      case 'succeeded':
        // 工具执行结果
        return `a:${JSON.stringify({
          toolCallId: update.toolId,
          result: update.output || null,
        })}\n`;
      
      case 'failed':
        // 工具执行失败，作为错误处理
        return `3:${JSON.stringify({
          code: update.error?.code || 'tool_error',
          message: update.error?.message || update.message || 'Tool execution failed',
        })}\n`;
      
      case 'awaiting_input':
        // 等待确认，可能需要特殊处理，暂时返回 null
        // 可以通过 metadata 或其他方式传递
        return null;
      
      default:
        // 其他状态不需要转换
        return null;
    }
  }

  /**
   * 转换错误: error -> 3:
   * 格式: 3:${JSON.stringify(errorMessage)}\n
   */
  private transformError(error: AgentError): string {
    return `3:${JSON.stringify(error.message)}\n`;
  }
}



