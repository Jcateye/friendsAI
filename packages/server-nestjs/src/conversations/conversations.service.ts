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

  async create(content: string, userId: string, contactId?: string): Promise<Conversation> {
    const conversation = this.conversationRepository.create({
      content,
      userId,
      contactId,
    });
    return this.conversationRepository.save(conversation);
  }

  async findAll(): Promise<Conversation[]> {
    return this.conversationRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Conversation | null> {
    return this.conversationRepository.findOne({
      where: { id },
    });
  }
}