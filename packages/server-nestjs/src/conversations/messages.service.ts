import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, Message } from '../entities';
import type { AgentMessage } from '../agent/client-types';
import { generateUlid } from '../utils/ulid';

interface AppendMessageInput {
  id?: string;
  role: string;
  content: string;
  metadata?: Record<string, any>;
  citations?: Record<string, any>;
  createdAt?: string;
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}

  async appendMessage(
    conversationId: string,
    input: AppendMessageInput & { userId?: string },
  ): Promise<Message> {
    await this.getConversation(conversationId, input.userId);

    const message = this.messageRepository.create({
      id: input.id ?? generateUlid(),
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? null,
      citations: input.citations ?? null,
      conversationId,
      createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
    });

    const saved = await this.messageRepository.save(message);
    await this.conversationRepository.update(conversationId, { updatedAt: new Date() });
    return saved;
  }

  async listMessages(
    conversationId: string,
    options?: { limit?: number; before?: string; userId?: string },
  ): Promise<AgentMessage[]> {
    await this.getConversation(conversationId, options?.userId);
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
    const qb = this.messageRepository.createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'ASC')
      .limit(limit);

    if (options?.before) {
      const beforeDate = new Date(options.before);
      if (Number.isNaN(beforeDate.getTime())) {
        throw new BadRequestException('Invalid before timestamp');
      }
      qb.andWhere('message.createdAt < :before', { before: beforeDate });
    }

    const rows = await qb.getMany();
    return rows.map((row) => ({
      id: row.id,
      role: row.role as AgentMessage['role'],
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      metadata: row.metadata ?? undefined,
      references: (row.citations as AgentMessage['references']) ?? undefined,
    }));
  }

  private async getConversation(conversationId: string, userId?: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: userId ? { id: conversationId, userId } : { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }
    return conversation;
  }
}
