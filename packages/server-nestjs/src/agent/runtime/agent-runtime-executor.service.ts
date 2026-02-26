import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { AgentDefinitionRegistry } from './agent-definition-registry.service';
import { PromptTemplateRenderer } from './prompt-template-renderer.service';
import { OutputValidator } from './output-validator.service';
import { SnapshotService } from '../snapshots/snapshot.service';
import { AiService } from '../../ai/ai.service';
import type { AgentId } from '../contracts/agent-definition.types';
import type { RuntimeContext } from '../contracts/runtime.types';
import { generateUlid } from '../../utils/ulid';
import * as crypto from 'crypto';
import { TitleSummaryService } from '../capabilities/title_summary/title-summary.service';
import { ContactInsightService } from '../capabilities/contact_insight/contact-insight.service';
import { ArchiveBriefService } from '../capabilities/archive_brief/archive-brief.service';
import { ActionTrackingService } from '../../action-tracking/action-tracking.service';
import type { ContactInsightOutput } from '../capabilities/contact_insight/contact-insight.types';
import type { NetworkActionOutput } from '../capabilities/network_action/network-action.types';
import { AgentRuntimeError } from '../errors/agent-runtime.error';
import type { LlmRequestConfig } from '../../ai/providers/llm-types';
import { LlmCallError, LlmConfigurationError } from '../../ai/providers/llm-config.types';

/**
 * Agent 运行结果
 */
export interface AgentExecutionResult {
  /** 运行 ID */
  runId: string;
  /** 是否来自缓存 */
  cached: boolean;
  /** 快照 ID（如果使用了缓存） */
  snapshotId?: string;
  /** 执行结果数据 */
  data: Record<string, unknown>;
}

/**
 * Agent Runtime 执行器
 * 负责执行 Agent 的完整流程：加载定义 -> 渲染模板 -> 调用 AI -> 验证输出
 */
@Injectable()
export class AgentRuntimeExecutor {
  private readonly logger = new Logger(AgentRuntimeExecutor.name);

  /** Feature Flag: 是否启用建议追踪 */
  private readonly ACTION_TRACKING_ENABLED = process.env.ACTION_TRACKING_ENABLED === 'true';

  constructor(
    private readonly registry: AgentDefinitionRegistry,
    private readonly templateRenderer: PromptTemplateRenderer,
    private readonly outputValidator: OutputValidator,
    private readonly snapshotService: SnapshotService,
    private readonly aiService: AiService,
    @Inject(forwardRef(() => TitleSummaryService))
    private readonly titleSummaryService?: TitleSummaryService,
    @Inject(forwardRef(() => ContactInsightService))
    private readonly contactInsightService?: ContactInsightService,
    @Inject(forwardRef(() => ArchiveBriefService))
    private readonly archiveBriefService?: ArchiveBriefService,
    @Inject(forwardRef(() => ActionTrackingService))
    private readonly actionTrackingService?: ActionTrackingService,
  ) { }

  /**
   * 执行 Agent
   * @param agentId Agent ID
   * @param operation 操作类型（可选）
   * @param input 输入数据
   * @param options 运行选项
   * @returns 执行结果
   */
  async execute(
    agentId: AgentId,
    operation: string | null | undefined,
    input: Record<string, unknown>,
    options?: {
      useCache?: boolean;
      forceRefresh?: boolean;
      userId?: string;
      conversationId?: string;
      sessionId?: string;
      llm?: LlmRequestConfig;
      skipServiceRouting?: boolean; // 跳过服务路由，直接使用通用流程（用于避免循环依赖）
      intent?: 'maintain' | 'grow' | 'repair';
      relationshipMix?: 'business' | 'friend' | 'mixed';
      timeBudgetMinutes?: number;
    }
  ): Promise<AgentExecutionResult> {
    const runId = generateUlid();

    // 路由到对应的 capability 服务（除非 skipServiceRouting 为 true）
    // 注意：当服务自己调用 AgentRuntimeExecutor 时，应该设置 skipServiceRouting=true 以避免循环依赖
    if (!options?.skipServiceRouting) {
      if (agentId === 'title_summary') {
        return this.executeTitleSummary(input, options);
      } else if (agentId === 'contact_insight') {
        return this.executeContactInsight(input, options);
      } else if (agentId === 'archive_brief') {
        return this.executeArchiveBrief(operation, input, options);
      }
    }

    // 对于其他 agent（包括 network_action）或当 skipServiceRouting=true 时，使用通用执行流程

    // 1. 加载 Agent 定义
    let bundle;
    try {
      bundle = await this.registry.loadDefinition(agentId, { userId: options?.userId });
    } catch (error) {
      throw new AgentRuntimeError({
        code: 'agent_not_found',
        message: `Agent definition not found: ${agentId}`,
        statusCode: 404,
        details: error,
      });
    }

    // 2. 构建运行时上下文
    const context: RuntimeContext = {
      ...input,
      operation: operation ?? null,
      userId: options?.userId,
      ...(options?.intent !== undefined && { intent: options.intent }),
      ...(options?.relationshipMix !== undefined && { relationshipMix: options.relationshipMix }),
      ...(options?.timeBudgetMinutes !== undefined && { timeBudgetMinutes: options.timeBudgetMinutes }),
    };

    // 3. 计算 sourceHash（用于缓存）
    const sourceHash = this.computeSourceHash(agentId, operation, input, {
      cache: bundle.definition.cache ? { sourceHashFields: (bundle.definition.cache as any).sourceHashFields } : undefined
    });
    const promptVersion = bundle.definition.version || '1.0.0';
    const ttlSeconds = bundle.definition.cache?.ttl || 86400; // 默认 24 小时

    // 4. 检查缓存（如果启用）
    if (options?.useCache !== false && !options?.forceRefresh) {
      // 确定 scopeType 和 scopeId
      const scopeType = this.determineScopeType(agentId, input);
      const scopeId = this.determineScopeId(scopeType, input, options);

      const cached = await this.snapshotService.findSnapshot(
        {
          agentId,
          operation: operation ?? null,
          userId: options?.userId ?? null,
          scopeType,
          scopeId: scopeId ?? null,
          sourceHash,
          promptVersion,
        },
        { forceRefresh: false }
      );

      if (cached.cached && cached.snapshot) {
        this.logger.debug(`Cache hit for ${agentId} sourceHash=${sourceHash}`);
        return {
          runId,
          cached: true,
          snapshotId: cached.snapshot.id,
          data: cached.snapshot.output as Record<string, unknown>,
        };
      }
    }

    // 5. 渲染模板
    const renderResult = await this.templateRenderer.render(bundle, context);

    // 如果有警告，记录但不中断执行
    if (renderResult.warnings && renderResult.warnings.length > 0) {
      this.logger.warn(`Template rendering warnings for ${agentId}:`, renderResult.warnings);
    }

    // 6. 调用 AI 服务
    // renderResult 返回的是 system 和 user 字段（虽然类型定义是 systemPrompt 和 userPrompt）
    const systemPrompt = (renderResult as { system?: string; systemPrompt?: string }).system ||
      (renderResult as { system?: string; systemPrompt?: string }).systemPrompt || '';
    const userPrompt = (renderResult as { user?: string; userPrompt?: string }).user ||
      (renderResult as { user?: string; userPrompt?: string }).userPrompt || '';

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    let aiResponse: string;
    try {
      const stream = await this.aiService.streamChat(messages, {
        llm: options?.llm,
      });

      // 收集流式响应
      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          fullResponse += content;
        }
      }
      aiResponse = fullResponse;
    } catch (error) {
      if (error instanceof LlmConfigurationError) {
        throw new AgentRuntimeError({
          code: error.code,
          message: error.message,
          statusCode: error.code === 'unsupported_llm_provider' ? 400 : 500,
          details: error,
          retryable: false,
        });
      }

      if (error instanceof LlmCallError) {
        throw new AgentRuntimeError({
          code: 'llm_call_failed',
          message: error.message,
          statusCode: 502,
          details: error,
          retryable: true,
        });
      }

      throw new AgentRuntimeError({
        code: 'llm_call_failed',
        message: `AI service error: ${error instanceof Error ? error.message : String(error)}`,
        statusCode: 502,
        details: error,
        retryable: true,
      });
    }

    // 7. 解析 AI 响应（尝试 JSON 解析）
    let parsedOutput: unknown;
    try {
      let jsonContent = aiResponse.trim();
      if (jsonContent.startsWith('```')) {
        const match = jsonContent.match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (match) {
          jsonContent = match[1];
        }
      }
      parsedOutput = JSON.parse(jsonContent);
    } catch {
      // 如果不是 JSON，使用原始文本
      parsedOutput = { content: aiResponse };
    }
    // 7.5 归一化输出（补齐 AI 可能省略的可选字段）
    if (agentId === 'network_action' && parsedOutput && typeof parsedOutput === 'object') {
      const output = parsedOutput as Record<string, unknown>;
      if (Array.isArray(output.recommendations)) {
        output.recommendations = output.recommendations.map((rec: any) => ({
          ...rec,
          contacts: Array.isArray(rec.contacts) ? rec.contacts : [],
          confidence: typeof rec.confidence === 'number' ? rec.confidence : 0.5,
          reason: typeof rec.reason === 'string' ? rec.reason : rec.description || '',
        }));
      }
      if (Array.isArray(output.followUps)) {
        output.followUps = output.followUps.map((f: any) => ({
          ...f,
          timingReason: f.timingReason || f.timing_reason || '',
          valueFirstSuggestion: f.valueFirstSuggestion || f.value_first_suggestion || '',
          followupPlan: f.followupPlan || f.followup_plan || '',
        }));
      }
    }
    if (agentId === 'title_summary') {
      parsedOutput = this.normalizeTitleSummaryOutput(parsedOutput, aiResponse);
    }
    if (agentId === 'contact_insight') {
      parsedOutput = this.normalizeContactInsightOutput(parsedOutput);
    }

    // 8. 验证输出
    const validationResult = await this.outputValidator.validate(bundle, parsedOutput);
    if (!validationResult.valid) {
      throw new AgentRuntimeError({
        code: 'output_validation_failed',
        message: 'Agent output validation failed',
        statusCode: 400,
        details: validationResult.errors,
      });
    }

    // 9. 保存快照（如果启用缓存）
    let snapshotId: string | undefined;
    if (options?.useCache !== false) {
      try {
        const scopeType = this.determineScopeType(agentId, input);
        const scopeId = this.determineScopeId(scopeType, input, options);

        const snapshot = await this.snapshotService.createSnapshot({
          agentId,
          operation: operation ?? null,
          scopeType,
          scopeId: scopeId ?? null,
          userId: options?.userId ?? null,
          sourceHash,
          promptVersion,
          model: options?.llm?.model ?? null,
          input: context as Record<string, unknown>,
          output: parsedOutput as Record<string, unknown>,
          ttlSeconds,
        });
        snapshotId = snapshot.id;
        this.logger.debug(`Saved snapshot ${snapshotId} for ${agentId}`);
      } catch (error) {
        // 快照保存失败不影响返回结果，只记录警告
        this.logger.warn(`Failed to save snapshot for ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 10. 追踪建议展示事件（如果启用且适用）
    if (this.ACTION_TRACKING_ENABLED && this.actionTrackingService && agentId === 'network_action') {
      const userId = (context.userId ?? options?.userId) as string | undefined;
      if (userId) {
        await this.trackNetworkActionSuggestions(userId, agentId, parsedOutput as NetworkActionOutput);
      }
    }

    // 11. 返回结果
    return {
      runId,
      cached: false,
      snapshotId,
      data: parsedOutput as Record<string, unknown>,
    };
  }

  /**
   * 执行 title_summary
   */
  private async executeTitleSummary(
    input: Record<string, unknown>,
    options?: {
      useCache?: boolean;
      forceRefresh?: boolean;
      userId?: string;
      conversationId?: string;
      llm?: LlmRequestConfig;
    }
  ): Promise<AgentExecutionResult> {
    const runId = generateUlid();

    if (!this.titleSummaryService) {
      throw new AgentRuntimeError({
        code: 'service_unavailable',
        message: 'TitleSummaryService not available',
        statusCode: 500,
      });
    }

    if (!input.userId && !options?.userId) {
      throw new AgentRuntimeError({
        code: 'invalid_input',
        message: 'userId is required',
        statusCode: 400,
      });
    }
    if (!input.conversationId && !options?.conversationId) {
      throw new AgentRuntimeError({
        code: 'invalid_input',
        message: 'conversationId is required',
        statusCode: 400,
      });
    }

    const userId = (input.userId || options?.userId) as string;
    const conversationId = (input.conversationId || options?.conversationId) as string;

    // 在调用 generate 之前检查缓存状态
    // 注意：title_summary service 内部也会检查缓存，但我们需要在这里也检查以返回准确的 cached 状态
    const inputData = {
      conversationId,
    };
    const sourceHash = crypto.createHash('sha256')
      .update(JSON.stringify({ agentId: 'title_summary', ...inputData }))
      .digest('hex');

    let cached = false;
    let snapshotId: string | undefined;
    if (options?.useCache !== false && !options?.forceRefresh) {
      const cachedResult = await this.snapshotService.findSnapshot(
        {
          agentId: 'title_summary',
          operation: null,
          userId,
          scopeType: 'conversation',
          scopeId: conversationId,
          sourceHash,
          promptVersion: '1.0.0',
        },
        { forceRefresh: false }
      );
      if (cachedResult.cached && cachedResult.snapshot) {
        cached = true;
        snapshotId = cachedResult.snapshot.id;
        // 如果缓存命中，直接返回缓存结果
        return {
          runId,
          cached: true,
          snapshotId,
          data: cachedResult.snapshot.output as Record<string, unknown>,
        };
      }
    }

    // 调用服务生成（如果没有缓存）
    const result = await this.titleSummaryService.generate(
      {
        userId,
        conversationId,
      },
      {
        forceRefresh: options?.forceRefresh,
        llm: options?.llm,
      }
    );

    return {
      runId,
      cached: false,
      data: result as unknown as Record<string, unknown>,
    };
  }

  /**
   * 执行 contact_insight
   */
  private async executeContactInsight(
    input: Record<string, unknown>,
    options?: {
      useCache?: boolean;
      forceRefresh?: boolean;
      userId?: string;
      llm?: LlmRequestConfig;
      intent?: 'maintain' | 'grow' | 'repair';
      relationshipMix?: 'business' | 'friend' | 'mixed';
      timeBudgetMinutes?: number;
    }
  ): Promise<AgentExecutionResult> {
    const runId = generateUlid();

    if (!this.contactInsightService) {
      throw new AgentRuntimeError({
        code: 'service_unavailable',
        message: 'ContactInsightService not available',
        statusCode: 500,
      });
    }

    if (!input.userId && !options?.userId) {
      throw new AgentRuntimeError({
        code: 'invalid_input',
        message: 'userId is required',
        statusCode: 400,
      });
    }
    if (!input.contactId) {
      throw new AgentRuntimeError({
        code: 'invalid_input',
        message: 'contactId is required',
        statusCode: 400,
      });
    }

    const userId = (input.userId || options?.userId) as string;

    const result = await this.contactInsightService.generate(
      {
        userId,
        contactId: input.contactId as string,
        depth: input.depth as 'brief' | 'standard' | 'deep' | undefined,
        intent: options?.intent,
        relationshipMix: options?.relationshipMix,
        timeBudgetMinutes: options?.timeBudgetMinutes,
      },
      {
        forceRefresh: options?.forceRefresh,
        llm: options?.llm,
      }
    );

    // 追踪建议展示事件（如果启用）
    if (this.ACTION_TRACKING_ENABLED && this.actionTrackingService) {
      await this.trackContactInsightSuggestions(userId, 'contact_insight', result as unknown as ContactInsightOutput);
    }

    return {
      runId,
      cached: false,
      data: result as unknown as Record<string, unknown>,
    };
  }

  /**
   * 追踪 contact_insight 的建议展示事件
   */
  private async trackContactInsightSuggestions(
    userId: string,
    agentId: string,
    output: ContactInsightOutput
  ): Promise<void> {
    if (!this.actionTrackingService) {
      return;
    }
    try {
      const { suggestedActions } = output;
      if (!Array.isArray(suggestedActions) || suggestedActions.length === 0) {
        return;
      }

      // 为每个建议生成追踪事件
      await Promise.all(
        suggestedActions.map((action, index) =>
          this.actionTrackingService!.recordSuggestionShown({
            userId,
            agentId,
            suggestionId: `${agentId}-${index}`,
            suggestionType: 'followup',
            content: {
              action: action.action,
              reason: action.reason,
              priority: action.priority,
            },
          })
        )
      );

      this.logger.debug(`Tracked ${suggestedActions.length} suggestion_shown events for ${agentId}`);
    } catch (error) {
      // 追踪失败不影响主流程
      this.logger.warn(
        `Failed to track suggestion_shown events: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 追踪 network_action 的建议展示事件
   */
  private async trackNetworkActionSuggestions(
    userId: string,
    agentId: string,
    output: NetworkActionOutput
  ): Promise<void> {
    if (!this.actionTrackingService) {
      return;
    }
    try {
      const { followUps, recommendations } = output;
      const suggestionEvents: Array<Promise<void>> = [];

      // 追踪 followUps
      if (Array.isArray(followUps) && followUps.length > 0) {
        followUps.forEach((followUp, index) => {
          suggestionEvents.push(
            this.actionTrackingService!.recordSuggestionShown({
              userId,
              agentId,
              suggestionId: `${agentId}-followup-${index}`,
              suggestionType: 'followup',
              content: {
                contactId: followUp.contactId,
                contactName: followUp.contactName,
                suggestedAction: followUp.suggestedAction,
                reason: followUp.reason,
                priority: followUp.priority,
              },
            })
          );
        });
      }

      // 追踪 recommendations
      if (Array.isArray(recommendations) && recommendations.length > 0) {
        recommendations.forEach((rec, index) => {
          suggestionEvents.push(
            this.actionTrackingService!.recordSuggestionShown({
              userId,
              agentId,
              suggestionId: `${agentId}-recommendation-${index}`,
              suggestionType: rec.type === 'connection' ? 'connection' : rec.type === 'introduction' ? 'introduction' : 'followup',
              content: {
                type: rec.type,
                description: rec.description,
                contacts: rec.contacts,
                confidence: rec.confidence,
                reason: rec.reason,
              },
            })
          );
        });
      }

      await Promise.all(suggestionEvents);
      this.logger.debug(`Tracked ${suggestionEvents.length} suggestion_shown events for ${agentId}`);
    } catch (error) {
      // 追踪失败不影响主流程
      this.logger.warn(
        `Failed to track suggestion_shown events: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 执行 archive_brief
   */
  private async executeArchiveBrief(
    operation: string | null | undefined,
    input: Record<string, unknown>,
    options?: {
      useCache?: boolean;
      forceRefresh?: boolean;
      userId?: string;
      llm?: LlmRequestConfig;
    }
  ): Promise<AgentExecutionResult> {
    const runId = generateUlid();

    if (!this.archiveBriefService) {
      throw new AgentRuntimeError({
        code: 'service_unavailable',
        message: 'ArchiveBriefService not available',
        statusCode: 500,
      });
    }

    if (!input.userId && !options?.userId) {
      throw new AgentRuntimeError({
        code: 'invalid_input',
        message: 'userId is required',
        statusCode: 400,
      });
    }

    const userId = (input.userId || options?.userId) as string;

    if (operation === 'archive_extract') {
      if (!input.conversationId) {
        throw new AgentRuntimeError({
          code: 'invalid_input',
          message: 'conversationId is required for archive_extract',
          statusCode: 400,
        });
      }

      const conversationId = input.conversationId as string;
      const result = await this.archiveBriefService.extractArchive(
        {
          userId,
          conversationId,
        },
        {
          forceRefresh: options?.forceRefresh,
          llm: options?.llm,
        }
      );

      // 检查是否来自缓存
      let cached = false;
      let snapshotId: string | undefined;
      if (result.sourceHash) {
        try {
          const snapshotResult = await this.snapshotService.findSnapshot(
            {
              agentId: 'archive_brief',
              operation: 'archive_extract',
              userId,
              scopeType: 'conversation',
              scopeId: conversationId,
              sourceHash: result.sourceHash,
              promptVersion: '1.0.0',
            },
            { forceRefresh: false }
          );
          if (snapshotResult.cached && snapshotResult.snapshot) {
            cached = true;
            snapshotId = snapshotResult.snapshot.id;
          }
        } catch (error) {
          this.logger.debug(`Failed to check cache status for archive_extract: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        runId,
        cached,
        snapshotId,
        data: result as unknown as Record<string, unknown>,
      };
    } else if (operation === 'brief_generate') {
      if (!input.contactId) {
        throw new AgentRuntimeError({
          code: 'invalid_input',
          message: 'contactId is required for brief_generate',
          statusCode: 400,
        });
      }

      const contactId = input.contactId as string;
      const result = await this.archiveBriefService.generateBrief(
        {
          userId,
          contactId,
        },
        {
          forceRefresh: options?.forceRefresh,
          llm: options?.llm,
        }
      );

      // 检查是否来自缓存
      let cached = false;
      let snapshotId: string | undefined;
      // BriefGenerateOutput 使用 source_hash 字段
      const sourceHash = (result as { source_hash?: string }).source_hash;
      if (sourceHash) {
        try {
          const snapshotResult = await this.snapshotService.findSnapshot(
            {
              agentId: 'archive_brief',
              operation: 'brief_generate',
              userId,
              scopeType: 'contact',
              scopeId: contactId,
              sourceHash,
              promptVersion: '1.0.0',
            },
            { forceRefresh: false }
          );
          if (snapshotResult.cached && snapshotResult.snapshot) {
            cached = true;
            snapshotId = snapshotResult.snapshot.id;
          }
        } catch (error) {
          this.logger.debug(`Failed to check cache status for brief_generate: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        runId,
        cached,
        snapshotId,
        data: result as unknown as Record<string, unknown>,
      };
    } else {
      throw new AgentRuntimeError({
        code: 'agent_operation_invalid',
        message: `Invalid operation for archive_brief: ${operation}`,
        statusCode: 400,
      });
    }
  }

  private normalizeTitleSummaryOutput(parsedOutput: unknown, rawResponse: string): Record<string, unknown> {
    const output = this.asRecord(parsedOutput);

    const normalize = (value: unknown, fallback: string, maxLength: number): string => {
      const text = typeof value === 'string' ? value.trim() : '';
      const candidate = text.length > 0 ? text : fallback;
      return candidate.replace(/\s+/g, ' ').slice(0, maxLength);
    };

    const extracted = this.extractTitleSummaryFromRaw(rawResponse);

    const summaryFallback = normalize(
      extracted.summary ?? rawResponse,
      '该对话暂无可用摘要信息。',
      300,
    );

    return {
      title: normalize(output.title ?? extracted.title, '未分类对话', 50),
      summary: normalize(output.summary ?? extracted.summary, summaryFallback, 300),
    };
  }

  private extractTitleSummaryFromRaw(rawResponse: string): { title?: string; summary?: string } {
    const trimmed = rawResponse.trim();
    if (!trimmed) {
      return {};
    }

    const candidates: string[] = [trimmed];
    const fencedMatch = trimmed.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    if (fencedMatch?.[1]) {
      candidates.unshift(fencedMatch[1].trim());
    }

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const record = parsed as Record<string, unknown>;
          return {
            title: typeof record.title === 'string' ? record.title : undefined,
            summary: typeof record.summary === 'string' ? record.summary : undefined,
          };
        }
      } catch {
        continue;
      }
    }

    return {
      summary: trimmed,
    };
  }

  private normalizeContactInsightOutput(parsedOutput: unknown): Record<string, unknown> {
    const output = this.asRecord(parsedOutput);

    const normalizeString = (value: unknown, fallback: string, minLength = 0, maxLength = 500): string => {
      const str = typeof value === 'string' ? value.trim() : '';
      const candidate = str.length > 0 ? str : fallback;
      let normalized = candidate.length > maxLength ? candidate.slice(0, maxLength) : candidate;
      if (normalized.length < minLength) {
        normalized = `${normalized}。${fallback}`.slice(0, maxLength);
      }
      return normalized;
    };

    const normalizeLevel = (
      value: unknown,
      allowed: readonly string[],
      fallback: string,
    ): string => {
      if (typeof value === 'string') {
        const lowered = value.trim().toLowerCase();
        if (allowed.includes(lowered)) {
          return lowered;
        }
      }
      return fallback;
    };

    const normalizeCitationType = (value: unknown): 'conversation' | 'event' | 'fact' | 'todo' => {
      if (typeof value !== 'string') {
        return 'conversation';
      }
      const normalized = value.trim().toLowerCase();
      if (normalized === 'conversation' || normalized === 'event' || normalized === 'fact' || normalized === 'todo') {
        return normalized;
      }
      if (normalized === 'message' || normalized === 'chat') {
        return 'conversation';
      }
      if (normalized === 'task' || normalized === 'action') {
        return 'todo';
      }
      if (normalized === 'profile' || normalized === 'contact') {
        return 'fact';
      }
      return 'conversation';
    };

    const relationshipSignals = (Array.isArray(output.relationshipSignals) ? output.relationshipSignals : [])
      .map((item) => {
        const signal = this.asRecord(item);
        return {
          type: normalizeString(signal.type, 'general_signal', 3, 80),
          description: normalizeString(
            signal.description,
            '该联系人近期互动有可观察变化，建议结合上下文继续跟进。',
            20,
            500,
          ),
          strength: normalizeLevel(signal.strength, ['weak', 'moderate', 'strong'], 'moderate'),
        };
      });

    const opportunities = (Array.isArray(output.opportunities) ? output.opportunities : [])
      .map((item) => {
        const opportunity = this.asRecord(item);
        return {
          title: normalizeString(opportunity.title, '潜在合作机会', 2, 100),
          description: normalizeString(
            opportunity.description,
            '从近期上下文看存在可推进的互动机会，建议尽快设计下一步触达。',
            20,
            500,
          ),
          priority: normalizeLevel(opportunity.priority, ['low', 'medium', 'high'], 'medium'),
        };
      });

    const risks = (Array.isArray(output.risks) ? output.risks : [])
      .map((item) => {
        const risk = this.asRecord(item);
        return {
          title: normalizeString(risk.title, '关系风险点', 2, 100),
          description: normalizeString(
            risk.description,
            '存在需要关注的关系风险，若长期不处理可能影响后续协作与信任。',
            20,
            500,
          ),
          severity: normalizeLevel(risk.severity, ['low', 'medium', 'high'], 'medium'),
        };
      });

    const suggestedActions = (Array.isArray(output.suggestedActions) ? output.suggestedActions : [])
      .map((item) => {
        const action = this.asRecord(item);
        return {
          action: normalizeString(action.action, '安排一次简短跟进沟通', 2, 200),
          reason: normalizeString(
            action.reason,
            '该动作可降低关系不确定性并提高后续互动质量，建议尽快执行。',
            20,
            500,
          ),
          urgency: normalizeLevel(action.urgency ?? action.priority, ['low', 'medium', 'high'], 'medium'),
        };
      });

    const openingLines = (Array.isArray(output.openingLines) ? output.openingLines : [])
      .map((line) =>
        normalizeString(
          line,
          '最近想到我们上次聊到的话题，想和你同步一个新的进展。',
          10,
          200,
        ),
      )
      .filter((line) => line.length >= 10);
    if (openingLines.length === 0) {
      openingLines.push('最近想到我们上次聊到的话题，想和你同步一个新的进展。');
    }

    const citations = (Array.isArray(output.citations) ? output.citations : [])
      .map((item) => {
        const citation = this.asRecord(item);
        const reference = normalizeString(citation.reference ?? citation.source, '上下文来源', 2, 255);
        return {
          source: normalizeString(citation.source ?? reference, '上下文来源', 2, 255),
          type: normalizeCitationType(citation.type),
          reference,
        };
      });

    const sourceRefs = (Array.isArray(output.sourceRefs) ? output.sourceRefs : [])
      .map((item) => {
        const sourceRef = this.asRecord(item);
        return {
          type: normalizeCitationType(sourceRef.type),
          reference: normalizeString(sourceRef.reference, '上下文来源', 2, 255),
        };
      });
    if (sourceRefs.length === 0) {
      for (const citation of citations) {
        sourceRefs.push({
          type: citation.type,
          reference: citation.reference,
        });
      }
    }

    const evidenceChains = (Array.isArray(output.evidenceChains) ? output.evidenceChains : [])
      .map((item) => {
        const chain = this.asRecord(item);
        const sourceType = normalizeCitationType(chain.sourceType ?? chain.type);
        const sourceRef = normalizeString(chain.sourceRef ?? chain.reference, '上下文来源', 2, 255);
        return {
          summary: normalizeString(chain.summary, '基于已有互动记录提取的证据摘要。', 3, 200),
          sourceType,
          sourceRef,
        };
      });
    if (evidenceChains.length === 0) {
      for (const citation of citations.slice(0, 5)) {
        evidenceChains.push({
          summary: normalizeString(citation.reference, '基于已有互动记录提取的证据摘要。', 3, 200),
          sourceType: citation.type,
          sourceRef: citation.reference,
        });
      }
    }

    const confidenceRaw = typeof output.confidence === 'number' ? output.confidence : 0.5;
    const confidence = Number(Math.max(0, Math.min(1, confidenceRaw)).toFixed(2));

    const priorityScoreRaw =
      typeof output.priorityScore === 'number'
        ? output.priorityScore
        : typeof output.priority_score === 'number'
          ? output.priority_score
          : 50;
    const priorityScore = Number(Math.max(0, Math.min(100, priorityScoreRaw)).toFixed(1));

    const reasonTags = (Array.isArray(output.reasonTags) ? output.reasonTags : Array.isArray(output.reason_tags) ? output.reason_tags : [])
      .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      .map((tag) => tag.trim());

    const relationshipRiskLevel = normalizeLevel(
      output.relationshipRiskLevel ?? output.relationship_risk_level,
      ['low', 'medium', 'high'],
      'medium',
    );

    const profileSummary = normalizeString(
      output.profileSummary,
      '该联系人在近期互动中呈现稳定关系基础，存在进一步深化连接与协作的空间，建议结合具体情境推进沟通。',
      50,
      1000,
    );

    const normalized: Record<string, unknown> = {
      profileSummary,
      relationshipSignals,
      opportunities,
      risks,
      suggestedActions,
      openingLines,
      citations,
      confidence,
      sourceRefs,
      evidenceChains,
      priorityScore,
      reasonTags,
      relationshipRiskLevel,
    };

    if (typeof output.sourceHash === 'string' && output.sourceHash.trim().length > 0) {
      normalized.sourceHash = output.sourceHash.trim();
    }
    if (typeof output.generatedAt === 'number' && Number.isFinite(output.generatedAt)) {
      normalized.generatedAt = output.generatedAt;
    }

    return normalized;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  /**
   * 计算 sourceHash
   * 根据 agent.json 中的 sourceHashFields 配置，只计算指定字段的 hash
   */
  private computeSourceHash(
    agentId: string,
    operation: string | null | undefined,
    input: Record<string, unknown>,
    definition?: { cache?: { sourceHashFields?: string[] } }
  ): string {
    // 获取 sourceHashFields 配置
    const sourceHashFields = definition?.cache?.sourceHashFields;

    let dataToHash: Record<string, unknown>;

    if (sourceHashFields && Array.isArray(sourceHashFields) && sourceHashFields.length > 0) {
      // 只使用配置的字段
      dataToHash = {
        agentId,
        operation: operation ?? null,
      };

      for (const field of sourceHashFields) {
        if (input[field] !== undefined) {
          dataToHash[field] = input[field];
        }
      }
    } else {
      // 如果没有配置，使用所有 input 字段
      dataToHash = {
        agentId,
        operation: operation ?? null,
        ...input,
      };
    }

    const data = JSON.stringify(dataToHash);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 确定 scopeType
   */
  private determineScopeType(
    agentId: string,
    input: Record<string, unknown>
  ): 'user' | 'contact' | 'conversation' {
    // 根据 agentId 和 input 确定 scopeType
    if (input.conversationId) {
      return 'conversation';
    }
    if (input.contactId) {
      return 'contact';
    }
    // 默认使用 user scope
    return 'user';
  }

  /**
   * 确定 scopeId
   */
  private determineScopeId(
    scopeType: 'user' | 'contact' | 'conversation',
    input: Record<string, unknown>,
    options?: { userId?: string; conversationId?: string }
  ): string | null {
    if (scopeType === 'conversation') {
      if (typeof input.conversationId === 'string' && input.conversationId.length > 0) {
        return input.conversationId;
      }
      if (typeof options?.conversationId === 'string' && options.conversationId.length > 0) {
        return options.conversationId;
      }
      return null;
    }

    if (scopeType === 'contact') {
      if (typeof input.contactId === 'string' && input.contactId.length > 0) {
        return input.contactId;
      }
      return null;
    }

    // user scope：优先使用 options.userId（认证上下文），其次 input.userId
    if (options?.userId) {
      return options.userId;
    }
    if (typeof input.userId === 'string' && input.userId.length > 0) {
      return input.userId;
    }
    return null;
  }

}
