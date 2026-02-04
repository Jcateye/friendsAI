import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities';

interface CreateEventDto {
  title: string;
  description?: string;
  contactId: string;
  details?: Record<string, any>;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const event = this.eventRepository.create(createEventDto);
    return this.eventRepository.save(event);
  }

  async findByContact(contactId: string): Promise<Event[]> {
    return this.eventRepository.find({
      where: { contactId },
      order: { createdAt: 'DESC' },
    });
  }
}