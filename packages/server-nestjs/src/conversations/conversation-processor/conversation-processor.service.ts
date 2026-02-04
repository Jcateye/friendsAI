import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { VectorService } from '../../ai/vector/vector.service';
import { Conversation, Contact, Event, User } from '../../entities';

// Interface for AI parsed data
export interface ParsedConversationData {
  contacts?: Array<{ name: string; email?: string; phone?: string; company?: string; position?: string; }>;
  events?: Array<{ title: string; description?: string; eventDate?: string; }>;
  facts?: Array<{ key: string; value: string; }>;
  todos?: Array<{ description: string; dueDate?: string; }>;
}

@Injectable()
export class ConversationProcessorService {
  constructor(
    private readonly aiService: AiService,
    private readonly vectorService: VectorService,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async processConversation(
    conversationId: string,
    content: string,
    userId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({ where: { id: conversationId, userId } });
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found for user ${userId}`);
    }

    const aiPrompt = this.buildAiPrompt(content);
    const aiResponse = await this.aiService.callAgent(aiPrompt);

    let parsedData: ParsedConversationData = {};
    try {
      parsedData = JSON.parse(aiResponse);
    } catch (e) {
      console.warn('AI response was not valid JSON:', aiResponse);
      parsedData.facts = [{ key: 'summary', value: aiResponse }]; // Fallback to raw response as summary
    }

    // Process contacts
    if (parsedData.contacts && parsedData.contacts.length > 0) {
      for (const contactData of parsedData.contacts) {
        let contact = await this.contactRepository.findOne({
          where: {
            userId: userId,
            // Try to find by email or name, assuming email is more unique
            ...(contactData.email ? { email: contactData.email } : { name: contactData.name }),
          },
        });

        if (contact) {
          // Update existing contact
          Object.assign(contact, contactData);
        } else {
          // Create new contact
          contact = this.contactRepository.create({
            ...contactData,
            userId: userId,
          });
        }
        await this.contactRepository.save(contact);
        // Link conversation to contact if not already
        if (!conversation.contactId && contact.id) {
          conversation.contact = contact;
          conversation.contactId = contact.id;
        }
      }
    }

    // Process events
    if (parsedData.events && parsedData.events.length > 0) {
      for (const eventData of parsedData.events) {
        const event = this.eventRepository.create({
          ...eventData,
          contactId: conversation.contactId || null, // Link event to conversation's contact if available
        });
        await this.vectorService.embedEvent(event); // Embed event text
      }
    }

    // Store facts and todos directly in conversation's parsedData for now
    conversation.parsedData = parsedData;

    // Embed conversation content and save
    const updatedConversation = await this.vectorService.embedConversation(conversation);
    return updatedConversation;
  }

  // Helper to build a detailed AI prompt for extraction
  private buildAiPrompt(content: string): string {
    return `Given the following conversation or meeting notes, extract structured information.
    The output should be a JSON object with optional keys: 'contacts', 'events', 'facts', 'todos'.

    'contacts': An array of objects, each with 'name', 'email', 'phone', 'company', 'position'.
    'events': An array of objects, each with 'title', 'description', 'eventDate' (ISO format).
    'facts': An array of objects, each with 'key' and 'value' for important details or profile highlights.
    'todos': An array of objects, each with 'description' and 'dueDate' (ISO format).

    If a field is not available or not applicable, omit it.
    Example JSON output:
    {
      "contacts": [{ "name": "John Doe", "email": "john@example.com" }],
      "events": [{ "title": "Meeting with John", "eventDate": "2024-03-15T10:00:00Z" }],
      "facts": [{ "key": "hobby", "value": "hiking" }],
      "todos": [{ "description": "Follow up with John", "dueDate": "2024-03-16T09:00:00Z" }]
    }

    Conversation content:
    "${content}"
    `;
  }
}
