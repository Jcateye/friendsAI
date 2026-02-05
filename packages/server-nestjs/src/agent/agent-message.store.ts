import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
  toolCallId?: string;
  metadata?: Record<string, JsonValue>;
}

@Injectable()
export class AgentMessageStore {
  private readonly messages = new Map<string, AgentMessage[]>();
  private readonly maxMessagesPerKey = 200;

  buildKey(userId?: string, conversationId?: string): string {
    const userKey = userId?.trim() || 'anonymous';
    const conversationKey = conversationId?.trim() || 'default';
    return `${userKey}:${conversationKey}`;
  }

  createMessage(input: MessageInput): AgentMessage {
    return {
      id: input.id ?? randomUUID(),
      role: input.role,
      content: input.content,
      createdAt: input.createdAt ?? new Date().toISOString(),
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
