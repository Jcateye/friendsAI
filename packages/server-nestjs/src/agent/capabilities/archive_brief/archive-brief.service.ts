import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Conversation } from '../../../entities/conversation.entity';
import { Contact } from '../../../entities/contact.entity';
import { AgentRuntimeExecutor } from '../../runtime/agent-runtime-executor.service';
import { SnapshotService } from '../../snapshots/snapshot.service';
import * as crypto from 'crypto';

export type ArchiveBriefOperation = 'archive_extract' | 'brief_generate';

export interface ArchiveExtractInput {
  userId: string;
  conversationId: string;
}

export interface BriefGenerateInput {
  userId: string;
  contactId: string;
}

export interface ArchiveExtractOutput {
  operation: 'archive_extract';
  id: string;
  status: string;
  summary: string;
  payload: Record<string, unknown>;
  sourceHash: string;
  generatedAt: number;
}

export interface BriefGenerateOutput {
  operation: 'brief_generate';
  id: string;
  contact_id: string;
  content: string;
  generated_at: string;
  source_hash: string;
}

export type ArchiveBriefOutput = ArchiveExtractOutput | BriefGenerateOutput;

/**
 * Archive Brief Service
 * 支持归档提取和简报生成两个操作
 */
@Injectable()
export class ArchiveBriefService {
  private readonly logger = new Logger(ArchiveBriefService.name);
  private readonly agentId = 'archive_brief';
  private readonly ttlSeconds = 86400; // 24 hours

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    private readonly runtimeExecutor: AgentRuntimeExecutor,
    private readonly snapshotService: SnapshotService,
  ) {}

  /**
   * 执行归档提取
   */
  async extractArchive(
    input: ArchiveExtractInput,
    options: { forceRefresh?: boolean } = {}
  ): Promise<ArchiveExtractOutput> {
    const { userId, conversationId } = input;

    // 加载对话
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
      relations: ['messages'],
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation not found: ${conversationId}`);
    }

    // 构建输入数据
    const inputData = {
      operation: 'archive_extract',
      conversationId,
      content: conversation.content,
      messages: conversation.messages?.map((msg) => ({
        role: msg.role,
        content: msg.content || '',
      })) || [],
    };

    // 计算 sourceHash
    const sourceHash = this.computeSourceHash('archive_extract', inputData);

    // 检查缓存
    if (!options.forceRefresh) {
      const cached = await this.snapshotService.findSnapshot(
        {
          agentId: this.agentId,
          operation: 'archive_extract',
          userId,
          scopeType: 'conversation',
          scopeId: conversationId,
          sourceHash,
          promptVersion: '1.0.0',
        },
        { forceRefresh: false }
      );

      if (cached.cached && cached.snapshot) {
        this.logger.debug(`Using cached archive extract for conversation ${conversationId}`);
        return {
          ...(cached.snapshot.output as ArchiveExtractOutput),
          sourceHash,
          generatedAt: cached.snapshot.createdAt.getTime(),
        };
      }
    }

    // 使用 AgentRuntimeExecutor 执行（跳过服务路由以避免循环依赖）
    const executionResult = await this.runtimeExecutor.execute(
      this.agentId,
      'archive_extract',
      inputData,
      {
        useCache: false, // 我们在这里手动管理缓存
        forceRefresh: options.forceRefresh,
        userId,
        conversationId,
        skipServiceRouting: true, // 跳过服务路由，直接使用通用流程
      },
    );

    // 转换输出格式
    const output = this.formatArchiveExtractOutput(executionResult.data, conversationId, sourceHash);

    // 保存快照
    await this.snapshotService.createSnapshot({
      agentId: this.agentId,
      operation: 'archive_extract',
      scopeType: 'conversation',
      scopeId: conversationId,
      userId,
      sourceHash,
      promptVersion: '1.0.0',
      input: inputData,
      output,
      ttlSeconds: this.ttlSeconds,
    });

    return output;
  }

  /**
   * 生成简报
   */
  async generateBrief(
    input: BriefGenerateInput,
    options: { forceRefresh?: boolean } = {}
  ): Promise<BriefGenerateOutput> {
    const { userId, contactId } = input;

    // 加载联系人
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, userId },
    });

    if (!contact) {
      throw new NotFoundException(`Contact not found: ${contactId}`);
    }

    // 加载最近交互记录（最近 30 天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentConversations = await this.conversationRepository.find({
      where: {
        contactId,
        userId,
        createdAt: MoreThanOrEqual(thirtyDaysAgo),
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // 构建输入数据
    const inputData = {
      operation: 'brief_generate',
      contactId,
      name: contact.name,
      company: contact.company,
      position: contact.position,
      tags: contact.tags,
      recentInteractions: recentConversations.map((conv) => ({
        date: conv.createdAt.toISOString(),
        type: 'conversation',
        summary: conv.summary || conv.content || '无内容',
      })),
    };

    // 计算 sourceHash
    const sourceHash = this.computeSourceHash('brief_generate', inputData);

    // 检查缓存
    if (!options.forceRefresh) {
      const cached = await this.snapshotService.findSnapshot(
        {
          agentId: this.agentId,
          operation: 'brief_generate',
          userId,
          scopeType: 'contact',
          scopeId: contactId,
          sourceHash,
          promptVersion: '1.0.0',
        },
        { forceRefresh: false }
      );

      if (cached.cached && cached.snapshot) {
        this.logger.debug(`Using cached brief for contact ${contactId}`);
        return cached.snapshot.output as BriefGenerateOutput;
      }
    }

    // 使用 AgentRuntimeExecutor 执行（跳过服务路由以避免循环依赖）
    const executionResult = await this.runtimeExecutor.execute(
      this.agentId,
      'brief_generate',
      inputData,
      {
        useCache: false, // 我们在这里手动管理缓存
        forceRefresh: options.forceRefresh,
        userId,
        skipServiceRouting: true, // 跳过服务路由，直接使用通用流程
      },
    );

    // 转换输出格式
    const output = this.formatBriefGenerateOutput(executionResult.data, contactId, sourceHash);

    // 保存快照
    await this.snapshotService.createSnapshot({
      agentId: this.agentId,
      operation: 'brief_generate',
      scopeType: 'contact',
      scopeId: contactId,
      userId,
      sourceHash,
      promptVersion: '1.0.0',
      input: inputData,
      output,
      ttlSeconds: this.ttlSeconds,
    });

    return output;
  }

  /**
   * 格式化归档提取输出
   */
  private formatArchiveExtractOutput(
    data: Record<string, unknown>,
    conversationId: string,
    sourceHash: string
  ): ArchiveExtractOutput {
    return {
      operation: 'archive_extract',
      id: (data.id as string) || conversationId,
      status: (data.status as string) || 'completed',
      summary: (data.summary as string) || '',
      payload: (data.payload as Record<string, unknown>) || {},
      sourceHash,
      generatedAt: Date.now(),
    };
  }

  /**
   * 格式化简报生成输出
   */
  private formatBriefGenerateOutput(
    data: Record<string, unknown>,
    contactId: string,
    sourceHash: string
  ): BriefGenerateOutput {
    return {
      operation: 'brief_generate',
      id: (data.id as string) || crypto.randomUUID(),
      contact_id: (data.contact_id as string) || contactId,
      content: (data.content as string) || '',
      generated_at: (data.generated_at as string) || new Date().toISOString(),
      source_hash: sourceHash,
    };
  }

  /**
   * 计算 sourceHash
   */
  private computeSourceHash(
    operation: ArchiveBriefOperation,
    input: Record<string, unknown>
  ): string {
    const data = JSON.stringify({
      agentId: this.agentId,
      operation,
      ...input,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}


