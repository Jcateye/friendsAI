import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { Contact, Conversation, Event } from '../../entities';

@Injectable()
export class BriefingService {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async generateBriefing(contactId: string, userId: string): Promise<string> {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, userId },
      relations: ['conversations', 'events'], // Load related data
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found for user ${userId}`);
    }

    const relevantInfo = this.extractRelevantInfo(contact);
    const aiPrompt = this.buildBriefingPrompt(contact, relevantInfo);
    const briefing = await this.aiService.callAgent(aiPrompt);

    return briefing;
  }

  // Helper to extract relevant info from contact, conversations, events
  private extractRelevantInfo(contact: Contact): string {
    let info = `Contact Name: ${contact.name}\n`;
    if (contact.email) info += `Email: ${contact.email}\n`;
    if (contact.phone) info += `Phone: ${contact.phone}\n`;
    if (contact.company) info += `Company: ${contact.company}\n`;
    if (contact.position) info += `Position: ${contact.position}\n`;
    if (contact.profile) info += `Profile: ${JSON.stringify(contact.profile)}\n`;
    if (contact.tags && contact.tags.length > 0) info += `Tags: ${contact.tags.join(', ')}\n`;

    if (contact.conversations && contact.conversations.length > 0) {
      info += '\nRecent Conversations:\n';
      contact.conversations.slice(0, 5).forEach(conv => { // Limit to 5 recent conversations
        info += `- ${conv.content.substring(0, 100)}... (Date: ${conv.createdAt.toLocaleDateString()})\n`;
      });
    }

    if (contact.events && contact.events.length > 0) {
      info += '\nRecent Events:\n';
      contact.events.slice(0, 5).forEach(event => { // Limit to 5 recent events
        info += `- ${event.title}: ${event.description?.substring(0, 100) || ''}... (Date: ${event.eventDate?.toLocaleDateString()})\n`;
      });
    }

    return info;
  }

  // Helper to build the AI prompt for briefing generation
  private buildBriefingPrompt(contact: Contact, relevantInfo: string): string {
    return `Generate a concise pre-meeting briefing for a meeting with ${contact.name}.
    Focus on key facts, recent interactions, and potential discussion points based on the provided information.
    The briefing should be actionable and no longer than 3-5 sentences.

    Relevant Contact Information:
    ${relevantInfo}

    Briefing:`;
  }

  async refreshBriefing(contactId: string, userId: string): Promise<string> {
    // For now, refreshBriefing just regenerates the briefing
    // In a real scenario, this might involve re-fetching data or clearing a cache
    return this.generateBriefing(contactId, userId);
  }
}
