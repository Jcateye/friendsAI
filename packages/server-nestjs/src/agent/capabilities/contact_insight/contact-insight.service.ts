import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { AgentRuntimeExecutor } from '../../runtime/agent-runtime-executor.service';
import { SnapshotService } from '../../snapshots/snapshot.service';
import { ContactInsightContextBuilder } from './contact-insight-context-builder.service';
import * as crypto from 'crypto';

export interface ContactInsightInput {
  userId: string;
  contactId: string;
  depth?: 'brief' | 'standard' | 'deep';
  /** 用户意图 - optional: maintain|grow|repair */
  intent?: 'maintain' | 'grow' | 'repair';
  /** 关系类型偏好 - optional: business|friend|mixed */
  relationshipMix?: 'business' | 'friend' | 'mixed';
  /** 时间预算（分钟） - optional */
  timeBudgetMinutes?: number;
}

export interface ContactInsightOutput {
  profileSummary: string;
  relationshipSignals: Array<{
    type: string;
    description: string;
    strength: 'weak' | 'moderate' | 'strong';
  }>;
  opportunities: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  risks: Array<{
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  suggestedActions: Array<{
    action: string;
    reason: string;
    urgency: 'low' | 'medium' | 'high';
  }>;
  openingLines: string[];
  citations: Array<{
    source: string;
    type: string;
    reference: string;
  }>;
  sourceHash: string;
  generatedAt: number;
}

/**
 * Contact Insight Service
 * 生成联系人洞察分析
 */
@Injectable()
export class ContactInsightService {
  private readonly logger = new Logger(ContactInsightService.name);
  private readonly agentId = 'contact_insight';
  private readonly ttlSeconds = 21600; // 6 hours

  constructor(
    @Inject(forwardRef(() => AgentRuntimeExecutor))
    private readonly runtimeExecutor: AgentRuntimeExecutor,
    private readonly snapshotService: SnapshotService,
    private readonly contextBuilder: ContactInsightContextBuilder,
  ) {}

  /**
   * 生成联系人洞察
   */
  async generate(
    input: ContactInsightInput,
    options: { forceRefresh?: boolean } = {}
  ): Promise<ContactInsightOutput> {
    const { userId, contactId, depth = 'standard', intent, relationshipMix, timeBudgetMinutes } = input;

    // 构建输入数据用于计算 sourceHash
    const inputData = {
      userId,
      contactId,
      depth,
      intent,
      relationshipMix,
      timeBudgetMinutes,
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
          scopeType: 'contact',
          scopeId: contactId,
          sourceHash,
          promptVersion: '1.0.0',
        },
        { forceRefresh: false }
      );

      if (cached.cached && cached.snapshot) {
        this.logger.debug(`Using cached insight for contact ${contactId}`);
        return {
          ...(cached.snapshot.output as ContactInsightOutput),
          sourceHash,
          generatedAt: cached.snapshot.createdAt.getTime(),
        };
      }
    }

    // 构建运行时上下文
    const context = await this.contextBuilder.buildContext(userId, contactId, depth);

    // 使用 AgentRuntimeExecutor 执行（跳过服务路由以避免循环依赖）
    const executionResult = await this.runtimeExecutor.execute(
      this.agentId,
      null,
      context as unknown as Record<string, unknown>,
      {
        useCache: false, // 我们在这里手动管理缓存
        forceRefresh: options.forceRefresh,
        userId,
        skipServiceRouting: true, // 跳过服务路由，直接使用通用流程
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 4096,
        intent,
        relationshipMix,
        timeBudgetMinutes,
      },
    );

    // 格式化输出
    const output: ContactInsightOutput = {
      ...(executionResult.data as unknown as ContactInsightOutput),
      sourceHash,
      generatedAt: Date.now(),
    };

    // 保存快照
    await this.snapshotService.createSnapshot({
      agentId: this.agentId,
      operation: null,
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
   * 计算 sourceHash
   */
  private computeSourceHash(input: {
    userId: string;
    contactId: string;
    depth: string;
    intent?: 'maintain' | 'grow' | 'repair';
    relationshipMix?: 'business' | 'friend' | 'mixed';
    timeBudgetMinutes?: number;
  }): string {
    const data = JSON.stringify({
      agentId: this.agentId,
      userId: input.userId,
      contactId: input.contactId,
      depth: input.depth,
      intent: input.intent,
      relationshipMix: input.relationshipMix,
      timeBudgetMinutes: input.timeBudgetMinutes,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
