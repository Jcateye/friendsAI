import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai.service';
import { Conversation, Event } from '../../entities';

@Injectable()
export class VectorService {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async storeEmbedding(
    entity: Conversation | Event,
    text: string,
  ): Promise<Conversation | Event> {
    const embedding = await this.aiService.generateEmbedding(text);
    entity.embedding = embedding;

    if (entity instanceof Conversation) {
      return this.conversationRepository.save(entity);
    } else if (entity instanceof Event) {
      return this.eventRepository.save(entity);
    }
    throw new Error('Unsupported entity type for embedding storage.');
  }

  async embedConversation(conversation: Conversation): Promise<Conversation> {
    const embedding = await this.aiService.generateEmbedding(conversation.content);
    conversation.embedding = embedding;
    return this.conversationRepository.save(conversation);
  }

  async embedEvent(event: Event): Promise<Event> {
    const textToEmbed = event.description || event.title;
    const embedding = await this.aiService.generateEmbedding(textToEmbed);
    event.embedding = embedding;
    return this.eventRepository.save(event);
  }
}
