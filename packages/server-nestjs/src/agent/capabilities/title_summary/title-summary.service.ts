import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../../../entities/conversation.entity';
import { AgentRuntimeExecutor } from '../../runtime/agent-runtime-executor.service';
import { SnapshotService } from '../../snapshots/snapshot.service';
import * as crypto from 'crypto';
import type { LlmRequestConfig } from '../../../ai/providers/llm-types';

export interface TitleSummaryInput {
  userId: string;
  conversationId: string;
}

export interface TitleSummaryOutput {
  conversationId: string;
  title: string;
  summary: string;
  sourceHash: string;
  generatedAt: number;
}

/**
 * Title Summary Service
 * 生成对话的标题和摘要
 */
@Injectable()
export class TitleSummaryService {
  private readonly logger = new Logger(TitleSummaryService.name);
  private readonly agentId = 'title_summary';
  private readonly ttlSeconds = 86400; // 24 hours

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @Inject(forwardRef(() => AgentRuntimeExecutor))
    private readonly runtimeExecutor: AgentRuntimeExecutor,
    private readonly snapshotService: SnapshotService,
  ) {}

  /**
   * 生成标题和摘要
   */
  async generate(
    input: TitleSummaryInput,
    options: { forceRefresh?: boolean; llm?: LlmRequestConfig } = {}
  ): Promise<TitleSummaryOutput> {
    const { userId, conversationId } = input;

    // 加载对话
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
      relations: ['messages'],
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation not found: ${conversationId}`);
    }

    // 构建输入数据用于计算 sourceHash
    const inputData = {
      conversationId,
      content: conversation.content,
      messages: conversation.messages?.map((msg) => ({
        role: msg.role,
        content: msg.content || '',
      })) || [],
    };

    // 计算 sourceHash
    const sourceHash = this.computeSourceHash(inputData);

    // 检查缓存
    if (!options.forceRefresh) {
      const cached = await this.snapshotService.findSnapshot(
        {
          agentId: this.agentId,
          operation: null,
          userId,
          scopeType: 'conversation',
          scopeId: conversationId,
          sourceHash,
          promptVersion: '1.0.0',
        },
        { forceRefresh: false }
      );

      if (cached.cached && cached.snapshot) {
        this.logger.debug(`Using cached title/summary for conversation ${conversationId}`);
        return {
          conversationId,
          title: cached.snapshot.output.title as string,
          summary: cached.snapshot.output.summary as string,
          sourceHash,
          generatedAt: cached.snapshot.createdAt.getTime(),
        };
      }
    }

    // 使用 AgentRuntimeExecutor 执行（跳过服务路由以避免循环依赖）
    const executionResult = await this.runtimeExecutor.execute(
      this.agentId,
      null,
      inputData,
      {
        useCache: false, // 我们在这里手动管理缓存
        forceRefresh: options.forceRefresh,
        userId,
        conversationId,
        llm: options.llm,
        skipServiceRouting: true, // 跳过服务路由，直接使用通用流程
      },
    );

    // 格式化输出
    const output = executionResult.data as { title: string; summary: string };

    // 保存快照
    await this.snapshotService.createSnapshot({
      agentId: this.agentId,
      operation: null,
      scopeType: 'conversation',
      scopeId: conversationId,
      userId,
      sourceHash,
      promptVersion: '1.0.0',
      input: inputData,
      output,
      ttlSeconds: this.ttlSeconds,
    });

    // 回写到 conversation 表
    await this.conversationRepository.update(conversationId, {
      title: output.title,
      summary: output.summary,
    });

    return {
      conversationId,
      title: output.title,
      summary: output.summary,
      sourceHash,
      generatedAt: Date.now(),
    };
  }

  /**
   * 计算 sourceHash
   */
  private computeSourceHash(input: {
    conversationId: string;
    content: string;
    messages: Array<{ role: string; content: string }>;
  }): string {
    const data = JSON.stringify({
      agentId: this.agentId,
      conversationId: input.conversationId,
      content: input.content,
      messages: input.messages,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
