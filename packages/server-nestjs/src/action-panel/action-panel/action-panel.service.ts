import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Contact } from '../../entities/contact.entity';
import { User } from '../../entities/user.entity';
import { Briefing } from '../../entities/briefing.entity';
import { Conversation } from '../../entities/conversation.entity';
import { Event } from '../../entities/event.entity';
import { AiService } from '../../ai/ai.service';


@Injectable()
export class ActionPanelService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Briefing)
    private briefingRepository: Repository<Briefing>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private aiService: AiService,
  ) {}

  async getRecommendedContacts(userId: string): Promise<SuggestionItem[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const contacts = await this.contactRepository.find({
      where: { userId },
      relations: ['briefing', 'conversations'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const promptContent = JSON.stringify(this.buildRecommendationPrompt(user, contacts));

    const aiResponse = await this.aiService.callAgent(promptContent, { userId });

    if (!aiResponse) {
        throw new Error('AI did not return a valid response for contact recommendations.');
    }

    let recommendations: SuggestionItem[];
    try {
      recommendations = JSON.parse(aiResponse);
      // Ensure the parsed content is an array of SuggestionItem
      if (!Array.isArray(recommendations) || !recommendations.every(item => 'contactId' in item && 'reason' in item)) {
        throw new Error('AI returned malformed recommendation data.');
      }
    } catch (e) {
      console.error('Failed to parse AI recommendation response:', e);
      throw new Error('AI returned malformed recommendation data.');
    }

    const validRecommendations = recommendations.filter(rec =>
        contacts.some(contact => contact.id === rec.contactId)
    );

    return validRecommendations;
  }

  async getFollowUps(userId: string): Promise<FollowUpItem[]> {
    const contactsWithPendingTodos = await this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.briefing', 'briefing')
      .where('contact.userId = :userId', { userId })
      .andWhere('briefing.pendingTodos IS NOT NULL AND array_length(briefing.pendingTodos, 1) > 0')
      .getMany();

    return contactsWithPendingTodos.map(contact => ({
      contactId: contact.id,
      contactName: contact.name,
      pendingTodos: contact.briefing.pendingTodos || [],
    }));
  }

  async getWeeklyStats(userId: string): Promise<WeeklyStats> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const newContacts = await this.contactRepository.count({
      where: {
        userId,
        createdAt: MoreThanOrEqual(oneWeekAgo),
      },
    });

    const newConversations = await this.conversationRepository.count({
      where: {
        userId,
        createdAt: MoreThanOrEqual(oneWeekAgo),
      },
    });

    // Event doesn't have userId directly, need to count through contacts
    const newEvents = await this.eventRepository
      .createQueryBuilder('event')
      .innerJoin('event.contact', 'contact')
      .where('contact.userId = :userId', { userId })
      .andWhere('event.createdAt >= :oneWeekAgo', { oneWeekAgo })
      .getCount();

    return {
      conversationsCount: newConversations,
      newContactsCount: newContacts,
      eventsCount: newEvents,
    };
  }

  private buildRecommendationPrompt(user: User, contacts: Contact[]): object {
    // This prompt needs to guide the AI to return structured JSON for contact recommendations.
    // Example fields: contactId, reason, suggestedAction, openingLine
    const contactInfo = contacts.map(c => ({
      id: c.id,
      name: c.name,
      company: c.company,
      position: c.position,
      lastInteraction: c.updatedAt,
      pendingTodos: c.briefing?.pendingTodos,
      traits: c.briefing?.traits,
    }));

    const prompt = {
        role: 'system',
        content: `You are an AI assistant designed to recommend contacts for a user to reach out to.
        Based on the user's information and their recent contacts, suggest up to 3 contacts.
        For each suggestion, provide the contactId, a brief reason for the recommendation, a suggested action, and an openingLine.
        The response MUST be a valid JSON array of objects, each matching the SuggestionItem interface.

        User Name: ${user.name}
        User Email: ${user.email}

        Recent Contacts: ${JSON.stringify(contactInfo)}

        Your response MUST be a valid JSON array matching the SuggestionItem[] interface.
        Example JSON:
        [
          {
            "contactId": "uuid-of-contact",
            "reason": "Follow up on recent proposal discussion.",
            "suggestedAction": "Send follow-up email.",
            "openingLine": "Hi [Contact Name], following up on our recent discussion about the Q2 proposal."
          }
        ]
        `,
    };
    return prompt;
  }

  // TODO: Add buildFollowUpPrompt if needed for AI-driven follow-ups
}

// Types
export interface SuggestionItem {
  contactId: string;
  reason: string;
  suggestedAction: string;
  openingLine: string;
}

export interface FollowUpItem {
  contactId: string;
  contactName: string;
  pendingTodos: string[];
}

export interface WeeklyStats {
  conversationsCount: number;
  newContactsCount: number;
  eventsCount: number;
}
