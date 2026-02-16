import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ToolConfirmation, ToolConfirmationStatus } from '../entities';
import { FeishuClient } from '../tools/feishu/feishu.client';
import { ActionTrackingService } from '../action-tracking/action-tracking.service';
import { generateUlid } from '../utils/ulid';

interface CreateToolConfirmationInput {
  toolName: string;
  payload?: Record<string, any>;
  conversationId?: string;
  userId?: string;
}

interface BatchItemResult {
  id: string;
  success: boolean;
  status?: ToolConfirmationStatus;
  code?: string;
  message?: string;
}

export interface ToolConfirmationBatchResult {
  total: number;
  succeeded: number;
  failed: number;
  items: BatchItemResult[];
}

@Injectable()
export class ToolConfirmationsService {
  private readonly logger = new Logger(ToolConfirmationsService.name);
  private readonly maxBatchSize = Number(process.env.TOOL_CONFIRMATION_BATCH_MAX ?? 20);
  private readonly batchEnabled = process.env.TOOL_BATCH_OPS_ENABLED !== 'false';

  constructor(
    @InjectRepository(ToolConfirmation)
    private readonly toolConfirmationRepository: Repository<ToolConfirmation>,
    private readonly feishuClient: FeishuClient,
    private readonly actionTracking: ActionTrackingService,
  ) {}

  async create(input: CreateToolConfirmationInput): Promise<ToolConfirmation> {
    if (!input.toolName) {
      throw new BadRequestException('toolName is required');
    }
    const confirmation = this.toolConfirmationRepository.create({
      toolName: input.toolName,
      payload: input.payload ?? null,
      conversationId: input.conversationId ?? null,
      userId: input.userId ?? null,
      status: 'pending',
    });

    return this.toolConfirmationRepository.save(confirmation);
  }

  async findAll(
    status?: ToolConfirmationStatus,
    userId?: string,
    conversationId?: string,
  ): Promise<ToolConfirmation[]> {
    const where: Record<string, any> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (conversationId) where.conversationId = conversationId;

    return this.toolConfirmationRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ToolConfirmation> {
    const confirmation = await this.toolConfirmationRepository.findOne({ where: { id } });
    if (!confirmation) {
      throw new NotFoundException(`Tool confirmation ${id} not found`);
    }
    return confirmation;
  }

  async confirm(
    id: string,
    payloadOverrides?: Record<string, any>,
    userId?: string,
  ): Promise<ToolConfirmation> {
    const confirmation = await this.findOne(id);
    this.ensureOwnership(confirmation, userId);

    if (confirmation.status !== 'pending') {
      throw new BadRequestException(`Tool confirmation ${id} is already ${confirmation.status}`);
    }

    const mergedPayload = {
      ...(confirmation.payload ?? {}),
      ...(payloadOverrides ?? {}),
    };
    confirmation.payload = Object.keys(mergedPayload).length > 0 ? mergedPayload : null;

    const execution = await this.executeTool(confirmation.toolName, confirmation.payload ?? undefined);

    confirmation.confirmedAt = new Date();
    confirmation.executedAt = new Date();
    confirmation.status = execution.success ? 'confirmed' : 'failed';
    confirmation.result = execution.result ?? null;
    confirmation.error = execution.error ?? null;

    return this.toolConfirmationRepository.save(confirmation);
  }

  async reject(id: string, reason?: string, userId?: string): Promise<ToolConfirmation> {
    const confirmation = await this.findOne(id);
    this.ensureOwnership(confirmation, userId);

    if (confirmation.status !== 'pending') {
      throw new BadRequestException(`Tool confirmation ${id} is already ${confirmation.status}`);
    }

    confirmation.status = 'rejected';
    confirmation.rejectedAt = new Date();
    confirmation.error = reason ?? null;

    return this.toolConfirmationRepository.save(confirmation);
  }

  async batchConfirm(
    userId: string | undefined,
    items: Array<{ id: string; payload?: Record<string, any> }>,
  ): Promise<ToolConfirmationBatchResult> {
    if (!this.batchEnabled) {
      throw new BadRequestException('tool_batch_ops_disabled');
    }
    this.validateBatchInput(items);

    const results: BatchItemResult[] = [];
    for (const item of items) {
      try {
        const confirmation = await this.confirm(item.id, item.payload, userId);
        results.push({
          id: item.id,
          success: true,
          status: confirmation.status,
        });
      } catch (error) {
        results.push(this.toBatchError(item.id, error));
      }
    }

    return this.aggregateBatchResult(results);
  }

  async batchReject(
    userId: string | undefined,
    templateReason: string | undefined,
    items: Array<{ id: string; reason?: string }>,
  ): Promise<ToolConfirmationBatchResult> {
    if (!this.batchEnabled) {
      throw new BadRequestException('tool_batch_ops_disabled');
    }
    this.validateBatchInput(items);

    const normalizedTemplateReason = templateReason?.trim();
    const results: BatchItemResult[] = [];
    for (const item of items) {
      try {
        const reason = item.reason?.trim() || normalizedTemplateReason || undefined;
        const confirmation = await this.reject(item.id, reason, userId);
        results.push({
          id: item.id,
          success: true,
          status: confirmation.status,
        });
      } catch (error) {
        results.push(this.toBatchError(item.id, error));
      }
    }

    return this.aggregateBatchResult(results);
  }

  private validateBatchInput(items: Array<{ id: string }>): void {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('empty_batch_items');
    }
    if (items.length > this.maxBatchSize) {
      throw new BadRequestException({
        code: 'batch_size_exceeded',
        message: `Batch size exceeds max limit ${this.maxBatchSize}`,
      });
    }
  }

  private ensureOwnership(confirmation: ToolConfirmation, userId?: string): void {
    if (!userId) {
      return;
    }
    if (confirmation.userId && confirmation.userId !== userId) {
      throw new ForbiddenException('tool_confirmation_forbidden');
    }
  }

  private toBatchError(id: string, error: unknown): BatchItemResult {
    if (error instanceof NotFoundException) {
      return {
        id,
        success: false,
        code: 'not_found',
        message: error.message,
      };
    }
    if (error instanceof ForbiddenException) {
      return {
        id,
        success: false,
        code: 'forbidden',
        message: error.message,
      };
    }
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      const code =
        typeof response === 'object' && response !== null && 'code' in response
          ? String((response as { code?: unknown }).code)
          : 'bad_request';
      const message =
        typeof response === 'object' && response !== null && 'message' in response
          ? Array.isArray((response as { message?: unknown }).message)
            ? String((response as { message?: unknown[] }).message?.[0] ?? error.message)
            : String((response as { message?: unknown }).message)
          : error.message;
      return {
        id,
        success: false,
        code,
        message,
      };
    }
    return {
      id,
      success: false,
      code: 'unknown_error',
      message: error instanceof Error ? error.message : 'unknown error',
    };
  }

  private aggregateBatchResult(items: BatchItemResult[]): ToolConfirmationBatchResult {
    const succeeded = items.filter((item) => item.success).length;
    const failed = items.length - succeeded;
    return {
      total: items.length,
      succeeded,
      failed,
      items,
    };
  }

  private async executeTool(
    toolName: string,
    payload?: Record<string, any>,
  ): Promise<{ success: boolean; result?: Record<string, any>; error?: string }> {
    const handlers: Record<string, (input?: Record<string, any>) => Promise<Record<string, any>>> = {
      'feishu.send_message': async input => {
        const { recipientId, message, userId, chatId } = input ?? {};
        const result = await this.feishuClient.sendTextMessage(
          userId ?? '',
          recipientId ?? '',
          message ?? '',
          chatId,
        );

        // 记录事件（fire-and-forget，失败不影响主流程）
        if (result.success) {
          const messageId = result.messageId ?? generateUlid();
          try {
            await this.actionTracking.recordMessageSent({
              userId: userId ?? '',
              suggestionId: input?.suggestionId ?? 'manual',
              messageId,
              recipientId: recipientId ?? '',
              recipientType: input?.recipientType ?? 'contact',
              channel: 'feishu',
              contentPreview: message?.substring(0, 100) ?? '',
            });
          } catch (error) {
            this.logger.warn(
              `Failed to record message sent event: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }

        return {
          provider: 'feishu',
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId,
          error: result.error,
        };
      },
      send_feishu_message: async input => {
        // 兼容旧版本的工具名称
        const { recipientId, message, userId, chatId } = input ?? {};
        const result = await this.feishuClient.sendTextMessage(
          userId ?? '',
          recipientId ?? '',
          message ?? '',
          chatId,
        );

        // 记录事件（fire-and-forget，失败不影响主流程）
        if (result.success) {
          const messageId = result.messageId ?? generateUlid();
          try {
            await this.actionTracking.recordMessageSent({
              userId: userId ?? '',
              suggestionId: input?.suggestionId ?? 'manual',
              messageId,
              recipientId: recipientId ?? '',
              recipientType: input?.recipientType ?? 'contact',
              channel: 'feishu',
              contentPreview: message?.substring(0, 100) ?? '',
            });
          } catch (error) {
            this.logger.warn(
              `Failed to record message sent event: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }

        return {
          provider: 'feishu',
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId,
          error: result.error,
        };
      },
    };

    const handler = handlers[toolName];
    if (!handler) {
      return {
        success: true,
        result: {
          executed: false,
          toolName,
          payload: payload ?? null,
          message: 'Tool handler not implemented yet.',
        },
      };
    }

    try {
      const result = await handler(payload);
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }
}
