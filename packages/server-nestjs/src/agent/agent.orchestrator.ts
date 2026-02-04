import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type OpenAI from 'openai';
import { AiService } from '../ai/ai.service';
import { ToolExecutionStrategy } from '../ai/tools/tool-execution.strategy';
import { ToolRegistry } from '../ai/tool-registry';
import { AgentChatRequest, AgentStreamEvent } from './agent.types';
import { ContextBuilder } from './context-builder';

@Injectable()
export class AgentOrchestrator {
  private readonly logger = new Logger(AgentOrchestrator.name);
  private readonly maxToolIterations = 10;

  constructor(
    private readonly aiService: AiService,
    private readonly contextBuilder: ContextBuilder,
    private readonly toolExecutionStrategy: ToolExecutionStrategy,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  async *streamChat(
    request: AgentChatRequest,
    options?: { signal?: AbortSignal }
  ): AsyncGenerator<AgentStreamEvent> {
    let messages = this.contextBuilder.buildMessages(request);
    let iterationCount = 0;

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
      let toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [];
      let finishReason: string | undefined;

      // 流式处理 AI 响应
      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];

        // 处理文本内容
        const delta = choice?.delta?.content;
        if (delta) {
          assistantMessage += delta;
          yield { type: 'token', content: delta };
        }

        // 处理工具调用
        if (choice?.delta?.tool_calls) {
          for (const toolCall of choice.delta.tool_calls) {
            const index = toolCall.index ?? 0;

            if (!toolCalls[index]) {
              toolCalls[index] = {
                id: toolCall.id ?? '',
                type: 'function',
                function: {
                  name: toolCall.function?.name ?? '',
                  arguments: toolCall.function?.arguments ?? '',
                },
              };
            } else {
              if (toolCall.function?.arguments) {
                toolCalls[index].function.arguments += toolCall.function.arguments;
              }
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
        yield { type: 'done', reason: finishReason };
        break;
      }

      // 处理工具调用
      if (finishReason === 'tool_calls' && toolCalls.length > 0) {
        // 添加助手的工具调用消息到历史
        messages = this.contextBuilder.appendAssistantToolCall(messages, toolCalls);

        // 执行所有工具调用
        const toolExecutionComplete = await this.executeToolCalls(
          toolCalls,
          request,
          messages,
          (event) => {
            // 通过回调向客户端发送事件
            return event;
          }
        );

        // 如果有工具需要确认，暂停执行
        if (!toolExecutionComplete) {
          yield { type: 'done', reason: 'requires_confirmation' };
          break;
        }

        // 继续下一轮对话
        continue;
      }

      // 其他完成原因
      yield { type: 'done', reason: finishReason };
      break;
    }

    if (iterationCount >= this.maxToolIterations) {
      yield {
        type: 'error',
        message: `Maximum tool iterations (${this.maxToolIterations}) reached`
      };
    }
  }

  private async executeToolCalls(
    toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
    request: AgentChatRequest,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    emitEvent: (event: AgentStreamEvent) => AgentStreamEvent
  ): Promise<boolean> {
    let allToolsExecuted = true;

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      const callId = toolCall.id;

      // 发送工具调用事件
      emitEvent({
        type: 'tool_call',
        toolName,
        callId,
        arguments: toolCall.function.arguments,
      });

      try {
        // 执行工具
        const executionResult = await this.toolExecutionStrategy.execute(
          {
            id: callId,
            name: toolName,
            arguments: toolCall.function.arguments,
          },
          {
            userId: request.userId,
            conversationId: request.conversationId,
          }
        );

        // 发送工具执行结果事件
        emitEvent({
          type: 'tool_result',
          result: executionResult,
        });

        // 如果需要确认
        if (executionResult.status === 'requires_confirmation') {
          emitEvent({
            type: 'requires_confirmation',
            toolName: executionResult.toolName,
            confirmationId: executionResult.confirmationId!,
            callId: executionResult.callId,
            arguments: toolCall.function.arguments,
          });
          allToolsExecuted = false;
          continue;
        }

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

        emitEvent({
          type: 'error',
          message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });

        // 添加错误结果到消息历史
        messages.push({
          role: 'tool',
          tool_call_id: callId,
          content: `Error: ${error instanceof Error ? error.message : 'Tool execution failed'}`,
        } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);
      }
    }

    return allToolsExecuted;
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

    yield {
      type: 'tool_result',
      result: executionResult,
    };

    // 如果用户拒绝或执行失败，返回错误
    if (executionResult.status === 'denied' || executionResult.status === 'error') {
      yield {
        type: 'done',
        reason: executionResult.status,
      };
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
}
