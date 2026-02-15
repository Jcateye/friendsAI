import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../../../entities/contact.entity';
import { Conversation } from '../../../entities/conversation.entity';
import { Event } from '../../../entities/event.entity';
import { ContactFact } from '../../../entities/contact-fact.entity';
import { ContactTodo } from '../../../entities/contact-todo.entity';
import {
  ContactInsightContext,
  InsightDepth,
} from './contact-insight.types';

/**
 * Contact Insight 上下文构建服务
 * 负责从数据库加载联系人相关数据并构建模板渲染上下文
 */
@Injectable()
export class ContactInsightContextBuilder {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(ContactFact)
    private factRepository: Repository<ContactFact>,
    @InjectRepository(ContactTodo)
    private todoRepository: Repository<ContactTodo>
  ) {}

  /**
   * 构建 Contact Insight 上下文
   * @param userId 用户 ID
   * @param contactId 联系人 ID
   * @param depth 分析深度
   * @returns 上下文对象
   */
  async buildContext(
    userId: string,
    contactId: string,
    depth: InsightDepth = 'standard'
  ): Promise<ContactInsightContext> {
    // 1. 加载联系人基本信息
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, userId },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    // 2. 确定加载数量
    const conversationLimit = depth === 'brief' ? 5 : depth === 'standard' ? 10 : 20;
    const archiveLimit = depth === 'brief' ? 10 : depth === 'standard' ? 20 : 50;

    // 3. 加载最近交互（conversations）
    const recentConversations = await this.conversationRepository.find({
      where: { contactId, userId },
      order: { createdAt: 'DESC' },
      take: conversationLimit,
    });

    // 4. 加载归档数据
    const [events, facts, todos] = await Promise.all([
      this.eventRepository.find({
        where: { contactId },
        order: { createdAt: 'DESC' },
        take: archiveLimit,
      }),
      this.factRepository.find({
        where: { contactId },
        order: { createdAt: 'DESC' },
        take: archiveLimit,
      }),
      this.todoRepository.find({
        where: { contactId },
        order: { createdAt: 'DESC' },
        take: archiveLimit,
      }),
    ]);

    // 5. 计算最后交互时间
    const lastInteractionAt =
      recentConversations.length > 0
        ? recentConversations[0].createdAt
        : null;

    // 6. 构建上下文对象
    return {
      contactId,
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        company: contact.company,
        position: contact.position,
        tags: contact.tags,
        note: contact.note,
        lastInteractionAt,
      },
      recentInteractions: recentConversations.map((c, index) => ({
        index: index + 1,
        id: c.id,
        summary: c.summary,
        createdAt: c.createdAt,
      })),
      archivedData: {
        events: events.map((e, index) => ({
          index: index + 1,
          id: e.id,
          type: 'event',
          title: e.title,
          description: e.description,
          eventDate: e.eventDate,
        })),
        facts: facts.map((f) => ({
          id: f.id,
          content: f.content,
        })),
        todos: todos.map((t) => ({
          id: t.id,
          content: t.content,
          status: t.status,
        })),
      },
      depth,
    };
  }
}



