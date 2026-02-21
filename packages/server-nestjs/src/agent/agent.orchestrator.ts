import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ToolExecutionStrategy } from '../ai/tools/tool-execution.strategy';
import { ToolRegistry } from '../ai/tool-registry';
import { AgentMessageStore } from './agent-message.store';
import { AgentChatRequest, AgentStreamEvent } from './agent.types';
import { ContextBuilder } from './context-builder';
import { MessagesService } from '../conversations/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { generateUlid } from '../utils/ulid';
import type { LlmMessage, LlmToolCall, LlmToolDefinition } from '../ai/providers/llm-types';
import type {
  AgentError,
  AgentMessage,
  AgentMessageDelta,
  AgentRunEnd,
  AgentRunStart,
  JsonValue,
  ToolStateUpdate,
  ToolStatus,
} from './client-types';

@Injectable()
export class AgentOrchestrator {
  private readonly logger = new Logger(AgentOrchestrator.name);
  private readonly maxToolIterations = 10;

  constructor(
    private readonly aiService: AiService,
    private readonly contextBuilder: ContextBuilder,
    private readonly toolExecutionStrategy: ToolExecutionStrategy,
    private readonly toolRegistry: ToolRegistry,
    private readonly messageStore: AgentMessageStore,
    private readonly messagesService: MessagesService,
    private readonly conversationsService: ConversationsService,
  ) {}

  async *streamChat(
    request: AgentChatRequest,
    options?: { signal?: AbortSignal }
  ): AsyncGenerator<AgentStreamEvent> {
    let messages = this.contextBuilder.buildMessages(request);
    let iterationCount = 0;
    const runId = generateUlid();
    const startEvent: AgentRunStart = {
      runId,
      createdAt: new Date().toISOString(),
      input: this.extractInput(request),
    };
    yield { event: 'agent.start', data: startEvent };

    // 如果没有 conversationId，自动创建新会话（仅在第一条消息时）
    let conversationId = request.conversationId;
    if (!conversationId && request.userId) {
      try {
        const userMessage = this.buildUserMessage(request);
        const firstMessageContent = userMessage?.content || this.extractInput(request) || '';
        const newConversation = await this.conversationsService.create(
          { content: firstMessageContent },
          request.userId,
        );
        conversationId = newConversation.id;
        this.logger.debug(`Auto-created conversation: conversationId=${conversationId}, userId=${request.userId}`);
        
        // 通过 context.patch 事件将 conversationId 返回给前端
        yield {
          event: 'context.patch',
          data: {
            layer: 'session',
            patch: { conversationId },
          },
        };
      } catch (error) {
        this.logger.error(`Failed to create conversation: ${error instanceof Error ? error.message : String(error)}`);
        // 如果创建失败，继续处理但不保存到数据库
      }
    }

    // 使用 conversationId 或 sessionId 作为 storeKey，但只有 conversationId 才用于数据库保存
    const sessionId = conversationId ?? request.sessionId;
    const storeKey = this.messageStore.buildKey(
      request.userId,
      sessionId,
    );
    
    this.logger.debug(`Stream chat started: conversationId=${conversationId}, sessionId=${sessionId}, userId=${request.userId}`);
    
    const userMessage = this.buildUserMessage(request);
    if (userMessage) {
      let storedMessage = userMessage;
      // 只有在 conversationId 存在时才保存到数据库（sessionId 不是有效的 conversation ID）
      if (conversationId) {
        try {
          this.logger.debug(`Saving user message to database: conversationId=${conversationId}, messageId=${userMessage.id}`);
          const persisted = await this.messagesService.appendMessage(conversationId, {
            id: userMessage.id,
            role: userMessage.role,
            content: userMessage.content,
            metadata: userMessage.metadata as Record<string, any> | undefined,
            createdAtMs: userMessage.createdAtMs,
            userId: request.userId,
          });
          this.logger.debug(`User message saved successfully: messageId=${persisted.id}`);
          storedMessage = {
            ...userMessage,
            id: persisted.id,
            createdAt: persisted.createdAt.toISOString(),
            createdAtMs: persisted.createdAtMs,
          };
        } catch (error) {
          // 如果保存失败，记录错误但继续处理（消息仍然会在内存中）
          this.logger.error(
            `Failed to save user message to database`,
            {
              conversationId,
              messageId: userMessage.id,
              userId: request.userId,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            }
          );
        }
      } else {
        this.logger.debug(`Skipping database save for user message: conversationId is undefined`);
      }
      this.messageStore.appendMessage(storeKey, storedMessage);
    }

    while (iterationCount < this.maxToolIterations) {
      iterationCount++;

      // 获取可用工具列表
      const tools = this.getToolsForLlm(request);

      // 调用 AI 服务
      const stream = await this.aiService.streamChat(messages, {
        llm: request.llm,
        signal: options?.signal,
        tools: tools.length > 0 ? tools : undefined,
      });

      let assistantMessage = '';
      const assistantMessageId = generateUlid();
      let toolCalls: LlmToolCall[] = [];
      let finishReason: string | undefined;

      // 流式处理 AI 响应
      try {
        for await (const chunk of stream) {
          const choice = chunk.choices?.[0];

          // 处理文本内容
          const delta = choice?.delta?.content;
          if (delta) {
            assistantMessage += delta;
            const deltaEvent: AgentMessageDelta = {
              id: assistantMessageId,
              delta,
              role: 'assistant',
            };
            yield { event: 'agent.delta', data: deltaEvent };
          }

          // 处理工具调用
          if (choice?.delta?.tool_calls) {
            for (const toolCall of choice.delta.tool_calls) {
              if (toolCall.type && toolCall.type !== 'function') {
                continue;
              }
              if (!toolCall.function) {
                continue;
              }
              const index = toolCall.index ?? 0;

              if (!toolCalls[index]) {
                toolCalls[index] = {
                  id: toolCall.id ?? '',
                  type: 'function',
                  function: {
                    name: toolCall.function.name ?? '',
                    arguments: toolCall.function.arguments ?? '',
                  },
                };
              } else if (toolCall.function.arguments && toolCalls[index]?.function) {
                const existingArgs = toolCalls[index].function?.arguments ?? '';
                toolCalls[index].function!.arguments = existingArgs + toolCall.function.arguments;
              }
            }
          }

          // 处理完成原因
          if (choice?.finish_reason) {
            finishReason = choice.finish_reason;
          }
        }
      } catch (error) {
        // 检查是否是中断错误
        const isAborted = error instanceof Error && (
          error.name === 'AbortError' ||
          error.message.includes('aborted') ||
          error.message.includes('canceled') ||
          options?.signal?.aborted === true
        );

        if (isAborted) {
          // 如果已经有部分内容，保存为废弃状态（只有在 conversationId 存在时）
          if (assistantMessage.trim().length > 0 && conversationId) {
            try {
              await this.messagesService.appendMessage(conversationId, {
                id: assistantMessageId,
                role: 'assistant',
                content: assistantMessage,
                createdAtMs: Date.now(),
                status: 'abandoned',
                userId: request.userId,
              });
              this.logger.debug(`Saved abandoned message ${assistantMessageId} for conversation ${conversationId}`);
            } catch (saveError) {
              this.logger.error(`Failed to save abandoned message: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
            }
          }
          // 抛出错误以便上层处理
          throw error;
        }
        // 其他错误也抛出
        throw error;
      }

      // 如果没有工具调用，返回完成事件
      if (!toolCalls.length || finishReason === 'stop') {
        let persistedCreatedAtMs: number | undefined;
        // 只有在 conversationId 存在时才保存到数据库
        if (conversationId) {
          try {
            this.logger.debug(`Saving assistant message to database: conversationId=${conversationId}, messageId=${assistantMessageId}`);
            const persisted = await this.messagesService.appendMessage(conversationId, {
              id: assistantMessageId,
              role: 'assistant',
              content: assistantMessage,
              createdAtMs: Date.now(),
              userId: request.userId,
            });
            this.logger.debug(`Assistant message saved successfully: messageId=${persisted.id}`);
            persistedCreatedAtMs = persisted.createdAtMs;
          } catch (error) {
            // 如果保存失败，记录错误但继续处理（消息仍然会在内存中）
            this.logger.error(
              `Failed to save assistant message to database`,
              {
                conversationId,
                messageId: assistantMessageId,
                userId: request.userId,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              }
            );
          }
        } else {
          this.logger.debug(`Skipping database save for assistant message: conversationId is undefined`);
        }

        const finalMessage = this.messageStore.createMessage({
          id: assistantMessageId,
          role: 'assistant',
          content: assistantMessage,
          createdAtMs: persistedCreatedAtMs,
        });
        yield { event: 'agent.message', data: finalMessage };
        this.messageStore.appendMessage(storeKey, finalMessage);
        const endEvent: AgentRunEnd = {
          runId,
          status: 'succeeded',
          finishedAt: new Date().toISOString(),
          output: assistantMessage || undefined,
        };
        yield { event: 'agent.end', data: endEvent };
        return;
      }

      // 处理工具调用
      if (finishReason === 'tool_calls' && toolCalls.length > 0) {
        // 添加助手的工具调用消息到历史
        messages = this.contextBuilder.appendAssistantToolCall(messages, toolCalls);

        // 执行所有工具调用
        let requiresConfirmation = false;
        for await (const event of this.executeToolCalls(toolCalls, request, messages, conversationId)) {
          yield event;
          if (event.event === 'tool.state' && event.data.status === 'awaiting_input') {
            requiresConfirmation = true;
          }
        }

        // 如果有工具需要确认，暂停执行
        if (requiresConfirmation) {
          const endEvent: AgentRunEnd = {
            runId,
            status: 'cancelled',
            finishedAt: new Date().toISOString(),
            error: {
              code: 'requires_confirmation',
              message: 'Tool execution requires confirmation.',
            },
          };
          yield { event: 'agent.end', data: endEvent };
          return;
        }

        // 继续下一轮对话
        continue;
      }

      // 其他完成原因
      const endEvent: AgentRunEnd = {
        runId,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: {
          code: 'finish_reason',
          message: `Unexpected finish reason: ${finishReason ?? 'unknown'}`,
        },
      };
      yield { event: 'agent.end', data: endEvent };
      return;
    }

    if (iterationCount >= this.maxToolIterations) {
      const errorPayload: AgentError = {
        code: 'max_iterations',
        message: `Maximum tool iterations (${this.maxToolIterations}) reached`,
      };
      yield { event: 'error', data: errorPayload };
      const endEvent: AgentRunEnd = {
        runId,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: errorPayload,
      };
      yield { event: 'agent.end', data: endEvent };
    }
  }

  private async *executeToolCalls(
    toolCalls: LlmToolCall[],
    request: AgentChatRequest,
    messages: LlmMessage[],
    conversationId?: string,
  ): AsyncGenerator<AgentStreamEvent> {
    for (const toolCall of toolCalls) {
      if (toolCall.type && toolCall.type !== 'function') {
        continue;
      }
      const toolName = toolCall.function?.name;
      if (!toolName) {
        continue;
      }
      const callId = toolCall.id ?? generateUlid();
      const toolInput = toolCall.function?.arguments ?? '';
      let previousStatus: ToolStatus | undefined;

      const queuedEvent = this.buildToolStateUpdate({
        toolId: callId,
        name: toolName,
        status: 'queued',
        previousStatus,
        input: this.safeParseToolInput(toolInput),
      });
      previousStatus = queuedEvent.status;
      yield { event: 'tool.state', data: queuedEvent };

      try {
        const runningEvent = this.buildToolStateUpdate({
          toolId: callId,
          name: toolName,
          status: 'running',
          previousStatus,
          input: this.safeParseToolInput(toolInput),
        });
        previousStatus = runningEvent.status;
        yield { event: 'tool.state', data: runningEvent };

        // 执行工具
        const resolvedConversationId = conversationId ?? request.sessionId;
        const executionResult = await this.toolExecutionStrategy.execute(
          {
            id: callId,
            name: toolName,
            arguments: toolInput,
          },
          {
            userId: request.userId,
            conversationId: resolvedConversationId,
          }
        );

        // 如果需要确认
        if (executionResult.status === 'requires_confirmation') {
          const awaitingEvent = this.buildToolStateUpdate({
            toolId: callId,
            name: executionResult.toolName,
            status: 'awaiting_input',
            previousStatus,
            input: this.safeParseToolInput(toolInput),
            message: 'Tool execution requires confirmation.',
            confirmationId: executionResult.confirmationId,
          });
          yield { event: 'tool.state', data: awaitingEvent };
          continue;
        }

        const toolState = this.mapToolResultToState(executionResult.status);
        const toolStateEvent = this.buildToolStateUpdate({
          toolId: callId,
          name: executionResult.toolName,
          status: toolState,
          previousStatus,
          input: this.safeParseToolInput(toolInput),
          output: executionResult.result,
          error: executionResult.error
            ? {
                code: 'tool_error',
                message: executionResult.error,
              }
            : undefined,
        });
        yield { event: 'tool.state', data: toolStateEvent };

        // 添加工具结果到消息历史
        const toolResultContent = executionResult.status === 'success'
          ? JSON.stringify(executionResult.result)
          : `Error: ${executionResult.error}`;

        messages.push({
          role: 'tool',
          tool_call_id: callId,
          content: toolResultContent,
        });

      } catch (error) {
        this.logger.error(`Tool execution failed: ${toolName}`, error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const toolStateEvent = this.buildToolStateUpdate({
          toolId: callId,
          name: toolName,
          status: 'failed',
          previousStatus,
          input: this.safeParseToolInput(toolInput),
          error: {
            code: 'tool_error',
            message: `Tool execution failed: ${errorMessage}`,
          },
        });
        yield { event: 'tool.state', data: toolStateEvent };

        // 添加错误结果到消息历史
        messages.push({
          role: 'tool',
          tool_call_id: callId,
          content: `Error: ${errorMessage}`,
        });
      }
    }
  }

  private getToolsForLlm(request: AgentChatRequest): LlmToolDefinition[] {
    const registeredTools = this.toolRegistry.list();
    const requestedTools = this.getRequestedToolNames(request);

    let effectiveTools = registeredTools;
    if (requestedTools.length > 0) {
      const requestedSet = new Set(requestedTools);
      const filtered = registeredTools.filter((tool) => requestedSet.has(tool.name));
      // 如果过滤后为空，回退到默认行为（全部已注册工具）
      effectiveTools = filtered.length > 0 ? filtered : registeredTools;
    }

    return effectiveTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  private getRequestedToolNames(request: AgentChatRequest): string[] {
    const composer = request.context?.composer;
    if (!composer || !Array.isArray(composer.enabledTools)) {
      return [];
    }

    return Array.from(
      new Set(
        composer.enabledTools
          .filter((name): name is string => typeof name === 'string')
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
      )
    );
  }

  /**
   * 继续执行被确认的工具
   */
  async *continueWithConfirmation(
    confirmationId: string,
    approved: boolean,
    originalRequest: AgentChatRequest,
    currentMessages: LlmMessage[],
  ): AsyncGenerator<AgentStreamEvent> {
    // 解析确认结果
    const executionResult = await this.toolExecutionStrategy.resolveConfirmation(
      confirmationId,
      approved
    );

    const toolStateEvent = this.buildToolStateUpdate({
      toolId: executionResult.callId ?? generateUlid(),
      name: executionResult.toolName,
      status: this.mapToolResultToState(executionResult.status),
      output: executionResult.result,
      error: executionResult.error
        ? { code: 'tool_error', message: executionResult.error }
        : undefined,
    });
    yield { event: 'tool.state', data: toolStateEvent };

    // 如果用户拒绝或执行失败，返回错误
    if (executionResult.status === 'denied' || executionResult.status === 'error') {
      const endEvent: AgentRunEnd = {
        runId: generateUlid(),
        status: executionResult.status === 'denied' ? 'cancelled' : 'failed',
        finishedAt: new Date().toISOString(),
        error: executionResult.error
          ? { code: 'tool_error', message: executionResult.error }
          : undefined,
      };
      yield { event: 'agent.end', data: endEvent };
      return;
    }

    // 添加工具结果到消息历史
    const toolResultContent = executionResult.status === 'success'
      ? JSON.stringify(executionResult.result)
      : `Error: ${executionResult.error}`;

    const updatedMessages: LlmMessage[] = [
      ...currentMessages,
      {
        role: 'tool',
        tool_call_id: executionResult.callId ?? generateUlid(),
        content: toolResultContent,
      },
    ];

    // 继续流式对话
    yield* this.streamChat({
      ...originalRequest,
      messages: updatedMessages,
    });
  }

  private extractInput(request: AgentChatRequest): string | undefined {
    if (request.prompt?.trim()) {
      return request.prompt.trim();
    }
    if (request.messages && request.messages.length > 0) {
      const lastUser = [...request.messages].reverse().find((message) => message.role === 'user');
      if (typeof lastUser?.content === 'string') {
        const content = lastUser.content.trim();
        return content.length > 0 ? content : undefined;
      }
    }
    return undefined;
  }

  private buildUserMessage(request: AgentChatRequest): AgentMessage | null {
    const input = this.extractInput(request);
    if (!input) {
      return null;
    }
    return this.messageStore.createMessage({
      role: 'user',
      content: input,
    });
  }

  private mapToolResultToState(status: string): ToolStatus {
    switch (status) {
      case 'success':
        return 'succeeded';
      case 'denied':
        return 'cancelled';
      case 'requires_confirmation':
        return 'awaiting_input';
      case 'error':
      default:
        return 'failed';
    }
  }

  private buildToolStateUpdate(params: {
    toolId: string;
    name: string;
    status: ToolStatus;
    previousStatus?: ToolStatus;
    message?: string;
    input?: unknown;
    output?: unknown;
    error?: AgentError;
    confirmationId?: string;
  }): ToolStateUpdate {
    return {
      toolId: params.toolId,
      name: params.name,
      status: params.status,
      previousStatus: params.previousStatus,
      at: new Date().toISOString(),
      message: params.message,
      input: this.coerceJsonValue(params.input),
      output: this.coerceJsonValue(params.output),
      error: params.error,
      confirmationId: params.confirmationId,
    };
  }

  private coerceJsonValue(value: unknown): JsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(entry => this.coerceJsonValue(entry) ?? null);
    }
    if (typeof value === 'object') {
      const record: Record<string, JsonValue> = {};
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        const coerced = this.coerceJsonValue(entry);
        record[key] = coerced === undefined ? null : coerced;
      }
      return record;
    }
    return String(value);
  }

  private safeParseToolInput(input: unknown): unknown {
    if (typeof input !== 'string') {
      return input;
    }
    try {
      return JSON.parse(input);
    } catch {
      return input;
    }
  }
}
