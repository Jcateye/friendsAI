import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AgentOrchestrator } from './agent.orchestrator';
import type { AgentChatRequest, AgentStreamEvent } from './agent.types';

@Controller('v1/agent')
export class AgentController {
  constructor(private readonly agentOrchestrator: AgentOrchestrator) {}

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

    try {
      res.write(`event: ready\ndata: ${JSON.stringify({})}\n\n`);

      for await (const event of this.agentOrchestrator.streamChat(body, {
        signal: abortController.signal,
      })) {
        if (res.writableEnded) {
          break;
        }
        this.writeEvent(res, event);
      }
    } catch (error) {
      if (!res.writableEnded) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.writeEvent(res, { type: 'error', message });
      }
    } finally {
      req.off('close', handleClose);
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  private writeEvent(res: Response, event: AgentStreamEvent): void {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}
