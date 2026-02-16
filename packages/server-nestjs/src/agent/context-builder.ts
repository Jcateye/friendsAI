import { Injectable } from '@nestjs/common';
import { AgentChatRequest } from './agent.types';
import type { LlmMessage, LlmToolCall } from '../ai/providers/llm-types';

export interface ContextBuilderOptions {
  systemPrompt?: string;
  maxHistoryLength?: number;
  includeToolResults?: boolean;
}

@Injectable()
export class ContextBuilder {
  private readonly defaultSystemPrompt = 'You are a helpful assistant.';
  private readonly defaultMaxHistoryLength = 50;

  /**
   * 构建完整的消息列表，包括系统提示、上下文和用户消息
   */
  buildMessages(
    request: AgentChatRequest,
    options?: ContextBuilderOptions
  ): LlmMessage[] {
    const messages: LlmMessage[] = [];
    const systemPrompt = options?.systemPrompt ?? this.defaultSystemPrompt;

    // 1. 添加系统提示
    messages.push({
      role: 'system',
      content: systemPrompt,
    });

    // 2. 如果有上下文，添加上下文消息
    if (request.context && Object.keys(request.context).length > 0) {
      const stableContext = this.sortKeysRecursively(request.context);
      messages.push({
        role: 'system',
        content: `Context: ${JSON.stringify(stableContext)}`,
      });
    }

    // 3. 处理用户提供的消息历史或新提示
    if (request.messages && request.messages.length > 0) {
      // 过滤掉已有的 system 消息，避免重复
      const userMessages = request.messages.filter(msg => msg.role !== 'system');

      // 限制历史长度
      const maxLength = options?.maxHistoryLength ?? this.defaultMaxHistoryLength;
      const trimmedMessages = userMessages.slice(-maxLength);

      messages.push(...trimmedMessages);
    } else if (request.prompt) {
      // 如果没有消息历史，添加单个用户提示
      messages.push({
        role: 'user',
        content: request.prompt,
      });
    }

    return messages;
  }

  /**
   * 添加工具调用结果到消息历史
   */
  appendToolResult(
    messages: LlmMessage[],
    toolCallId: string,
    toolName: string,
    result: unknown
  ): LlmMessage[] {
    return [
      ...messages,
      {
        role: 'tool',
        tool_call_id: toolCallId,
        content: JSON.stringify(result),
        name: toolName,
      },
    ];
  }

  /**
   * 添加助手的工具调用消息
   */
  appendAssistantToolCall(
    messages: LlmMessage[],
    toolCalls: LlmToolCall[],
  ): LlmMessage[] {
    return [
      ...messages,
      {
        role: 'assistant',
        tool_calls: toolCalls,
      },
    ];
  }

  /**
   * 更新上下文信息
   */
  updateContext(
    currentContext: Record<string, unknown> | undefined,
    updates: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      ...(currentContext ?? {}),
      ...updates,
    };
  }

  /**
   * 清理过长的消息历史，保留最近的消息
   */
  trimHistory(
    messages: LlmMessage[],
    maxLength: number = this.defaultMaxHistoryLength
  ): LlmMessage[] {
    if (messages.length <= maxLength) {
      return messages;
    }

    // 保留系统消息
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const otherMessages = messages.filter(msg => msg.role !== 'system');

    // 保留最近的非系统消息
    const trimmedOthers = otherMessages.slice(-maxLength + systemMessages.length);

    return [...systemMessages, ...trimmedOthers];
  }

  private sortKeysRecursively(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortKeysRecursively(item));
    }

    if (value === null || typeof value !== 'object') {
      return value;
    }

    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort((a, b) => a.localeCompare(b));
    const sortedRecord: Record<string, unknown> = {};

    for (const key of sortedKeys) {
      sortedRecord[key] = this.sortKeysRecursively(record[key]);
    }

    return sortedRecord;
  }
}
