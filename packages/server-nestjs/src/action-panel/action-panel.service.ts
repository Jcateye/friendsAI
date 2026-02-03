import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Contact, Event, Conversation } from '../entities';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ActionPanelService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    private aiService: AiService,
  ) {}

  async generateDashboard(userId: string): Promise<any> {
    const [followUps, suggestions] = await Promise.all([
      this.getFollowUps(userId),
      this.getSuggestions(userId),
    ]);

    return {
      followUps,
      suggestions,
      generatedAt: new Date().toISOString(),
    };
  }

  async getFollowUps(userId: string): Promise<any[]> {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const contacts = await this.contactRepository.find({
      where: { user: { id: userId } },
      relations: ['briefing', 'events', 'conversations'],
    });

    const followUps = contacts
      .filter(contact => {
        const hasPendingTodos = contact.briefing?.pendingTodos?.length > 0;
        const lastContactTime = contact.conversations?.[0]?.createdAt || contact.events?.[0]?.eventDate;
        const isSilent = lastContactTime && new Date(lastContactTime) < fourteenDaysAgo;
        return hasPendingTodos || isSilent;
      })
      .map(contact => {
        const pendingTodos = contact.briefing?.pendingTodos || [];
        const lastConversation = contact.conversations?.[0];
        const reason = pendingTodos.length > 0
          ? `有 ${pendingTodos.length} 个待办事项: ${pendingTodos[0]}`
          : '已沉默超过14天，建议跟进';

        return {
          id: `follow-up-${contact.id}`,
          contact: {
            id: contact.id,
            name: contact.name,
            initial: contact.name?.charAt(0) || '?',
            avatarColor: '#7C9070',
          },
          reason,
          urgent: pendingTodos.length > 0,
          pendingTodos,
        };
      });

    return followUps;
  }

  async getSuggestions(userId: string): Promise<any[]> {
    const contacts = await this.contactRepository.find({
      where: { user: { id: userId } },
      relations: ['conversations', 'events'],
      take: 10,
    });

    const suggestions = await Promise.all(
      contacts.map(async contact => {
        const context = {
          contactName: contact.name,
          recentConversations: contact.conversations?.slice(0, 3).map(c => c.content) || [],
          recentEvents: contact.events?.slice(0, 3).map(e => e.title) || [],
        };

        const prompt = `基于以下信息，建议是否应该联系这位联系人，并给出理由和开场白：

联系人：${context.contactName}

最近沟通：
${context.recentConversations.map((c, i) => `${i + 1}. ${c}`).join('\n')}

最近事件：
${context.recentEvents.map((e, i) => `${i + 1}. ${e}`).join('\n')}

请返回JSON格式：{"shouldContact": true/false, "reason": "...", "openingLine": "..."}`;

        try {
          const aiResponse = await this.aiService.callAgent(prompt);
          const result = JSON.parse(aiResponse);
          
          if (result.shouldContact) {
            return {
              id: `suggestion-${contact.id}`,
              contact: {
                id: contact.id,
                name: contact.name,
                initial: contact.name?.charAt(0) || '?',
                avatarColor: '#7C9070',
              },
              reason: result.reason,
              openingSuggestion: result.openingLine,
              urgent: false,
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      }),
    );

    return suggestions.filter(s => s !== null);
  }
}
