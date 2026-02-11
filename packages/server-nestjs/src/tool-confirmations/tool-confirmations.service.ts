import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class ToolConfirmationsService {
  private readonly logger = new Logger(ToolConfirmationsService.name);

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

  async confirm(id: string, payloadOverrides?: Record<string, any>): Promise<ToolConfirmation> {
    const confirmation = await this.findOne(id);

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

  async reject(id: string, reason?: string): Promise<ToolConfirmation> {
    const confirmation = await this.findOne(id);

    if (confirmation.status !== 'pending') {
      throw new BadRequestException(`Tool confirmation ${id} is already ${confirmation.status}`);
    }

    confirmation.status = 'rejected';
    confirmation.rejectedAt = new Date();
    confirmation.error = reason ?? null;

    return this.toolConfirmationRepository.save(confirmation);
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
