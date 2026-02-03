import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities';

export interface ConversationRecordDto {
  id: string;
  title: string;
  summary: string;
  status: 'pending' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDetailDto extends ConversationRecordDto {
  originalContent: string;
  archiveResult?: Record<string, any> | null;
}

const createTitle = (content: string) => content?.slice(0, 12) || '';
const createSummary = (content: string) => content?.slice(0, 60) || '';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  async create(content: string, userId: string, contactId?: string): Promise<ConversationDetailDto> {
    const conversation = this.conversationRepository.create({
      content,
      userId,
      contactId,
    });
    const saved = await this.conversationRepository.save(conversation);
    return this.toDetailDto(saved);
  }

  async findAll(userId: string): Promise<ConversationRecordDto[]> {
    const records = await this.conversationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => this.toRecordDto(record));
  }

  async findOne(id: string, userId: string): Promise<ConversationDetailDto | null> {
    const record = await this.conversationRepository.findOne({
      where: { id },
    });
    if (!record || record.userId !== userId) {
      return null;
    }
    return this.toDetailDto(record);
  }

  async archive(
    id: string,
    userId: string,
    archiveResult?: Record<string, any> | null,
  ): Promise<ConversationDetailDto> {
    const record = await this.conversationRepository.findOne({
      where: { id },
    });
    if (!record || record.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }
    record.isArchived = true;
    record.parsedData = archiveResult ?? record.parsedData ?? null;
    const saved = await this.conversationRepository.save(record);
    return this.toDetailDto(saved);
  }

  private toRecordDto(record: Conversation): ConversationRecordDto {
    return {
      id: record.id,
      title: createTitle(record.content),
      summary: createSummary(record.content),
      status: record.isArchived ? 'archived' : 'pending',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private toDetailDto(record: Conversation): ConversationDetailDto {
    return {
      ...this.toRecordDto(record),
      originalContent: record.content,
      archiveResult: record.parsedData ?? null,
    };
  }
}
