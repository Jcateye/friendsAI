import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AgentOrchestrator } from './agent.orchestrator';
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
import { AgentRuntimeExecutor } from './runtime/agent-runtime-executor.service';
import { AgentListService } from './agent-list.service';
import { AgentListResponseDto } from './dto/agent-list.dto';

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  private readonly maxContextDepth = 3;
  private readonly maxContextArrayLength = 20;
  private readonly maxContextObjectKeys = 24;
  private readonly maxContextStringLength = 500;
  private readonly maxComposerTools = 12;
  private readonly maxComposerAttachments = 10;

  constructor(
    private readonly agentOrchestrator: AgentOrchestrator,
    private readonly messageStore: AgentMessageStore,
    private readonly agentRuntimeExecutor: AgentRuntimeExecutor,
    private readonly agentListService: AgentListService,
  ) {}

  @Post('chat')
  @ApiOperation({
    summary: '与 Agent 进行对话（流式 / Vercel AI 适配）',
    description:
      '发起与多 Agent 协调的流式对话，请求体支持 messages（多轮聊天记录）或 prompt（单轮提示），二者至少提供其一；' +
      '通过 format 查询参数选择输出流格式：sse 时返回 text/event-stream 的 Agent 事件（agent.start / agent.delta / agent.message 等），' +
      'vercel-ai 时返回兼容 Vercel AI SDK 的纯文本增量流。常用于前端聊天框、打字机效果，以及需要实时看到工具调用进度的场景。',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: '响应格式：sse（默认，EventSource）或 vercel-ai（适配 Vercel AI SDK）',
    example: 'sse',
  })
  @HttpCode(200)
  async chat(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: AgentChatRequest,
    @Query('format') format: 'sse' | 'vercel-ai' = 'sse',
  ): Promise<void> {
    const hasMessages = Array.isArray(body?.messages) && body.messages.length > 0;
    const hasPrompt = typeof body?.prompt === 'string' && body.prompt.trim().length > 0;

    if (!hasMessages && !hasPrompt) {
      res.status(400).json({ message: 'Either "messages" or "prompt" must be provided.' });
      return;
    }

    res.status(200);
    
    // 根据 format 设置响应头
    if (format === 'vercel-ai') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('X-Vercel-AI-Data-Stream', 'v1');
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
        userId: (req.user as { id?: string } | undefined)?.id ?? body.userId,
      };

      for await (const event of this.agentOrchestrator.streamChat(preparedRequest, {
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
      if (!res.writableEnded) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const errorPayload: AgentError = {
          code: 'stream_error',
          message,
        };
        this.writeEvent(res, { event: 'error', data: errorPayload });
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
          this.writeEvent(res, { event: 'agent.end', data: endPayload });
        }
        res.end();
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
    status: 404,
    description: 'Agent 不存在或执行失败（agent_execution_failed）',
  })
  @HttpCode(200)
  async run(
    @Req() req: Request,
    @Body() body: AgentRunRequest,
  ): Promise<AgentRunResponse> {
    const userId = (req.user as { id?: string } | undefined)?.id ?? body.userId;

    try {
      const result = await this.agentRuntimeExecutor.execute(
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
        }
      );

      const now = new Date();
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
      if (error instanceof NotFoundException) {
        throw error;
      }
      // 其他错误转换为标准格式
      throw new NotFoundException({
        code: 'agent_execution_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
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
  async getAgentList(): Promise<AgentListResponseDto> {
    return this.agentListService.getAgentList();
  }

  private writeEvent(res: Response, event: AgentStreamEvent | AgentSseEvent): void {
    res.write(`event: ${event.event}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
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
}
