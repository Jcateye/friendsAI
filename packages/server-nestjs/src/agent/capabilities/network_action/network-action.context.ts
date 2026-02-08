import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Contact, Conversation } from '../../../entities';
import type { NetworkActionTemplateContext } from './network-action.types';
import * as crypto from 'crypto';

/**
 * Network Action Agent 上下文构建器
 * 负责聚合联系人数据和交互记录，构建模板上下文
 */
@Injectable()
export class NetworkActionContextBuilder {
  private readonly logger = new Logger(NetworkActionContextBuilder.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  /**
   * 构建模板上下文
   */
  async build(userId: string, limit?: number): Promise<NetworkActionTemplateContext> {
    try {
      // 1. 获取用户所有联系人
      const contacts = await this.contactRepository.find({
        where: { userId },
        relations: ['conversations', 'events'],
        order: { updatedAt: 'DESC' },
      });

      // 2. 获取最近交互记录（最近 30 天）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentConversations = await this.conversationRepository.find({
        where: {
          userId,
          createdAt: MoreThanOrEqual(thirtyDaysAgo),
        },
        order: { createdAt: 'DESC' },
        take: limit || 50,
      });

      // 3. 格式化联系人数据
      const formattedContacts = contacts.map((contact) => {
        const lastInteractionAt = this.getLastInteractionDate(contact);
        return {
          id: contact.id,
          name: contact.name,
          company: contact.company || undefined,
          position: contact.position || undefined,
          lastInteractionAt: lastInteractionAt
            ? lastInteractionAt.toISOString()
            : '从未交互',
        };
      });

      // 4. 格式化最近交互记录
      const formattedInteractions = recentConversations.map((conv) => ({
        date: conv.createdAt.toISOString(),
        summary: conv.content || conv.title || '无内容',
      }));

      return {
        contacts: formattedContacts,
        recentInteractions: formattedInteractions,
        metadata: {
          totalContacts: contacts.length,
          totalInteractions: recentConversations.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to build context for userId=${userId}: ${error}`);
      throw error;
    }
  }

  /**
   * 计算 sourceHash（用于缓存）
   * 基于 userId、contactsHash 和 interactionsHash
   */
  computeSourceHash(context: NetworkActionTemplateContext, userId: string): string {
    // 计算 contacts hash（仅包含影响输出的关键字段）
    const contactsData = context.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      lastInteractionAt: c.lastInteractionAt,
    }));
    const contactsHash = this.computeHash(JSON.stringify(contactsData));

    // 计算 interactions hash
    const interactionsHash = this.computeHash(JSON.stringify(context.recentInteractions));

    // 组合 sourceHash
    const sourceData = {
      userId,
      contactsHash,
      interactionsHash,
    };
    return this.computeHash(JSON.stringify(sourceData));
  }

  /**
   * 获取联系人的最后交互日期
   */
  private getLastInteractionDate(contact: Contact): Date | null {
    let latestDate: Date | null = null;

    // 检查 conversations
    if (contact.conversations && contact.conversations.length > 0) {
      for (const conv of contact.conversations) {
        if (conv.createdAt && (!latestDate || conv.createdAt > latestDate)) {
          latestDate = conv.createdAt;
        }
      }
    }

    // 检查 events
    if (contact.events && contact.events.length > 0) {
      for (const event of contact.events) {
        const eventDate = event.eventDate || event.createdAt;
        if (eventDate && (!latestDate || eventDate > latestDate)) {
          latestDate = eventDate;
        }
      }
    }

    // 如果没有交互，使用联系人的创建时间
    if (!latestDate) {
      latestDate = contact.createdAt;
    }

    return latestDate;
  }

  /**
   * 计算数据的 SHA-256 hash
   */
  private computeHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

