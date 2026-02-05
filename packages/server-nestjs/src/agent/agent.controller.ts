import { Body, Controller, Get, HttpCode, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AgentOrchestrator } from './agent.orchestrator';
import { AgentMessageStore } from './agent-message.store';
import type { AgentChatRequest, AgentStreamEvent } from './agent.types';
import type { AgentError, AgentRunEnd, AgentSseEvent } from './client-types';

@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentOrchestrator: AgentOrchestrator,
    private readonly messageStore: AgentMessageStore,
  ) {}

  @Post('chat')
  @HttpCode(200)
  async chat(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: AgentChatRequest
  ): Promise<void> {
    const hasMessages = Array.isArray(body?.messages) && body.messages.length > 0;
    const hasPrompt = typeof body?.prompt === 'string' && body.prompt.trim().length > 0;

    if (!hasMessages && !hasPrompt) {
      res.status(400).json({ message: 'Either "messages" or "prompt" must be provided.' });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

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
        userId: body.userId ?? (req.user as { id?: string } | undefined)?.id,
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
        this.writeEvent(res, event);
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

  private writeEvent(res: Response, event: AgentStreamEvent | AgentSseEvent): void {
    res.write(`event: ${event.event}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}
