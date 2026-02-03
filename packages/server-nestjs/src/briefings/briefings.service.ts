import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact, Conversation, Event } from '../entities';
import { AiService } from '../ai/ai.service';

@Injectable()
export class BriefingsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private aiService: AiService,
  ) {}

  async generateBriefing(userId: string, contactId: string): Promise<any> {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, user: { id: userId } },
      relations: ['briefing'],
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    const conversations = await this.conversationRepository.find({
      where: { contact: { id: contactId } },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const events = await this.eventRepository.find({
      where: { contact: { id: contactId } },
      order: { eventDate: 'DESC' },
      take: 5,
    });

    const context = {
      contactName: contact.name,
      contactCompany: contact.company,
      contactPosition: contact.position,
      recentConversations: conversations.map(c => c.content),
      recentEvents: events.map(e => ({
        title: e.title,
        description: e.description,
        date: e.eventDate,
      })),
      pendingTodos: contact.briefing?.pendingTodos || [],
      traits: contact.tags || [],
    };

    const prompt = `请为以下联系人生成会前简报：

联系人信息：
- 姓名：${context.contactName}
- 公司：${context.contactCompany || '未知'}
- 职位：${context.contactPosition || '未知'}

最近沟通记录：
${context.recentConversations.map((c, i) => `${i + 1}. ${c}`).join('\n')}

最近事件：
${context.recentEvents.map((e, i) => `${i + 1}. ${e.title} (${e.date}): ${e.description}`).join('\n')}

待办事项：
${context.pendingTodos.length > 0 ? context.pendingTodos.map((t, i) => `${i + 1}. ${t}`).join('\n') : '无'}

联系人特征：
${context.traits.length > 0 ? context.traits.join(', ') : '暂无'}

请生成以下内容的简报：
1. 上次沟通摘要（关键要点）
2. 待办事项提醒
3. 联系人特征总结
4. 建议话题（3-5个）

以JSON格式返回：{"lastSummary": "...", "pendingTodos": [...], "traits": [...], "suggestedTopics": [...]}`;

    const aiResponse = await this.aiService.callAgent(prompt);
    
    try {
      const briefing = JSON.parse(aiResponse);
      return {
        contactId: contact.id,
        contactName: contact.name,
        ...briefing,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        contactId: contact.id,
        contactName: contact.name,
        lastSummary: aiResponse,
        pendingTodos: contact.briefing?.pendingTodos || [],
        traits: contact.tags || [],
        suggestedTopics: [],
        generatedAt: new Date().toISOString(),
      };
    }
  }
}
