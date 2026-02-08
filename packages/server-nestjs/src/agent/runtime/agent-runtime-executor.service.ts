import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { AgentDefinitionRegistry } from '../contracts/agent-definition-registry.service';
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
  ) {}

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
      model?: string;
      temperature?: number;
      maxTokens?: number;
      skipServiceRouting?: boolean; // 跳过服务路由，直接使用通用流程（用于避免循环依赖）
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
      bundle = await this.registry.loadDefinition(agentId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          code: 'agent_not_found',
          message: `Agent definition not found: ${agentId}`,
        });
      }
      throw error;
    }

    // 2. 构建运行时上下文
    const context: RuntimeContext = {
      ...input,
      operation: operation ?? null,
      userId: options?.userId,
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
      const scopeId = this.determineScopeId(agentId, input, options);

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
        model: options?.model,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
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
      throw new BadRequestException({
        code: 'ai_service_error',
        message: `AI service error: ${error instanceof Error ? error.message : String(error)}`,
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

    // 8. 验证输出
    const validationResult = await this.outputValidator.validate(bundle, parsedOutput);
    if (!validationResult.valid) {
      throw new BadRequestException({
        code: 'output_validation_failed',
        message: 'Agent output validation failed',
        details: validationResult.errors,
      });
    }

    // 9. 保存快照（如果启用缓存）
    let snapshotId: string | undefined;
    if (options?.useCache !== false) {
      try {
        const scopeType = this.determineScopeType(agentId, input);
        const scopeId = this.determineScopeId(agentId, input, options);

        const snapshot = await this.snapshotService.createSnapshot({
          agentId,
          operation: operation ?? null,
          scopeType,
          scopeId: scopeId ?? null,
          userId: options?.userId ?? null,
          sourceHash,
          promptVersion,
          model: options?.model ?? null,
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

    // 10. 返回结果
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
    }
  ): Promise<AgentExecutionResult> {
    const runId = generateUlid();

    if (!this.titleSummaryService) {
      throw new NotFoundException('TitleSummaryService not available');
    }

    if (!input.userId && !options?.userId) {
      throw new BadRequestException('userId is required');
    }
    if (!input.conversationId && !options?.conversationId) {
      throw new BadRequestException('conversationId is required');
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
      { forceRefresh: options?.forceRefresh }
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
    }
  ): Promise<AgentExecutionResult> {
    const runId = generateUlid();

    if (!this.contactInsightService) {
      throw new NotFoundException('ContactInsightService not available');
    }

    if (!input.userId && !options?.userId) {
      throw new BadRequestException('userId is required');
    }
    if (!input.contactId) {
      throw new BadRequestException('contactId is required');
    }

    const result = await this.contactInsightService.generate(
      {
        userId: (input.userId || options?.userId) as string,
        contactId: input.contactId as string,
        depth: input.depth as 'brief' | 'standard' | 'deep' | undefined,
      },
      { forceRefresh: options?.forceRefresh }
    );

    return {
      runId,
      cached: false,
      data: result as unknown as Record<string, unknown>,
    };
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
    }
  ): Promise<AgentExecutionResult> {
    const runId = generateUlid();

    if (!this.archiveBriefService) {
      throw new NotFoundException('ArchiveBriefService not available');
    }

    if (!input.userId && !options?.userId) {
      throw new BadRequestException('userId is required');
    }

    const userId = (input.userId || options?.userId) as string;

    if (operation === 'archive_extract') {
      if (!input.conversationId) {
        throw new BadRequestException('conversationId is required for archive_extract');
      }

      const conversationId = input.conversationId as string;
      const result = await this.archiveBriefService.extractArchive(
        {
          userId,
          conversationId,
        },
        { forceRefresh: options?.forceRefresh }
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
        throw new BadRequestException('contactId is required for brief_generate');
      }

      const contactId = input.contactId as string;
      const result = await this.archiveBriefService.generateBrief(
        {
          userId,
          contactId,
        },
        { forceRefresh: options?.forceRefresh }
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
      throw new BadRequestException(`Invalid operation for archive_brief: ${operation}`);
    }
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
    agentId: string,
    input: Record<string, unknown>,
    options?: { userId?: string; conversationId?: string }
  ): string | null {
    // 优先使用 input 中的 ID
    if (input.conversationId) {
      return input.conversationId as string;
    }
    if (input.contactId) {
      return input.contactId as string;
    }
    // 其次使用 options 中的 ID
    if (options?.conversationId) {
      return options.conversationId;
    }
    // 最后使用 userId 作为 scopeId（对于 user scope）
    return options?.userId ?? input.userId as string ?? null;
  }

}

