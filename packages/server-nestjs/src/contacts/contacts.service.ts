import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../entities';

interface CreateContactDto {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  profile?: Record<string, any>;
  tags?: string[];
}

interface UpdateContactDto {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  profile?: Record<string, any>;
  tags?: string[];
}

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async create(createContactDto: CreateContactDto, userId?: string): Promise<Contact> {
    if (!createContactDto.name) {
      throw new BadRequestException('displayName is required');
    }
    const contact = this.contactRepository.create({
      ...createContactDto,
      userId: userId ?? null,
    });
    return this.contactRepository.save(contact);
  }

  async findAll(
    userId?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ items: Contact[]; total: number }> {
    const [items, total] = await this.contactRepository.findAndCount({
      where: userId ? { userId } : undefined,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total };
  }

  async findOne(id: string, userId?: string): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: userId ? { id, userId } : { id },
      relations: ['events', 'conversations'],
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    return contact;
  }

  async update(id: string, updateContactDto: UpdateContactDto, userId?: string): Promise<Contact> {
    const contact = await this.findOne(id, userId);
    Object.assign(contact, updateContactDto);
    return this.contactRepository.save(contact);
  }

  async getContactContext(id: string, userId?: string): Promise<{
    events: Contact['events'];
    facts: Array<{ id: string; content: string; conversationId?: string | null; createdAt?: Date }>;
    todos: Array<{ id: string; content: string; dueDate?: string | null; conversationId?: string | null; createdAt?: Date }>;
    recentEvents: Array<{ id: string; summary: string; occurredAt: Date; occurred_at: Date; title: string | null }>;
    stableFacts: Array<{ content: string }>;
    openActions: Array<{ id: string; suggestion_reason: string; due_at?: string | null }>;
  }> {
    const contact = await this.contactRepository.findOne({
      where: userId ? { id, userId } : { id },
      relations: ['events', 'conversations', 'facts', 'todos'],
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const events = [...(contact.events ?? [])].sort((a, b) => {
      const aTime = (a.eventDate ?? a.createdAt).getTime();
      const bTime = (b.eventDate ?? b.createdAt).getTime();
      return bTime - aTime;
    });

    const facts = (contact.facts ?? []).map((fact) => ({
      id: fact.id,
      content: fact.content,
      conversationId: fact.sourceConversationId,
      createdAt: fact.createdAt,
    }));

    const todos = (contact.todos ?? []).map((todo) => ({
      id: todo.id,
      content: todo.content,
      dueDate: todo.dueAt ? todo.dueAt.toISOString() : null,
      conversationId: todo.sourceConversationId,
      createdAt: todo.createdAt,
    }));

    const recentEvents = events.map(event => {
      const occurredAt = event.eventDate ?? event.createdAt;
      return {
        id: event.id,
        title: event.title ?? null,
        summary: event.description ?? event.title,
        occurredAt,
        occurred_at: occurredAt,
      };
    });

    const stableFacts = facts.map((fact) => ({ content: fact.content }));
    const openActions = todos.map((todo) => ({
      id: todo.id,
      suggestion_reason: todo.content,
      due_at: todo.dueDate ?? null,
    }));

    return {
      events,
      facts,
      todos,
      recentEvents,
      stableFacts,
      openActions,
    };
  }

  async remove(id: string, userId?: string): Promise<void> {
    const contact = await this.findOne(id, userId);
    await this.contactRepository.remove(contact);
  }
}
