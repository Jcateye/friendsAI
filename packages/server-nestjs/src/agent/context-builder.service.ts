import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  AgentContextLayers,
  AgentGlobalContext,
  AgentSessionContext,
  AgentRequestContext,
  Contact as ClientContact,
  AgentMessage,
} from '../../../client/src/types';
import { User, Contact, Conversation, ConnectorToken } from '../entities';
import { VectorService } from '../ai/vector/vector.service';
import {
  BuildContextParams,
  GlobalContextParams,
  SessionContextParams,
  RequestContextParams,
  VectorSearchResult,
} from './context-builder.types';

/**
 * ContextBuilder Service
 *
 * 实现三层上下文构建器：
 * 1. Global Context: 用户、联系人、连接器配置
 * 2. Session Context: 对话历史、会话状态
 * 3. Request Context: 单次请求元数据
 */
@Injectable()
export class ContextBuilderService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConnectorToken)
    private readonly connectorTokenRepository: Repository<ConnectorToken>,
    private readonly vectorService: VectorService,
  ) {}

  /**
   * 构建完整的三层上下文
   */
  async buildContext(params: BuildContextParams): Promise<AgentContextLayers> {
    const { userId, sessionId, requestId, conversationId, options = {}, requestContext = {} } = params;

    const [global, session, request] = await Promise.all([
      this.buildGlobalContext({
        userId,
        includeContacts: options.includeContacts,
        includeConnectors: options.includeConnectors,
        contactsLimit: options.contactsLimit,
      }),
      this.buildSessionContext({
        sessionId,
        conversationId,
        userId,
        includeHistory: options.includeHistory,
        historyLimit: options.historyLimit,
        useVectorSearch: options.useVectorSearch,
        vectorSearchQuery: options.vectorSearchQuery,
        vectorSearchLimit: options.vectorSearchLimit,
      }),
      this.buildRequestContext({
        requestId,
        traceId: requestContext.traceId,
        input: requestContext.input,
        channel: requestContext.channel,
        metadata: requestContext.metadata,
      }),
    ]);

    return {
      global,
      session,
      request,
    };
  }

  /**
   * 构建全局上下文（用户级别）
   */
  async buildGlobalContext(params: GlobalContextParams): Promise<AgentGlobalContext> {
    const { userId, includeContacts = true, includeConnectors = true, contactsLimit = 50 } = params;

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const context: AgentGlobalContext = {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
      },
    };

    // 加载联系人信息
    if (includeContacts) {
      const contacts = await this.contactRepository.find({
        where: { userId },
        take: contactsLimit,
        order: { updatedAt: 'DESC' },
      });

      context.contacts = contacts.map((contact) => this.mapContactToClient(contact));
    }

    // 加载连接器信息
    if (includeConnectors) {
      const connectorTokens = await this.connectorTokenRepository.find({
        where: { userId },
      });

      context.connectors = connectorTokens.map((token) => ({
        type: token.connectorType,
        id: token.id,
        expiresAt: token.expiresAt?.toISOString(),
        metadata: token.metadata,
      }));
    }

    return context;
  }

  /**
   * 构建会话上下文（会话级别）
   */
  async buildSessionContext(params: SessionContextParams): Promise<AgentSessionContext> {
    const {
      sessionId,
      conversationId,
      userId,
      includeHistory = true,
      historyLimit = 20,
      useVectorSearch = false,
      vectorSearchQuery,
      vectorSearchLimit = 5,
    } = params;

    const context: AgentSessionContext = {
      sessionId,
      conversationId,
    };

    // 加载对话历史
    if (includeHistory && conversationId) {
      const conversations = await this.conversationRepository.find({
        where: { id: conversationId, userId },
        take: historyLimit,
        order: { createdAt: 'DESC' },
      });

      context.history = conversations.map((conv) => this.mapConversationToMessage(conv));
    }

    // 向量搜索相关上下文
    if (useVectorSearch && vectorSearchQuery) {
      const vectorResults = await this.performVectorSearch(
        userId,
        vectorSearchQuery,
        vectorSearchLimit,
      );

      // 将向量搜索结果添加到引用中
      context.references = this.buildReferencesFromVectorSearch(vectorResults);
    }

    return context;
  }

  /**
   * 构建请求上下文（请求级别）
   */
  async buildRequestContext(params: RequestContextParams): Promise<AgentRequestContext> {
    const { requestId, traceId, input, channel, metadata } = params;

    return {
      requestId,
      traceId,
      input,
      channel,
      metadata,
    };
  }

  /**
   * 执行向量搜索
   */
  private async performVectorSearch(
    userId: string,
    query: string,
    limit: number,
  ): Promise<VectorSearchResult> {
    // 生成查询向量
    const queryEmbedding = await this.vectorService['aiService'].generateEmbedding(query);

    // 搜索相关对话
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .where('conversation.userId = :userId', { userId })
      .andWhere('conversation.embedding IS NOT NULL')
      .orderBy(`conversation.embedding <=> :embedding`, 'ASC')
      .setParameter('embedding', JSON.stringify(queryEmbedding))
      .take(limit)
      .getMany();

    return {
      conversations: conversations.map((conv) => ({
        id: conv.id,
        content: conv.content,
        similarity: 0, // PostgreSQL pgvector 会计算实际相似度
        createdAt: conv.createdAt,
        contactId: conv.contactId ?? undefined,
      })),
      events: [], // 事件搜索可以后续添加
    };
  }

  /**
   * 从向量搜索结果构建引用
   */
  private buildReferencesFromVectorSearch(results: VectorSearchResult): any[] {
    const references: any[] = [];

    for (const conv of results.conversations) {
      references.push({
        kind: 'conversation',
        id: conv.id,
        source: 'system',
        meta: {
          similarity: conv.similarity,
          snippet: conv.content.substring(0, 200),
        },
      });
    }

    return references;
  }

  /**
   * 映射 Contact 实体到客户端类型
   */
  private mapContactToClient(contact: Contact): ClientContact {
    return {
      id: contact.id,
      name: contact.name,
      initial: contact.name.charAt(0).toUpperCase(),
      avatarColor: this.generateAvatarColor(contact.id),
      company: contact.company ?? undefined,
      role: contact.position ?? undefined,
      tags: contact.tags ?? undefined,
    };
  }

  /**
   * 映射 Conversation 到 AgentMessage
   */
  private mapConversationToMessage(conversation: Conversation): AgentMessage {
    return {
      id: conversation.id,
      role: 'user', // 默认为用户消息
      content: conversation.content,
      createdAt: conversation.createdAt.toISOString(),
      metadata: conversation.parsedData ?? undefined,
    };
  }

  /**
   * 生成头像颜色（基于 ID 的哈希）
   */
  private generateAvatarColor(id: string): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
    ];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
}
