import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { Contact } from '../../entities';
import { Briefing } from '../../entities/briefing.entity';

// Define the expected structure of the AI-generated briefing
interface ContactBriefingData {
  lastSummary: string;
  pendingTodos: string[];
  traits: string[];
  suggestion: string;
}

@Injectable()
export class BriefingService {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Briefing)
    private briefingRepository: Repository<Briefing>,
  ) {}

  async generateBriefing(contactId: string, userId: string): Promise<string> {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, userId },
      relations: ['conversations', 'events', 'briefing'],
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found for user ${userId}`);
    }

    const relevantInfo = this.extractRelevantInfo(contact);
    const aiPrompt = this.buildBriefingPrompt(contact, relevantInfo);
    let briefingResponse: string;
    try {
      briefingResponse = await this.aiService.callAgent(aiPrompt);
    } catch (error) {
      console.error('AI call failed for briefing generation:', error);
      throw new Error('Failed to generate briefing from AI.');
    }

    let briefingData: ContactBriefingData;
    try {
      briefingData = JSON.parse(briefingResponse);
    } catch (e) {
      console.warn('AI briefing response was not valid JSON:', briefingResponse);
      briefingData = {
        lastSummary: 'AI简报生成失败，请稍后重试。',
        pendingTodos: [],
        traits: [],
        suggestion: '请检查AI服务配置或重试。',
      };
    }

    // Create or update the briefing entity
    let briefing = contact.briefing;
    if (!briefing) {
      briefing = this.briefingRepository.create({
        contact,
        contactId: contact.id,
      });
    }
    
    briefing.lastSummary = briefingData.lastSummary;
    briefing.pendingTodos = briefingData.pendingTodos;
    briefing.traits = briefingData.traits;
    briefing.suggestion = briefingData.suggestion;
    
    await this.briefingRepository.save(briefing);

    // Return the briefing as JSON string
    return JSON.stringify(briefingData);
  }

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
      contact.conversations.slice(0, 5).forEach(conv => {
        info += `- ${conv.content.substring(0, 100)}... (Date: ${conv.createdAt.toLocaleDateString()})\n`;
      });
    }

    if (contact.events && contact.events.length > 0) {
      info += '\nRecent Events:\n';
      contact.events.slice(0, 5).forEach(event => {
        info += `- ${event.title}: ${event.description?.substring(0, 100) || ''}... (Date: ${event.eventDate?.toLocaleDateString()})\n`;
      });
    }

    return info;
  }

  private buildBriefingPrompt(contact: Contact, relevantInfo: string): string {
    return `Generate a concise pre-meeting briefing for a meeting with ${contact.name}.
    Focus on key facts, recent interactions, and potential discussion points based on the provided information.
    The briefing should be actionable and no longer than 3-5 sentences.
    Return the output as a JSON object with the following structure:
    {
      "lastSummary": "string - a brief summary of the contact's current status or last interaction",
      "pendingTodos": ["string - list of pending tasks or follow-ups related to the contact"],
      "traits": ["string - key personality traits or important facts about the contact"],
      "suggestion": "string - a suggestion for discussion points or an opening line for the meeting"
    }
    Ensure the JSON is valid and only contains the briefing object, no extra text.

    Relevant Contact Information:
    ${relevantInfo}

    Briefing:`;
  }

  async refreshBriefing(contactId: string, userId: string): Promise<string> {
    return this.generateBriefing(contactId, userId);
  }
}
