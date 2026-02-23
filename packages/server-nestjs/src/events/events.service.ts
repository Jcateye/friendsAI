import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities';

interface CreateEventDto {
  title: string;
  description?: string;
  contactId: string;
  eventDate?: string;
  sourceConversationId?: string;
  details?: Record<string, any>;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const contactId = createEventDto.contactId?.trim();
    if (!contactId) {
      throw new BadRequestException('contactId is required');
    }

    const normalizedEventDate = this.normalizeEventDate(createEventDto.eventDate, createEventDto.details);

    const event = this.eventRepository.create({
      ...createEventDto,
      contactId,
      eventDate: normalizedEventDate ?? undefined,
      sourceConversationId: createEventDto.sourceConversationId ?? null,
    });
    return this.eventRepository.save(event);
  }

  async findByContact(contactId: string): Promise<Event[]> {
    return this.eventRepository.find({
      where: { contactId },
      order: { createdAt: 'DESC' },
    });
  }

  private normalizeEventDate(
    eventDate?: string,
    details?: Record<string, any>,
  ): Date | null {
    const raw =
      (typeof eventDate === 'string' && eventDate.trim().length > 0
        ? eventDate
        : typeof details?.occurredAt === 'string'
          ? details.occurredAt
          : undefined);

    if (!raw) {
      return null;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date;
  }
}
