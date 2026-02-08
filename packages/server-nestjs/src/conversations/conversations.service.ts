import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  async create(
    input: { content?: string; title?: string },
    userId: string,
    contactId?: string,
  ): Promise<Conversation> {
    const nowMs = Date.now();
    const conversation = this.conversationRepository.create({
      title: input.title ?? null,
      content: input.content ?? input.title ?? '',
      userId,
      contactId,
      createdAt: nowMs as any,
      updatedAt: nowMs as any,
    });
    try {
      const saved = await this.conversationRepository.save(conversation);
      return saved;
    } catch (error) {
      throw error;
    }
  }

  async findAll(userId?: string): Promise<Conversation[]> {
    const queryOptions = {
      where: userId ? { userId } : undefined,
      order: { updatedAt: 'DESC' as const },
    };
    return this.conversationRepository.find(queryOptions);
  }

  async findOne(id: string, userId?: string): Promise<Conversation | null> {
    return this.conversationRepository.findOne({
      where: userId ? { id, userId } : { id },
    });
  }
}
