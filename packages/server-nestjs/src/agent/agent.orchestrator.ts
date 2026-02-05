import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type OpenAI from 'openai';
import { AiService } from '../ai/ai.service';
import { ToolExecutionStrategy } from '../ai/tools/tool-execution.strategy';
import { ToolRegistry } from '../ai/tool-registry';
import { AgentMessageStore } from './agent-message.store';
import { AgentChatRequest, AgentStreamEvent } from './agent.types';
import { ContextBuilder } from './context-builder';
import type {
  AgentError,
  AgentMessage,
  AgentMessageDelta,
  AgentRunEnd,
  AgentRunStart,
  ToolStateUpdate,
  ToolStatus,
} from '../../../client/src/types';

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
  ) {}

  async *streamChat(
    request: AgentChatRequest,
    options?: { signal?: AbortSignal }
  ): AsyncGenerator<AgentStreamEvent> {
    let messages = this.contextBuilder.buildMessages(request);
    let iterationCount = 0;
    const runId = randomUUID();
    const startEvent: AgentRunStart = {
      runId,
      createdAt: new Date().toISOString(),
      input: this.extractInput(request),
    };
    yield { event: 'agent.start', data: startEvent };

    const storeKey = this.messageStore.buildKey(
      request.userId,
      request.conversationId ?? request.sessionId,
    );
    const userMessage = this.buildUserMessage(request);
    if (userMessage) {
      this.messageStore.appendMessage(storeKey, userMessage);
    }

    while (iterationCount < this.maxToolIterations) {
      iterationCount++;

      // 获取可用工具列表
      const tools = this.getToolsForOpenAI();

      // 调用 AI 服务
      const stream = await this.aiService.streamChat(messages, {
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens ?? request.max_tokens,
        signal: options?.signal,
        tools: tools.length > 0 ? tools : undefined,
      });

      let assistantMessage = '';
      const assistantMessageId = randomUUID();
      let toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall[] = [];
      let finishReason: string | undefined;

      // 流式处理 AI 响应
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
            } else if (toolCall.function.arguments) {
              toolCalls[index].function.arguments += toolCall.function.arguments;
            }
          }
        }

        // 处理完成原因
        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;
        }
      }

      // 如果没有工具调用，返回完成事件
      if (!toolCalls.length || finishReason === 'stop') {
        const finalMessage = this.messageStore.createMessage({
          id: assistantMessageId,
          role: 'assistant',
          content: assistantMessage,
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
        for await (const event of this.executeToolCalls(toolCalls, request, messages)) {
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
    toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall[],
    request: AgentChatRequest,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  ): AsyncGenerator<AgentStreamEvent> {
    for (const toolCall of toolCalls) {
      if (toolCall.type && toolCall.type !== 'function') {
        continue;
      }
      const toolName = toolCall.function?.name;
      if (!toolName) {
        continue;
      }
      const callId = toolCall.id ?? randomUUID();
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
        const executionResult = await this.toolExecutionStrategy.execute(
          {
            id: callId,
            name: toolName,
            arguments: toolInput,
          },
          {
            userId: request.userId,
            conversationId: request.conversationId,
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
        } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);

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
        } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);
      }
    }
  }

  private getToolsForOpenAI(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    const registeredTools = this.toolRegistry.list();

    return registeredTools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * 继续执行被确认的工具
   */
  async *continueWithConfirmation(
    confirmationId: string,
    approved: boolean,
    originalRequest: AgentChatRequest,
    currentMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  ): AsyncGenerator<AgentStreamEvent> {
    // 解析确认结果
    const executionResult = await this.toolExecutionStrategy.resolveConfirmation(
      confirmationId,
      approved
    );

    const toolStateEvent = this.buildToolStateUpdate({
      toolId: executionResult.callId ?? randomUUID(),
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
        runId: randomUUID(),
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

    const updatedMessages = [
      ...currentMessages,
      {
        role: 'tool',
        tool_call_id: executionResult.callId,
        content: toolResultContent,
      } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam,
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
  }): ToolStateUpdate {
    return {
      toolId: params.toolId,
      name: params.name,
      status: params.status,
      previousStatus: params.previousStatus,
      at: new Date().toISOString(),
      message: params.message,
      input: params.input,
      output: params.output,
      error: params.error,
    };
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
