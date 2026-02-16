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
  confidence: number;
  sourceRefs: Array<{
    type: string;
    reference: string;
  }>;
  evidenceChains: Array<{
    summary: string;
    sourceType: string;
    sourceRef: string;
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
  private readonly traceabilityEnabled = process.env.INSIGHT_TRACEABILITY_ENABLED !== 'false';

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
        const cachedOutput = this.ensureTraceabilityFields(cached.snapshot.output as ContactInsightOutput);
        return {
          ...cachedOutput,
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
        maxTokens: 4096,
        intent,
        relationshipMix,
        timeBudgetMinutes,
      },
    );

    // 格式化输出
    const output: ContactInsightOutput = {
      ...this.ensureTraceabilityFields(executionResult.data as unknown as ContactInsightOutput),
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

  private ensureTraceabilityFields(output: ContactInsightOutput): ContactInsightOutput {
    if (!this.traceabilityEnabled) {
      return {
        ...output,
        confidence: typeof output.confidence === 'number' ? output.confidence : 0.5,
        sourceRefs: output.sourceRefs ?? [],
        evidenceChains: output.evidenceChains ?? [],
      };
    }

    const sourceRefs =
      output.sourceRefs ??
      (output.citations ?? []).map((citation) => ({
        type: citation.type,
        reference: citation.reference,
      }));

    const evidenceChains =
      output.evidenceChains ??
      (output.citations ?? []).slice(0, 5).map((citation) => ({
        summary: this.safeEvidenceSummary(citation.reference),
        sourceType: citation.type,
        sourceRef: citation.reference,
      }));

    const confidence = typeof output.confidence === 'number'
      ? output.confidence
      : this.computeConfidence(output);

    return {
      ...output,
      confidence: Number(Math.max(0, Math.min(1, confidence)).toFixed(2)),
      sourceRefs,
      evidenceChains,
    };
  }

  private safeEvidenceSummary(reference: string): string {
    if (!reference) {
      return '关联来源摘要';
    }
    const normalized = reference.replace(/\s+/g, ' ').trim();
    return normalized.length <= 120 ? normalized : `${normalized.slice(0, 117)}...`;
  }

  private computeConfidence(output: ContactInsightOutput): number {
    const signalStrength = output.relationshipSignals?.length ?? 0;
    const citationCount = output.citations?.length ?? 0;
    const actionCount = output.suggestedActions?.length ?? 0;
    const raw = 0.45 + Math.min(signalStrength, 4) * 0.08 + Math.min(citationCount, 5) * 0.05 + Math.min(actionCount, 3) * 0.04;
    return Math.min(0.95, raw);
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
