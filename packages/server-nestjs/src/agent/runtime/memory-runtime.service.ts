import { Injectable, Logger } from '@nestjs/common';
import type { AgentDefinition } from '../contracts/agent-definition.types';
import type { MemoryContext, RuntimeContext } from '../contracts/runtime.types';
import type { IMemoryRuntime } from './memory-runtime.interface';

/**
 * Memory Runtime 实现
 * 根据 Agent 定义和运行时上下文构建记忆上下文
 */
@Injectable()
export class MemoryRuntime implements IMemoryRuntime {
  private readonly logger = new Logger(MemoryRuntime.name);

  /**
   * 构建记忆上下文
   */
  async buildMemory(
    definition: AgentDefinition,
    context: RuntimeContext,
  ): Promise<MemoryContext> {
    const memoryConfig = definition.memory;
    const memoryContext: MemoryContext = {};

    if (!memoryConfig || !memoryConfig.strategy || memoryConfig.strategy === 'none') {
      // 无记忆策略
      return memoryContext;
    }

    // 根据策略构建记忆
    switch (memoryConfig.strategy) {
      case 'conversation': {
        // 从 context 中获取对话历史
        const messages = (context.messages as Array<{
          role: string;
          content: string;
          [key: string]: unknown;
        }>) || [];
        memoryContext.messages = this.limitMessages(messages, memoryConfig.maxTokens);
        break;
      }
      case 'contact': {
        // 从 context 中获取联系人相关记忆
        const contact = context.contact as Record<string, unknown> | undefined;
        if (contact) {
          memoryContext.contact = contact;
        }
        break;
      }
      case 'custom': {
        // 自定义策略：从 context 中提取自定义记忆字段
        const customMemory = context.memory as Record<string, unknown> | undefined;
        if (customMemory) {
          Object.assign(memoryContext, customMemory);
        }
        break;
      }
      default:
        this.logger.warn(`Unknown memory strategy: ${memoryConfig.strategy}`);
    }

    return memoryContext;
  }

  /**
   * 限制消息数量（基于 maxTokens，简化实现）
   */
  private limitMessages(
    messages: Array<{ role: string; content: string; [key: string]: unknown }>,
    maxTokens?: number,
  ): Array<{ role: string; content: string; [key: string]: unknown }> {
    if (!maxTokens) {
      return messages;
    }

    // 简化实现：假设每条消息平均 100 tokens
    // 实际应该使用 tokenizer 计算
    const estimatedTokensPerMessage = 100;
    const maxMessages = Math.floor(maxTokens / estimatedTokensPerMessage);

    if (messages.length <= maxMessages) {
      return messages;
    }

    // 保留最新的消息
    return messages.slice(-maxMessages);
  }
}
