import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../entities';

interface CreateContactDto {
  name: string;
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

  async create(createContactDto: CreateContactDto): Promise<Contact> {
    const contact = this.contactRepository.create(createContactDto);
    return this.contactRepository.save(contact);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ items: Contact[]; total: number }> {
    const [items, total] = await this.contactRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total };
  }

  async findOne(id: string): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: { id },
      relations: ['events', 'conversations'],
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    return contact;
  }

  async update(id: string, updateContactDto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findOne(id);
    Object.assign(contact, updateContactDto);
    return this.contactRepository.save(contact);
  }

  async getContactContext(id: string): Promise<{
    events: Contact['events'];
    facts: Array<{ key: string; value: string; conversationId?: string; createdAt?: Date }>;
    todos: Array<{ description: string; dueDate?: string; conversationId?: string; createdAt?: Date }>;
    recentEvents: Array<{ id: string; summary: string; occurredAt: Date; occurred_at: Date; title: string | null }>;
    stableFacts: Array<{ key: string; value: string }>;
    openActions: Array<{ id: string; suggestion_reason: string; due_at?: string | null }>;
  }> {
    const contact = await this.contactRepository.findOne({
      where: { id },
      relations: ['events', 'conversations'],
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const events = [...(contact.events ?? [])].sort((a, b) => {
      const aTime = (a.eventDate ?? a.createdAt).getTime();
      const bTime = (b.eventDate ?? b.createdAt).getTime();
      return bTime - aTime;
    });

    const facts: Array<{ key: string; value: string; conversationId?: string; createdAt?: Date }> = [];
    const todos: Array<{ description: string; dueDate?: string; conversationId?: string; createdAt?: Date }> = [];

    (contact.conversations ?? []).forEach(conversation => {
      const parsedData = conversation.parsedData ?? {};
      const conversationId = conversation.id;
      const createdAt = conversation.createdAt;

      (parsedData.facts ?? []).forEach((fact: { key: string; value: string }) => {
        facts.push({ ...fact, conversationId, createdAt });
      });

      (parsedData.todos ?? []).forEach((todo: { description: string; dueDate?: string }) => {
        todos.push({ ...todo, conversationId, createdAt });
      });
    });

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

    const stableFacts = facts.map(fact => ({ key: fact.key, value: fact.value }));
    const openActions = todos.map((todo, index) => ({
      id: `${todo.conversationId ?? 'todo'}-${index}`,
      suggestion_reason: todo.description,
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

  async remove(id: string): Promise<void> {
    const contact = await this.findOne(id);
    await this.contactRepository.remove(contact);
  }
}
