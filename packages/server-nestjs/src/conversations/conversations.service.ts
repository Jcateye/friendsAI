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
    const conversation = this.conversationRepository.create({
      title: input.title ?? null,
      content: input.content ?? input.title ?? '',
      userId,
      contactId,
    });
    return this.conversationRepository.save(conversation);
  }

  async findAll(userId?: string): Promise<Conversation[]> {
    return this.conversationRepository.find({
      where: userId ? { userId } : undefined,
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string, userId?: string): Promise<Conversation | null> {
    return this.conversationRepository.findOne({
      where: userId ? { id, userId } : { id },
    });
  }
}
