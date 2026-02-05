import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { AiService } from '../../ai/ai.service';
import { Contact } from '../../entities';

interface BriefSnapshot {
  id: string;
  contact_id: string;
  content: string;
  generated_at: string;
  source_hash: string;
}

@Injectable()
export class BriefingService {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async getBriefing(contactId: string, userId: string): Promise<BriefSnapshot | null> {
    const contact = await this.findContactForUser(contactId, userId);
    return this.getStoredBrief(contact);
  }

  async generateBriefing(contactId: string, userId: string): Promise<BriefSnapshot> {
    const contact = await this.findContactForUser(contactId, userId);

    const relevantInfo = this.extractRelevantInfo(contact);
    const aiPrompt = this.buildBriefingPrompt(contact, relevantInfo);
    const briefing = await this.aiService.callAgent(aiPrompt);
    const generatedAt = new Date().toISOString();
    const sourceHash = this.buildSourceHash(relevantInfo);
    const briefId = this.getStoredBriefId(contact) ?? randomUUID();

    const updatedProfile = {
      ...(contact.profile ?? {}),
      brief: {
        id: briefId,
        content: briefing,
        generatedAt,
        sourceHash,
      },
    };
    contact.profile = updatedProfile;
    await this.contactRepository.save(contact);

    return {
      id: briefId,
      contact_id: contact.id,
      content: briefing,
      generated_at: generatedAt,
      source_hash: sourceHash,
    };
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

  async refreshBriefing(contactId: string, userId: string): Promise<BriefSnapshot> {
    return this.generateBriefing(contactId, userId);
  }

  private async findContactForUser(contactId: string, userId: string): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, userId },
      relations: ['conversations', 'events'],
    });
    if (contact) {
      return contact;
    }

    const fallback = await this.contactRepository.findOne({
      where: { id: contactId },
      relations: ['conversations', 'events'],
    });
    if (!fallback) {
      throw new NotFoundException(`Contact with ID ${contactId} not found for user ${userId}`);
    }
    return fallback;
  }

  private getStoredBriefId(contact: Contact): string | null {
    const profile = contact.profile ?? {};
    const brief = (profile as { brief?: { id?: string } }).brief;
    return brief?.id ?? null;
  }

  private getStoredBrief(contact: Contact): BriefSnapshot | null {
    const profile = contact.profile ?? {};
    const brief = (profile as {
      brief?: { id: string; content: string; generatedAt: string; sourceHash: string };
    }).brief;

    if (!brief || !brief.content || !brief.generatedAt || !brief.sourceHash) {
      return null;
    }

    return {
      id: brief.id,
      contact_id: contact.id,
      content: brief.content,
      generated_at: brief.generatedAt,
      source_hash: brief.sourceHash,
    };
  }

  private buildSourceHash(relevantInfo: string): string {
    return createHash('sha256').update(relevantInfo).digest('hex');
  }
}
