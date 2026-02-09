import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AgentOrchestrator } from './agent.orchestrator';
import { AgentMessageStore } from './agent-message.store';
import type { AgentChatRequest, AgentRunRequest, AgentRunResponse, AgentStreamEvent } from './agent.types';
import type { AgentError, AgentRunEnd, AgentSseEvent } from './client-types';
import { VercelAiStreamAdapter } from './adapters/vercel-ai-stream.adapter';
import { AgentRuntimeExecutor } from './runtime/agent-runtime-executor.service';
import { AgentListService } from './agent-list.service';
import { AgentListResponseDto } from './dto/agent-list.dto';

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentOrchestrator: AgentOrchestrator,
    private readonly messageStore: AgentMessageStore,
    private readonly agentRuntimeExecutor: AgentRuntimeExecutor,
    private readonly agentListService: AgentListService,
  ) {}

  @Post('chat')
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
      const preparedRequest: AgentChatRequest = {
        ...body,
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
    description: '返回所有可用的 Agent 信息，包括状态、配置、使用说明等，就像名片一样展示每个 Agent 的能力和用法',
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
}
