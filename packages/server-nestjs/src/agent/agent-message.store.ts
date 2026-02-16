import { Injectable } from '@nestjs/common';
import { generateUlid } from '../utils/ulid';
import type {
  AgentMessage,
  AgentMessageRole,
  JsonValue,
} from './client-types';

interface MessageInput {
  id?: string;
  role: AgentMessageRole;
  content: string;
  createdAt?: string;
  createdAtMs?: number;
  toolCallId?: string;
  metadata?: Record<string, JsonValue>;
}

@Injectable()
export class AgentMessageStore {
  private readonly messages = new Map<string, AgentMessage[]>();
  private readonly maxMessagesPerKey = 200;

  private resolveCreatedAtMs(input: Pick<MessageInput, 'createdAt' | 'createdAtMs'>): number {
    if (typeof input.createdAtMs === 'number' && Number.isFinite(input.createdAtMs)) {
      return input.createdAtMs;
    }

    if (typeof input.createdAt === 'string') {
      const parsed = new Date(input.createdAt).getTime();
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return Date.now();
  }

  buildKey(userId?: string, conversationId?: string): string {
    const userKey = userId?.trim() || 'anonymous';
    const conversationKey = conversationId?.trim() || 'default';
    return `${userKey}:${conversationKey}`;
  }

  createMessage(input: MessageInput): AgentMessage {
    const createdAtMs = this.resolveCreatedAtMs(input);

    return {
      id: input.id ?? generateUlid(),
      role: input.role,
      content: input.content,
      createdAt: new Date(createdAtMs).toISOString(),
      createdAtMs,
      toolCallId: input.toolCallId,
      metadata: input.metadata,
    };
  }

  appendMessage(key: string, message: AgentMessage): void {
    const existing = this.messages.get(key) ?? [];
    const next = [...existing, message].slice(-this.maxMessagesPerKey);
    this.messages.set(key, next);
  }

  listMessages(key: string): AgentMessage[] {
    return [...(this.messages.get(key) ?? [])];
  }
}
