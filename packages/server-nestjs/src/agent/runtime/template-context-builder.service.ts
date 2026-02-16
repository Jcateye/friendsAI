import { Injectable } from '@nestjs/common';
import type { RuntimeContext } from '../contracts/runtime.types';
import type { AgentRunRequest as ApiAgentRunRequest } from '../agent.types';

/**
 * 模板上下文构建器
 * 将请求输入转换为运行时上下文
 */
@Injectable()
export class TemplateContextBuilder {
  /**
   * 构建运行时上下文
   * @param request Agent 运行请求（来自 API）
   * @param additionalContext 额外的上下文数据（可选）
   * @returns 运行时上下文
   */
  buildContext(
    request: ApiAgentRunRequest,
    additionalContext?: Record<string, unknown>
  ): RuntimeContext {
    const context: RuntimeContext = {
      // Agent ID 和操作类型
      agentId: request.agentId,
      operation: request.operation ?? null,
      // 输入数据（展开到顶层，方便模板使用）
      ...request.input,
      // 基础字段
      input: request.input,
      userId: request.userId,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      // 运行选项
      options: request.options,
      // 额外的上下文数据（优先级最高）
      ...additionalContext,
    };

    // 移除 undefined 值
    return this.removeUndefined(context);
  }

  /**
   * 移除上下文中的 undefined 值
   */
  private removeUndefined(obj: RuntimeContext): RuntimeContext {
    const result: RuntimeContext = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const cleaned = this.removeUndefined(value as RuntimeContext);
          if (Object.keys(cleaned).length > 0) {
            result[key] = cleaned;
          }
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }
}
