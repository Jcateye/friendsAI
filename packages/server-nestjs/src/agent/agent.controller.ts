import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Optional, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AgentMessageStore } from './agent-message.store';
import type {
  AgentChatContext,
  AgentChatRequest,
  AgentComposerAttachment,
  AgentComposerContext,
  AgentRunRequest,
  AgentRunResponse,
  AgentStreamEvent,
} from './agent.types';
import type { AgentError, AgentRunEnd, AgentSseEvent } from './client-types';
import { VercelAiStreamAdapter } from './adapters/vercel-ai-stream.adapter';
import { AgentListService } from './agent-list.service';
import { AgentListResponseDto } from './dto/agent-list.dto';
import { AgentRuntimeError } from './errors/agent-runtime.error';
import { AgentRunMetricsService } from '../action-tracking/agent-run-metrics.service';
import { generateUlid } from '../utils/ulid';
import { SkillsService } from '../skills/skills.service';
import { EngineRouter } from './engines/engine.router';
import { AgentLlmValidationError, findLegacyLlmFields, parseAgentLlmOrThrow } from './dto/agent-llm.schema';
import type { LlmRequestConfig } from '../ai/providers/llm-types';

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  private readonly maxContextDepth = 3;
  private readonly maxContextArrayLength = 20;
  private readonly maxContextObjectKeys = 24;
  private readonly maxContextStringLength = 500;
  private readonly maxComposerTools = 12;
  private readonly maxComposerAttachments = 10;
  private readonly skillParserEnabled = process.env.SKILL_INPUT_PARSER_ENABLED === 'true';
  private readonly skillParserExecuteMode = process.env.SKILL_PARSER_EXECUTE_MODE ?? 'log-only';

  constructor(
    private readonly engineRouter: EngineRouter,
    private readonly messageStore: AgentMessageStore,
    private readonly agentListService: AgentListService,
    private readonly agentRunMetricsService: AgentRunMetricsService,
    @Optional()
    private readonly skillsService?: SkillsService,
  ) { }

  @Post('chat')
  @ApiOperation({
    summary: '与 Agent 进行对话（流式 / Vercel AI 适配）',
    description:
      '发起与多 Agent 协调的流式对话，请求体支持 messages（多轮聊天记录）或 prompt（单轮提示），二者至少提供其一；' +
      '通过 format 查询参数选择输出流格式：sse 时返回 text/event-stream 的 Agent 事件（agent.start / agent.delta / agent.message 等），' +
      'vercel-ai 时返回兼容 AI SDK v6 的 UI Message Stream（`data: {...}` + `data: [DONE]`）。常用于前端聊天框、打字机效果，以及需要实时看到工具调用进度的场景。',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: '响应格式：sse（默认，EventSource）或 vercel-ai（AI SDK v6 UI Message Stream，header: x-vercel-ai-ui-message-stream: v1）',
    example: 'sse',
  })
  @HttpCode(200)
  async chat(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: AgentChatRequest,
    @Query('format') format: 'sse' | 'vercel-ai' = 'sse',
  ): Promise<void> {
    let normalizedLlm: LlmRequestConfig | undefined;
    try {
      normalizedLlm = this.validateAndNormalizeLlm(body);
    } catch (error) {
      const llmError = this.toLlmValidationError(error);
      if (llmError) {
        res.status(400).json(llmError);
        return;
      }
      throw error;
    }

    const streamStartedAt = Date.now();
    const resolvedUserId = (req.user as { id?: string } | undefined)?.id ?? body.userId;
    const hasMessages = Array.isArray(body?.messages) && body.messages.length > 0;
    const hasPrompt = typeof body?.prompt === 'string' && body.prompt.trim().length > 0;

    if (!hasMessages && !hasPrompt) {
      res.status(400).json({ message: 'Either "messages" or "prompt" must be provided.' });
      return;
    }

    res.status(200);

    // 根据 format 设置响应头
    if (format === 'vercel-ai') {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('x-vercel-ai-ui-message-stream', 'v1');
    } else {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    }

    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // 根据 format 选择适配器
    const adapter = format === 'vercel-ai' ? new VercelAiStreamAdapter() : null;

    const abortController = new AbortController();
    const handleClose = () => abortController.abort();
    req.on('close', handleClose);

    let runCompleted = false;
    let runId: string | undefined;
    let streamStatus: 'succeeded' | 'failed' | 'cancelled' = 'failed';
    let streamErrorCode: string | null = null;
    const pingInterval = setInterval(() => {
      if (res.writableEnded) {
        return;
      }
      this.writeEvent(res, {
        event: 'ping',
        data: { at: new Date().toISOString() },
      });
    }, 15000);

    try {
      const sanitizedContext = this.sanitizeChatContext(body.context);
      const preparedRequest: AgentChatRequest = {
        ...body,
        context: sanitizedContext,
        userId: resolvedUserId,
        llm: normalizedLlm,
      };

      if (this.skillParserEnabled && this.skillsService && resolvedUserId) {
        const parserText =
          typeof body.prompt === 'string' && body.prompt.trim().length > 0
            ? body.prompt
            : this.extractLatestUserText(body.messages);

        const parsedIntent = await this.skillsService.parseInvocationFromChat({
          tenantId: resolvedUserId,
          conversationId: body.conversationId,
          sessionId: body.sessionId,
          text: parserText,
          composer:
            preparedRequest.context?.composer && this.isRecord(preparedRequest.context.composer)
              ? (preparedRequest.context.composer as Record<string, unknown>)
              : undefined,
          agentScope: body.sessionId ?? body.conversationId ?? resolvedUserId,
        });

        if (parsedIntent) {
          preparedRequest.context = {
            ...(preparedRequest.context ?? {}),
            skillInvocation: parsedIntent,
          };

          if (
            this.skillParserExecuteMode === 'enforce' &&
            parsedIntent.matched &&
            parsedIntent.execution
          ) {
            const handled = await this.executeSkillIntentDirectly({
              res,
              format,
              runRequest: preparedRequest,
              userId: resolvedUserId,
              parsedIntent,
            });

            if (handled) {
              runCompleted = true;
              streamStatus = 'succeeded';
              runId = handled.runId;
              streamErrorCode = null;
              return;
            }
          }
        }
      }

      for await (const event of this.engineRouter.streamChat(preparedRequest, {
        signal: abortController.signal,
      })) {
        if (res.writableEnded) {
          break;
        }
        if (event.event === 'agent.start') {
          runId = event.data.runId;
        }
        if (event.event === 'agent.end') {
          runCompleted = true;
          streamStatus = event.data.status === 'cancelled' ? 'cancelled' : event.data.status === 'succeeded' ? 'succeeded' : 'failed';
          streamErrorCode = event.data.error?.code ?? null;
        }

        // 根据 format 选择写入方式
        if (adapter) {
          const transformed = adapter.transform(event);
          if (transformed) {
            res.write(transformed);
          }
        } else {
          this.writeEvent(res, event);
        }
      }
    } catch (error) {
      streamStatus = 'failed';
      streamErrorCode = 'stream_error';
      if (!res.writableEnded) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const errorPayload: AgentError = {
          code: 'stream_error',
          message,
        };
        const errorEvent: AgentStreamEvent = { event: 'error', data: errorPayload };
        if (adapter) {
          const transformed = adapter.transform(errorEvent);
          if (transformed) {
            res.write(transformed);
          }
        } else {
          this.writeEvent(res, errorEvent);
        }
      }
    } finally {
      req.off('close', handleClose);
      clearInterval(pingInterval);
      if (!res.writableEnded) {
        if (!runCompleted && runId) {
          const endPayload: AgentRunEnd = {
            runId,
            status: 'failed',
            finishedAt: new Date().toISOString(),
            error: {
              code: 'stream_error',
              message: 'Stream terminated early.',
            },
          };
          streamStatus = 'failed';
          streamErrorCode = 'stream_error';
          const endEvent: AgentStreamEvent = { event: 'agent.end', data: endPayload };
          if (adapter) {
            const transformed = adapter.transform(endEvent);
            if (transformed) {
              res.write(transformed);
            }
          } else {
            this.writeEvent(res, endEvent);
          }
        }
        // Send [DONE] marker for v6 UI Message Stream Protocol
        if (adapter) {
          res.write(adapter.done());
        }
        res.end();
      }
      if (runId) {
        void this.agentRunMetricsService.recordRun({
          runId,
          userId: resolvedUserId ?? null,
          agentId: 'chat_conversation',
          operation: null,
          endpoint: 'chat',
          status: streamStatus,
          cached: false,
          durationMs: Date.now() - streamStartedAt,
          errorCode: streamStatus === 'succeeded' ? null : (streamErrorCode ?? 'stream_error'),
        });
      }
    }
  }

  @Post('run')
  @ApiOperation({
    summary: '直接执行某个 Agent 的一次 operation',
    description:
      '统一的「一次性」Agent 执行入口，面向非流式场景：调用方通过 agentId + operation + input 描述要执行的能力，' +
      '如生成对话标题摘要（title_summary）、联系人洞察（contact_insight）、归档提取与会前简报（archive_brief）等；' +
      'options.useCache / options.forceRefresh 控制是否命中缓存，响应中返回 runId、cached、snapshotId 以及各 Agent 自定义的 data 结果结构，' +
      '便于前端或后端任务编排直接消费 JSON 数据。',
  })
  @ApiResponse({
    status: 200,
    description: '执行成功，返回本次运行的结果、runId、是否命中缓存等信息',
  })
  @ApiResponse({
    status: 400,
    description: '输入不合法或输出校验失败',
  })
  @ApiResponse({
    status: 404,
    description: 'Agent 不存在',
  })
  @ApiResponse({
    status: 502,
    description: 'LLM Provider 调用失败',
  })
  @ApiResponse({
    status: 500,
    description: '服务内部错误',
  })
  @HttpCode(200)
  async run(
    @Req() req: Request,
    @Body() body: AgentRunRequest,
  ): Promise<AgentRunResponse> {
    const startedAt = Date.now();
    const userId = (req.user as { id?: string } | undefined)?.id ?? body.userId;

    try {
      const normalizedLlm = this.validateAndNormalizeLlm(body);
      const result = await this.engineRouter.run(
        body.agentId,
        body.operation,
        body.input,
        {
          useCache: body.options?.useCache,
          forceRefresh: body.options?.forceRefresh,
          userId,
          conversationId: body.conversationId,
          sessionId: body.sessionId,
          intent: body.intent,
          relationshipMix: body.relationshipMix,
          timeBudgetMinutes: body.timeBudgetMinutes,
          llm: normalizedLlm,
        }
      );

      const now = new Date();
      void this.agentRunMetricsService.recordRun({
        runId: result.runId,
        userId: userId ?? null,
        agentId: body.agentId,
        operation: body.operation ?? null,
        endpoint: 'run',
        status: 'succeeded',
        cached: result.cached,
        durationMs: Date.now() - startedAt,
      });
      return {
        runId: result.runId,
        agentId: body.agentId,
        operation: body.operation ?? null,
        cached: result.cached,
        snapshotId: result.snapshotId,
        generatedAt: now.toISOString(),
        generatedAtMs: now.getTime(),
        data: result.data,
      };
    } catch (error) {
      const mapped = this.mapRunError(error);
      void this.agentRunMetricsService.recordRun({
        runId: generateUlid(),
        userId: userId ?? null,
        agentId: body.agentId,
        operation: body.operation ?? null,
        endpoint: 'run',
        status: 'failed',
        cached: false,
        durationMs: Date.now() - startedAt,
        errorCode: mapped.body.code,
      });
      throw new HttpException(mapped.body, mapped.statusCode);
    }
  }

  @Get('messages')
  @ApiOperation({
    summary: '获取某个会话/会话 Session 的 Agent 消息缓存',
    description:
      '按 userId + conversationId / sessionId 维度查询 Agent 消息历史，用于前端在刷新页面或网络重连后恢复对话上下文；' +
      '当存在鉴权中间件时，userId 默认取自登录用户，也可通过查询参数显式指定。通常在使用 /agent/chat 建立流式对话后，' +
      '配合本接口在页面初始化阶段拉取最近一段 Agent 消息，用于填充聊天记录列表或调试 Agent 行为。',
  })
  @ApiQuery({
    name: 'conversationId',
    required: false,
    description: '会话 ID；与 sessionId 二选一，如果都不传则取当前用户下的默认 key',
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    description: '临时会话 Session ID；与 conversationId 二选一',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: '用户 ID；默认从请求上下文中解析',
  })
  getMessages(
    @Req() req: Request,
    @Query('conversationId') conversationId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('userId') userId?: string,
  ) {
    const resolvedUserId = userId ?? (req.user as { id?: string } | undefined)?.id;
    const key = this.messageStore.buildKey(resolvedUserId, conversationId ?? sessionId);
    return this.messageStore.listMessages(key);
  }

  @Get('list')
  @ApiOperation({
    summary: '获取所有 Agent 列表',
    description:
      '返回当前服务中已注册且对外可用的所有 Agent 的列表，每个 Agent 包含基础标识、能力说明、默认配置等元信息；' +
      '可用于前端渲染「Agent 名片」选择器，或在后台管理界面中展示系统内置能力，让调用方在不知道具体实现细节的前提下，' +
      '按业务场景选择合适的 Agent 进行调用。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回 Agent 列表',
    type: AgentListResponseDto,
  })
  async getAgentList(@Req() req: Request): Promise<AgentListResponseDto> {
    const resolvedUserId = (req.user as { id?: string } | undefined)?.id;
    return this.agentListService.getAgentList(resolvedUserId);
  }

  private writeEvent(res: Response, event: AgentStreamEvent | AgentSseEvent): void {
    res.write(`event: ${event.event}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  private extractLatestUserText(messages?: AgentChatRequest['messages']): string | undefined {
    if (!Array.isArray(messages)) {
      return undefined;
    }
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role !== 'user') {
        continue;
      }
      if (typeof message.content === 'string' && message.content.trim().length > 0) {
        return message.content;
      }
      if (Array.isArray(message.content)) {
        const text = message.content
          .map((part) => {
            if (typeof part === 'string') {
              return part;
            }
            if (part && typeof part === 'object' && 'text' in part && typeof (part as any).text === 'string') {
              return String((part as any).text);
            }
            return '';
          })
          .join(' ')
          .trim();
        if (text.length > 0) {
          return text;
        }
      }
    }
    return undefined;
  }

  private async executeSkillIntentDirectly(input: {
    res: Response;
    format: 'sse' | 'vercel-ai';
    runRequest: AgentChatRequest;
    userId: string;
    parsedIntent: {
      skillKey?: string;
      operation?: string;
      execution?: {
        agentId: string;
        operation?: string | null;
        input: Record<string, unknown>;
      };
    };
  }): Promise<{ runId: string } | null> {
    if (!input.parsedIntent.execution) {
      return null;
    }

    const execution = input.parsedIntent.execution;
    const executionInput: Record<string, unknown> = {
      ...(execution.input ?? {}),
    };

    if (!('conversationId' in executionInput) && input.runRequest.conversationId) {
      executionInput.conversationId = input.runRequest.conversationId;
    }
    if (!('sessionId' in executionInput) && input.runRequest.sessionId) {
      executionInput.sessionId = input.runRequest.sessionId;
    }
    if (!('userId' in executionInput) && input.userId) {
      executionInput.userId = input.userId;
    }

    const result = await this.engineRouter.run(
      execution.agentId as AgentRunRequest['agentId'],
      execution.operation ?? null,
      executionInput,
      {
        useCache: true,
        userId: input.userId,
        conversationId: input.runRequest.conversationId,
        sessionId: input.runRequest.sessionId,
        llm: input.runRequest.llm,
      },
    );

    const summaryText = this.buildSkillExecutionSummary(
      input.parsedIntent.skillKey ?? execution.agentId,
      input.parsedIntent.operation ?? execution.operation ?? 'default',
      result.data,
      result.cached,
    );

    if (input.format === 'vercel-ai') {
      const skillAdapter = new VercelAiStreamAdapter();
      const startChunk = skillAdapter.transform({ event: 'agent.start', data: { runId: result.runId, createdAt: new Date().toISOString(), input: summaryText } });
      if (startChunk) input.res.write(startChunk);
      const deltaChunk = skillAdapter.transform({ event: 'agent.delta', data: { id: generateUlid(), delta: summaryText } });
      if (deltaChunk) input.res.write(deltaChunk);
      const msgChunk = skillAdapter.transform({ event: 'agent.message', data: { id: generateUlid(), role: 'assistant', content: summaryText, createdAt: new Date().toISOString(), createdAtMs: Date.now() } });
      if (msgChunk) input.res.write(msgChunk);
      input.res.write(skillAdapter.done());
      return { runId: result.runId };
    }

    const now = new Date();
    const messageEvent = {
      event: 'agent.message' as const,
      data: {
        id: generateUlid(),
        role: 'assistant' as const,
        content: summaryText,
        createdAt: now.toISOString(),
        createdAtMs: now.getTime(),
        metadata: {
          skillInvocation: {
            skillKey: input.parsedIntent.skillKey ?? null,
            operation: input.parsedIntent.operation ?? null,
            runId: result.runId,
            cached: result.cached,
          },
        },
      },
    };

    this.writeEvent(input.res, {
      event: 'agent.start',
      data: {
        runId: result.runId,
        createdAt: now.toISOString(),
        input: summaryText,
      },
    });
    this.writeEvent(input.res, messageEvent);
    this.writeEvent(input.res, {
      event: 'agent.end',
      data: {
        runId: result.runId,
        status: 'succeeded',
        finishedAt: new Date().toISOString(),
        output: summaryText,
      },
    });

    return { runId: result.runId };
  }

  private buildSkillExecutionSummary(
    skillKey: string,
    operation: string,
    data: Record<string, unknown>,
    cached: boolean,
  ): string {
    const payload = JSON.stringify(data, null, 2);
    const trimmed = payload.length > 1200 ? `${payload.slice(0, 1197)}...` : payload;
    return `已执行技能 ${skillKey}:${operation}${cached ? '（缓存命中）' : ''}\n\n${trimmed}`;
  }

  private sanitizeChatContext(context: AgentChatRequest['context']): AgentChatContext | undefined {
    if (!this.isRecord(context)) {
      return undefined;
    }

    const sanitized: AgentChatContext = {};

    for (const [key, value] of Object.entries(context)) {
      if (key === 'composer') {
        const composer = this.sanitizeComposerContext(value);
        if (composer) {
          sanitized.composer = composer;
        }
        continue;
      }

      const normalizedValue = this.sanitizeGenericContextValue(value, 0);
      if (normalizedValue !== undefined) {
        sanitized[key] = normalizedValue;
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return undefined;
    }

    return sanitized;
  }

  private sanitizeComposerContext(value: unknown): AgentComposerContext | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const sanitized: AgentComposerContext = {};

    if (Array.isArray(value.enabledTools)) {
      const enabledTools = Array.from(
        new Set(
          value.enabledTools
            .filter((tool): tool is string => typeof tool === 'string')
            .map((tool) => tool.trim().slice(0, 64))
            .filter((tool) => tool.length > 0)
        )
      ).slice(0, this.maxComposerTools);

      if (enabledTools.length > 0) {
        sanitized.enabledTools = enabledTools;
      }
    }

    if (Array.isArray(value.attachments)) {
      const attachments = value.attachments
        .map((attachment) => this.sanitizeComposerAttachment(attachment))
        .filter((attachment): attachment is AgentComposerAttachment => attachment !== undefined)
        .slice(0, this.maxComposerAttachments);

      if (attachments.length > 0) {
        sanitized.attachments = attachments;
      }
    }

    if (typeof value.feishuEnabled === 'boolean') {
      sanitized.feishuEnabled = value.feishuEnabled;
    }

    if (value.inputMode === 'text' || value.inputMode === 'voice') {
      sanitized.inputMode = value.inputMode;
    }

    if (typeof value.skillActionId === 'string') {
      const skillActionId = value.skillActionId.trim().slice(0, 160);
      if (skillActionId.length > 0) {
        sanitized.skillActionId = skillActionId;
      }
    }

    if (value.rawInputs !== undefined) {
      const rawInputs = this.sanitizeGenericContextValue(value.rawInputs, 0);
      if (this.isRecord(rawInputs)) {
        sanitized.rawInputs = rawInputs as Record<string, unknown>;
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return undefined;
    }

    return sanitized;
  }

  private sanitizeComposerAttachment(value: unknown): AgentComposerAttachment | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const name = typeof value.name === 'string' ? value.name.trim().slice(0, 180) : '';
    if (!name) {
      return undefined;
    }

    const mimeType =
      typeof value.mimeType === 'string' ? value.mimeType.trim().slice(0, 120) : undefined;
    const size = typeof value.size === 'number' && Number.isFinite(value.size)
      ? Math.max(0, Math.round(value.size))
      : undefined;

    return {
      name,
      mimeType: mimeType || undefined,
      size,
      kind: value.kind === 'image' ? 'image' : 'file',
    };
  }

  private sanitizeGenericContextValue(value: unknown, depth: number): unknown {
    if (value === null) {
      return null;
    }
    if (typeof value === 'string') {
      return value.trim().slice(0, this.maxContextStringLength);
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (Array.isArray(value)) {
      if (depth >= this.maxContextDepth) {
        return undefined;
      }
      const items = value
        .slice(0, this.maxContextArrayLength)
        .map((item) => this.sanitizeGenericContextValue(item, depth + 1))
        .filter((item) => item !== undefined);
      return items;
    }
    if (!this.isRecord(value)) {
      return undefined;
    }
    if (depth >= this.maxContextDepth) {
      return undefined;
    }

    const result: Record<string, unknown> = {};
    const entries = Object.entries(value).slice(0, this.maxContextObjectKeys);
    for (const [key, nestedValue] of entries) {
      const sanitized = this.sanitizeGenericContextValue(nestedValue, depth + 1);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
    return result;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private validateAndNormalizeLlm(body: unknown): LlmRequestConfig | undefined {
    const legacyFields = findLegacyLlmFields(body);
    if (legacyFields.length > 0) {
      throw new AgentLlmValidationError(
        'invalid_llm_request',
        `Legacy LLM fields are no longer supported: ${legacyFields.join(', ')}. Use llm.* fields instead.`,
        { legacyFields },
      );
    }

    if (!this.isRecord(body) || body.llm === undefined) {
      return undefined;
    }

    return parseAgentLlmOrThrow(body);
  }

  private toLlmValidationError(error: unknown):
    | {
      code: 'invalid_llm_request' | 'unsupported_llm_provider';
      message: string;
      details?: unknown;
    }
    | null {
    if (!(error instanceof AgentLlmValidationError)) {
      return null;
    }

    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  private mapRunError(error: unknown): {
    statusCode: number;
    body: {
      code: string;
      message: string;
      details?: unknown;
      retryable?: boolean;
    };
  } {
    if (error instanceof AgentLlmValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        body: {
          code: error.code,
          message: error.message,
          details: error.details,
          retryable: false,
        },
      };
    }

    if (error instanceof AgentRuntimeError) {
      return {
        statusCode: error.statusCode,
        body: {
          code: error.code,
          message: error.message,
          details: error.details,
          retryable: error.retryable,
        },
      };
    }

    if (error instanceof HttpException) {
      const statusCode = error.getStatus();
      const response = error.getResponse();
      if (typeof response === 'object' && response !== null) {
        const payload = response as Record<string, unknown>;
        return {
          statusCode,
          body: {
            code: typeof payload.code === 'string' ? payload.code : 'agent_execution_failed',
            message: typeof payload.message === 'string' ? payload.message : error.message,
            details: payload.details,
            retryable: typeof payload.retryable === 'boolean' ? payload.retryable : undefined,
          },
        };
      }

      return {
        statusCode,
        body: {
          code: 'agent_execution_failed',
          message: typeof response === 'string' ? response : error.message,
        },
      };
    }

    if (error instanceof Error) {
      if (error.message.startsWith('snapshot_deserialize_failed')) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          body: {
            code: 'snapshot_deserialize_failed',
            message: error.message,
          },
        };
      }
      if (error.message.startsWith('snapshot_hash_build_failed')) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          body: {
            code: 'snapshot_hash_build_failed',
            message: error.message,
          },
        };
      }
      if (error.message.startsWith('snapshot_expiry_invalid')) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          body: {
            code: 'snapshot_expiry_invalid',
            message: error.message,
          },
        };
      }

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          code: 'agent_execution_failed',
          message: error.message,
        },
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: 'agent_execution_failed',
        message: 'Unknown error',
      },
    };
  }
}
