import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationArchive, Conversation, Contact, Event, ContactFact, ContactTodo } from '../entities';

type Citation = { messageId: string; start?: number; end?: number };

export interface ArchiveContact {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  citations?: Citation[];
}

export interface ArchiveEvent {
  title: string;
  description?: string;
  eventDate?: string;
  contactId?: string;
  contactRef?: string;
  citations?: Citation[];
}

export interface ArchiveFact {
  key: string;
  value: string;
  contactId?: string;
  contactRef?: string;
  citations?: Citation[];
}

export interface ArchiveTodo {
  description: string;
  dueDate?: string;
  contactId?: string;
  contactRef?: string;
  citations?: Citation[];
}

export interface ArchivePayload {
  contacts?: ArchiveContact[];
  events?: ArchiveEvent[];
  facts?: ArchiveFact[];
  todos?: ArchiveTodo[];
}

export interface ConversationArchiveResponse {
  id: string;
  status: string;
  summary: string | null;
  payload: ArchivePayload | null;
}

@Injectable()
export class ConversationArchivesService {
  constructor(
    @InjectRepository(ConversationArchive)
    private readonly archiveRepository: Repository<ConversationArchive>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(ContactFact)
    private readonly factRepository: Repository<ContactFact>,
    @InjectRepository(ContactTodo)
    private readonly todoRepository: Repository<ContactTodo>,
  ) {}

  async createArchive(conversationId: string, userId?: string | null): Promise<ConversationArchiveResponse> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['contact'],
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }
    if (userId && conversation.userId !== userId) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const summary = this.buildSummary(conversation.content);
    const citation = this.buildCitation(conversation, summary);
    const payload = this.buildArchivePayload(conversation, summary, citation);

    const archive = this.archiveRepository.create({
      conversationId,
      conversation,
      status: 'ready_for_review',
      summary,
      payload,
    });

    const saved = await this.archiveRepository.save(archive);
    return this.toResponse(saved);
  }

  async applyArchive(archiveId: string): Promise<ConversationArchiveResponse> {
    const archive = await this.archiveRepository.findOne({
      where: { id: archiveId },
      relations: ['conversation', 'conversation.contact'],
    });
    if (!archive) {
      throw new NotFoundException(`Conversation archive ${archiveId} not found`);
    }

    if (archive.status === 'applied') {
      return this.toResponse(archive);
    }

    if (archive.status === 'discarded') {
      throw new BadRequestException(`Conversation archive ${archiveId} is discarded`);
    }

    const payload = (archive.payload ?? {}) as ArchivePayload;
    const userId = archive.conversation?.userId ?? null;
    const contacts = Array.isArray(payload.contacts) ? payload.contacts : [];
    const events = Array.isArray(payload.events) ? payload.events : [];
    const facts = Array.isArray(payload.facts) ? payload.facts : [];
    const todos = Array.isArray(payload.todos) ? payload.todos : [];

    const contactMap = await this.upsertContacts(contacts, userId);
    const defaultContactId = this.pickDefaultContactId(archive, contactMap);

    await this.applyEvents(events, archive, contactMap, defaultContactId);
    await this.applyFacts(facts, archive, contactMap, defaultContactId);
    await this.applyTodos(todos, archive, contactMap, defaultContactId);

    archive.status = 'applied';
    archive.appliedAt = new Date();

    const saved = await this.archiveRepository.save(archive);
    return this.toResponse(saved);
  }

  async discardArchive(archiveId: string): Promise<ConversationArchiveResponse> {
    const archive = await this.archiveRepository.findOne({ where: { id: archiveId } });
    if (!archive) {
      throw new NotFoundException(`Conversation archive ${archiveId} not found`);
    }

    if (archive.status === 'applied') {
      throw new BadRequestException(`Conversation archive ${archiveId} is applied`);
    }

    if (archive.status === 'discarded') {
      return this.toResponse(archive);
    }

    archive.status = 'discarded';
    archive.discardedAt = new Date();
    const saved = await this.archiveRepository.save(archive);
    return this.toResponse(saved);
  }

  private buildArchivePayload(conversation: Conversation, summary: string, citation: Citation): ArchivePayload {
    const parsed = (conversation.parsedData ?? {}) as ArchivePayload;
    const contacts = Array.isArray(parsed.contacts)
      ? parsed.contacts.map(contact => this.withCitations(contact, citation))
      : [];
    const events = Array.isArray(parsed.events) ? parsed.events.map(event => this.withCitations(event, citation)) : [];
    const facts = Array.isArray(parsed.facts) ? parsed.facts.map(fact => this.withCitations(fact, citation)) : [];
    const todos = Array.isArray(parsed.todos) ? parsed.todos.map(todo => this.withCitations(todo, citation)) : [];

    if (contacts.length === 0) {
      const fallbackContact: ArchiveContact = conversation.contact
        ? {
            name: conversation.contact.name,
            email: conversation.contact.email ?? undefined,
            phone: conversation.contact.phone ?? undefined,
            company: conversation.contact.company ?? undefined,
            position: conversation.contact.position ?? undefined,
          }
        : { name: 'Conversation Contact' };
      contacts.push(this.withCitations<ArchiveContact>(fallbackContact, citation));
    }

    const defaultContactRef = this.contactRefFromContact(contacts[0]);

    if (events.length === 0) {
      events.push(
        this.withCitations<ArchiveEvent>(
          {
            title: 'Conversation summary',
            description: summary,
            eventDate: new Date().toISOString(),
            contactRef: defaultContactRef,
          },
          citation,
        ),
      );
    } else {
      events.forEach(event => {
        if (!event.contactId && !event.contactRef) {
          event.contactRef = defaultContactRef;
        }
      });
    }

    if (facts.length === 0) {
      facts.push(
        this.withCitations<ArchiveFact>(
          {
            key: 'summary',
            value: summary,
            contactRef: defaultContactRef,
          },
          citation,
        ),
      );
    } else {
      facts.forEach(fact => {
        if (!fact.contactId && !fact.contactRef) {
          fact.contactRef = defaultContactRef;
        }
      });
    }

    if (todos.length === 0) {
      todos.push(
        this.withCitations<ArchiveTodo>(
          {
            description: 'Follow up on the conversation',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            contactRef: defaultContactRef,
          },
          citation,
        ),
      );
    } else {
      todos.forEach(todo => {
        if (!todo.contactId && !todo.contactRef) {
          todo.contactRef = defaultContactRef;
        }
      });
    }

    return { contacts, events, facts, todos };
  }

  private buildSummary(content: string): string {
    const trimmed = content?.trim() ?? '';
    if (trimmed.length === 0) {
      return 'Conversation archive summary';
    }
    return trimmed.slice(0, 200);
  }

  private buildCitation(conversation: Conversation, summary: string): Citation {
    const end = Math.min(summary.length, 120);
    return {
      messageId: conversation.id,
      start: 0,
      end,
    };
  }

  private withCitations<T extends { citations?: Citation[] }>(item: T, citation: Citation): T {
    const citations = Array.isArray(item.citations) && item.citations.length > 0 ? item.citations : [citation];
    return { ...item, citations };
  }

  private contactRefFromContact(contact?: ArchiveContact): string | undefined {
    if (!contact) return undefined;
    if (contact.email) return contact.email;
    if (contact.name) return contact.name;
    return undefined;
  }

  private normalizeContactKey(value: string): string {
    return value.trim().toLowerCase();
  }

  private async upsertContacts(contacts: ArchiveContact[], userId: string | null): Promise<Map<string, Contact>> {
    const map = new Map<string, Contact>();

    for (const contact of contacts) {
      if (!contact.name) {
        continue;
      }
      const where: Record<string, any> = contact.email ? { email: contact.email } : { name: contact.name };
      if (userId) {
        where.userId = userId;
      }
      let existing = await this.contactRepository.findOne({ where });
      const updates = this.pickContactFields(contact);

      if (existing) {
        Object.assign(existing, updates);
        existing = await this.contactRepository.save(existing);
      } else {
        const created = this.contactRepository.create({
          ...updates,
          userId: userId ?? undefined,
        });
        existing = await this.contactRepository.save(created);
      }

      this.addContactMapKeys(map, existing);
    }

    return map;
  }

  private pickContactFields(contact: ArchiveContact): Partial<Contact> {
    const fields: Partial<Contact> = {};
    if (contact.name) fields.name = contact.name;
    if (contact.email !== undefined) fields.email = contact.email ?? null;
    if (contact.phone !== undefined) fields.phone = contact.phone ?? null;
    if (contact.company !== undefined) fields.company = contact.company ?? null;
    if (contact.position !== undefined) fields.position = contact.position ?? null;
    return fields;
  }

  private addContactMapKeys(map: Map<string, Contact>, contact: Contact): void {
    if (contact.email) {
      map.set(`email:${this.normalizeContactKey(contact.email)}`, contact);
    }
    if (contact.name) {
      map.set(`name:${this.normalizeContactKey(contact.name)}`, contact);
    }
  }

  private pickDefaultContactId(archive: ConversationArchive, map: Map<string, Contact>): string | null {
    if (archive.conversation?.contactId) {
      return archive.conversation.contactId;
    }
    const first = map.values().next();
    return first.done ? null : first.value.id;
  }

  private resolveContactId(
    item: { contactId?: string; contactRef?: string },
    map: Map<string, Contact>,
    fallbackId: string | null,
  ): string | null {
    if (item.contactId) {
      return item.contactId;
    }
    if (item.contactRef) {
      const normalized = this.normalizeContactKey(item.contactRef);
      const key = item.contactRef.includes('@') ? `email:${normalized}` : `name:${normalized}`;
      const matched = map.get(key);
      if (matched) {
        return matched.id;
      }
    }
    return fallbackId;
  }

  private async applyEvents(
    events: ArchiveEvent[],
    archive: ConversationArchive,
    map: Map<string, Contact>,
    fallbackId: string | null,
  ): Promise<void> {
    for (const event of events) {
      const contactId = this.resolveContactId(event, map, fallbackId);
      const eventDate = event.eventDate ? new Date(event.eventDate) : null;
      const details = {
        ...(event.citations ? { citations: event.citations } : {}),
        sourceArchiveId: archive.id,
        sourceConversationId: archive.conversationId,
      };
      const created = this.eventRepository.create({
        title: event.title,
        description: event.description ?? null,
        eventDate: eventDate ?? undefined,
        contactId,
        details,
      });
      await this.eventRepository.save(created);
    }
  }

  private async applyFacts(
    facts: ArchiveFact[],
    archive: ConversationArchive,
    map: Map<string, Contact>,
    fallbackId: string | null,
  ): Promise<void> {
    for (const fact of facts) {
      const contactId = this.resolveContactId(fact, map, fallbackId);
      if (!contactId) {
        continue;
      }
      const metadata = {
        key: fact.key,
        value: fact.value,
        citations: fact.citations ?? null,
        sourceArchiveId: archive.id,
      };
      const created = this.factRepository.create({
        content: `${fact.key}: ${fact.value}`,
        metadata,
        sourceConversationId: archive.conversationId,
        contactId,
      });
      await this.factRepository.save(created);
    }
  }

  private async applyTodos(
    todos: ArchiveTodo[],
    archive: ConversationArchive,
    map: Map<string, Contact>,
    fallbackId: string | null,
  ): Promise<void> {
    for (const todo of todos) {
      const contactId = this.resolveContactId(todo, map, fallbackId);
      const dueDate = todo.dueDate ? new Date(todo.dueDate) : null;
      if (!contactId) {
        continue;
      }
      const metadata = {
        citations: todo.citations ?? null,
        sourceArchiveId: archive.id,
      };
      const created = this.todoRepository.create({
        content: todo.description,
        dueAt: dueDate,
        metadata,
        sourceConversationId: archive.conversationId,
        contactId,
      });
      await this.todoRepository.save(created);
    }
  }

  private toResponse(archive: ConversationArchive): ConversationArchiveResponse {
    return {
      id: archive.id,
      status: archive.status,
      summary: archive.summary ?? null,
      payload: (archive.payload ?? null) as ArchivePayload | null,
    };
  }
}
