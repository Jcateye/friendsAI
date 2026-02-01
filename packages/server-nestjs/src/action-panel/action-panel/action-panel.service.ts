import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { VectorService } from '../../ai/vector/vector.service';
import { Contact, Conversation, Event } from '../../entities';

@Injectable()
export class ActionPanelService {
  constructor(
    private readonly aiService: AiService,
    private readonly vectorService: VectorService,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async getFollowUps(userId: string): Promise<Contact[]> {
    const contacts = await this.contactRepository.find({
      where: { userId },
      relations: ['conversations', 'events'],
    });

    // Simple example: sort by last interaction date, or contacts with uncompleted tasks
    // This logic can be greatly expanded and AI-enhanced
    contacts.sort((a, b) => {
      const lastInteractionA = this.getLastInteractionDate(a);
      const lastInteractionB = this.getLastInteractionDate(b);
      return lastInteractionA.getTime() - lastInteractionB.getTime(); // Older last interaction first
    });

    return contacts;
  }

  // Helper to get the most recent interaction date
  private getLastInteractionDate(contact: Contact): Date {
    let latestDate = contact.createdAt;

    contact.conversations?.forEach(conv => {
      if (conv.createdAt > latestDate) latestDate = conv.createdAt;
    });

    contact.events?.forEach(event => {
      if (event.eventDate && event.eventDate > latestDate) latestDate = event.eventDate;
    });

    return latestDate;
  }

  async getRecommendedContacts(userId: string): Promise<{ contact: Contact; reason: string; openingLine: string }[]> {
    const userContacts = await this.contactRepository.find({
      where: { userId },
      relations: ['conversations', 'events'],
    });

    if (userContacts.length === 0) {
      return [];
    }

    // This is a simplified recommendation logic. In a real scenario, it would involve:
    // 1. Embedding user's own profile/goals
    // 2. Embedding contact profiles/interaction history
    // 3. Performing vector similarity search
    // 4. Using AI to generate reasons and opening lines

    const aiRecommendationPrompt = this.buildRecommendationPrompt(userContacts);
    const aiResponse = await this.aiService.callAgent(aiRecommendationPrompt);

    let recommendedData: { contactName: string; reason: string; openingLine: string }[] = [];
    try {
      recommendedData = JSON.parse(aiResponse);
    } catch (e) {
      console.warn('AI recommendation response was not valid JSON:', aiResponse);
      // Fallback: simple text summary or empty array
      return [];
    }

    // Map AI's recommendation to actual Contact entities
    const recommendations: { contact: Contact; reason: string; openingLine: string }[] = [];
    for (const item of recommendedData) {
      const contact = userContacts.find(c => c.name === item.contactName);
      if (contact) {
        recommendations.push({ contact, reason: item.reason, openingLine: item.openingLine });
      }
    }

    return recommendations;
  }

  private buildRecommendationPrompt(contacts: Contact[]): string {
    const contactsInfo = contacts.map(c => {
      let info = `Name: ${c.name}`;
      if (c.company) info += `, Company: ${c.company}`;
      if (c.position) info += `, Position: ${c.position}`;
      if (c.profile) info += `, Profile: ${JSON.stringify(c.profile)}`;
      if (c.tags && c.tags.length > 0) info += `, Tags: ${c.tags.join(', ')}`;
      return info;
    }).join('\n');

    return `Given the following list of contacts and their brief profiles, suggest 1-3 contacts for the user to engage with.
    For each suggestion, provide a brief reason for the recommendation and a suggested opening line for a conversation.
    The output should be a JSON array of objects, each with 'contactName', 'reason', 'openingLine'.

    Contacts:
    ${contactsInfo}

    Recommendation:`;
  }
}
