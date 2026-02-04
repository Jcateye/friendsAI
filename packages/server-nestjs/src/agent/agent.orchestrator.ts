import { BadRequestException, Injectable } from '@nestjs/common';
import type OpenAI from 'openai';
import { AiService } from '../ai/ai.service';
import { AgentChatRequest, AgentStreamEvent } from './agent.types';

@Injectable()
export class AgentOrchestrator {
  constructor(private readonly aiService: AiService) {}

  async *streamChat(
    request: AgentChatRequest,
    options?: { signal?: AbortSignal }
  ): AsyncGenerator<AgentStreamEvent> {
    const messages = this.buildMessages(request);
    const stream = await this.aiService.streamChat(messages, {
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens ?? request.max_tokens,
      signal: options?.signal,
    });

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      const delta = choice?.delta?.content;
      if (delta) {
        yield { type: 'token', content: delta };
      }
      const finishReason = choice?.finish_reason;
      if (finishReason) {
        yield { type: 'done', reason: finishReason };
      }
    }
  }

  private buildMessages(
    request: AgentChatRequest
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages = request.messages && request.messages.length > 0 ? [...request.messages] : [];

    if (messages.length === 0) {
      if (!request.prompt) {
        throw new BadRequestException('Either "messages" or "prompt" must be provided.');
      }
      messages.push({ role: 'system', content: 'You are a helpful assistant.' });
      if (request.context) {
        messages.push({
          role: 'system',
          content: `Context: ${JSON.stringify(request.context)}`,
        });
      }
      messages.push({ role: 'user', content: request.prompt });
      return messages;
    }

    const hasSystem = messages.some((message) => message.role === 'system');
    if (!hasSystem) {
      messages.unshift({ role: 'system', content: 'You are a helpful assistant.' });
    }

    if (request.context) {
      messages.splice(1, 0, {
        role: 'system',
        content: `Context: ${JSON.stringify(request.context)}`,
      });
    }

    return messages;
  }
}
