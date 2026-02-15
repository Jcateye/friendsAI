import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AgentRuntimeExecutor } from '../../runtime/agent-runtime-executor.service';
import { AgentDefinitionRegistry } from '../../runtime/agent-definition-registry.service';
import { SnapshotService } from '../../snapshots/snapshot.service';
import { NetworkActionContextBuilder } from './network-action.context';
import type {
  NetworkActionInput,
  NetworkActionOutput,
  NetworkActionErrorCode,
} from './network-action.types';

type NetworkActionRunInput = NetworkActionInput & {
  intent?: 'maintain' | 'grow' | 'repair';
  relationshipMix?: 'business' | 'friend' | 'mixed';
  timeBudgetMinutes?: number;
};

/**
 * Network Action Agent 服务
 * 负责执行网络行动建议的生成，包括缓存管理
 */
@Injectable()
export class NetworkActionService {
  private readonly logger = new Logger(NetworkActionService.name);
  private readonly AGENT_ID = 'network_action';
  private readonly CACHE_TTL = 43200; // 12 hours in seconds

  constructor(
    private readonly runtimeExecutor: AgentRuntimeExecutor,
    private readonly snapshotService: SnapshotService,
    private readonly contextBuilder: NetworkActionContextBuilder,
    private readonly definitionRegistry: AgentDefinitionRegistry,
  ) {}

  /**
   * 执行 Network Action Agent
   */
  async run(input: NetworkActionRunInput): Promise<NetworkActionOutput> {
    try {
      // 1. 构建上下文并计算 sourceHash
      const context = await this.contextBuilder.build(input.userId, input.limit);
      const sourceHash = this.contextBuilder.computeSourceHash(context, input.userId);

      // 2. 加载 Agent 定义以获取 version
      const bundle = await this.definitionRegistry.loadDefinition(this.AGENT_ID);
      const promptVersion = bundle.definition.version || '1.0.0';

      // 3. 检查缓存（除非 forceRefresh）
      if (!input.forceRefresh) {
        const snapshotResult = await this.snapshotService.findSnapshot(
          {
            agentId: this.AGENT_ID,
            operation: null,
            userId: input.userId,
            scopeType: 'user' as const,
            scopeId: input.userId,
            sourceHash,
            promptVersion,
          },
          { forceRefresh: false },
        );

        if (snapshotResult.cached && snapshotResult.snapshot) {
          this.logger.debug(
            `Cache hit for network_action userId=${input.userId} sourceHash=${sourceHash}`,
          );
          return {
            ...(snapshotResult.snapshot.output as NetworkActionOutput),
            metadata: {
              cached: true,
              sourceHash,
              generatedAt: snapshotResult.snapshot.createdAt.getTime(),
            },
          };
        }
      }

      // 4. 执行 Agent Runtime
      const executionResult = await this.runtimeExecutor.execute(
        this.AGENT_ID,
        null,
        context as unknown as Record<string, unknown>,
        {
          useCache: false, // 我们在这里手动管理缓存
          forceRefresh: input.forceRefresh,
          userId: input.userId,
          intent: input.intent,
          relationshipMix: input.relationshipMix,
          timeBudgetMinutes: input.timeBudgetMinutes,
        },
      );

      // 5. 验证输出格式
      const output = this.validateOutput(executionResult.data);

      // 6. 保存快照
      try {
        // 注意：model 信息在 executionResult 中不可用，因为 runtimeExecutor 没有返回
        // 这里使用 null，实际 model 信息会在 runtimeExecutor 内部保存快照时记录
        await this.snapshotService.createSnapshot({
          agentId: this.AGENT_ID,
          operation: null,
          scopeType: 'user' as const,
          scopeId: input.userId,
          userId: input.userId,
          sourceHash,
          promptVersion,
          model: null, // model 信息在 runtimeExecutor 内部保存快照时记录
          input: context as unknown as Record<string, unknown>,
          output: output as unknown as Record<string, unknown>,
          ttlSeconds: this.CACHE_TTL,
        });
        this.logger.debug(
          `Saved snapshot for network_action userId=${input.userId} sourceHash=${sourceHash}`,
        );
      } catch (error) {
        // 快照保存失败不影响返回结果，只记录警告
        this.logger.warn(
          `Failed to save snapshot: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // 6. 返回结果
      return {
        ...output,
        metadata: {
          cached: false,
          sourceHash,
          generatedAt: Date.now(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to run network_action for userId=${input.userId}: ${error instanceof Error ? error.message : String(error)}`,
      );

      // 处理特定错误
      if (error instanceof BadRequestException) {
        const errorData = error.getResponse() as any;
        if (errorData?.code === 'output_validation_failed') {
          throw new BadRequestException({
            code: 'NETWORK_ACTION_OUTPUT_VALIDATION_FAILED' as NetworkActionErrorCode,
            message: 'Agent output validation failed',
            details: errorData.details,
          });
        }
      }

      // 处理空联系人情况
      if (error instanceof Error && error.message.includes('no contacts')) {
        return this.getEmptyResponse(input.userId);
      }

      throw error;
    }
  }

  /**
   * 验证输出格式
   */
  private validateOutput(data: Record<string, unknown>): NetworkActionOutput {
    // 基本结构验证
    if (!data.followUps || !Array.isArray(data.followUps)) {
      throw new BadRequestException({
        code: 'NETWORK_ACTION_OUTPUT_VALIDATION_FAILED' as NetworkActionErrorCode,
        message: 'Output missing or invalid followUps field',
      });
    }

    if (!data.recommendations || !Array.isArray(data.recommendations)) {
      throw new BadRequestException({
        code: 'NETWORK_ACTION_OUTPUT_VALIDATION_FAILED' as NetworkActionErrorCode,
        message: 'Output missing or invalid recommendations field',
      });
    }

    if (!data.synthesis || typeof data.synthesis !== 'string') {
      throw new BadRequestException({
        code: 'NETWORK_ACTION_OUTPUT_VALIDATION_FAILED' as NetworkActionErrorCode,
        message: 'Output missing or invalid synthesis field',
      });
    }

    if (!data.nextActions || !Array.isArray(data.nextActions)) {
      throw new BadRequestException({
        code: 'NETWORK_ACTION_OUTPUT_VALIDATION_FAILED' as NetworkActionErrorCode,
        message: 'Output missing or invalid nextActions field',
      });
    }

    return data as unknown as NetworkActionOutput;
  }

  /**
   * 返回空响应（当没有联系人数据时）
   */
  private getEmptyResponse(userId: string): NetworkActionOutput {
    return {
      followUps: [],
      recommendations: [],
      synthesis: '暂无联系人数据，无法生成关系盘点与行动建议。请先添加联系人。',
      nextActions: [
        {
          action: '添加联系人',
          priority: 'high' as const,
          estimatedTime: '5分钟',
        },
      ],
      metadata: {
        cached: false,
        sourceHash: '',
        generatedAt: Date.now(),
      },
    };
  }
}
