import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ActionOutcomeLog } from '../v3-entities/action-outcome-log.entity';
import type {
  SuggestionShownInput,
  SuggestionAcceptedInput,
  MessageSentInput,
  MessageRepliedInput,
  FollowupCompletedInput,
} from './action-tracking.types';

/**
 * 事件追踪服务
 * 将 Agent 事件写入 friendsai_v3_gpt 数据库的 action_outcome_log 表
 *
 * 采用 fire-and-forget 模式：事件写入失败时记录日志但不抛出异常
 */
@Injectable()
export class ActionTrackingService {
  private readonly logger = new Logger(ActionTrackingService.name);

  /** 事件类型到 action_outcome_log.action_type 的映射 */
  private static readonly ACTION_TYPE_MAP = {
    shown: 'suggestion_shown',
    accepted: 'suggestion_accepted',
    sent: 'message_sent',
    replied: 'message_replied',
    followup_completed: 'followup_completed',
  } as const;

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * 记录建议展示事件
   * 当 Agent 建议展示给用户时调用
   */
  async recordSuggestionShown(input: SuggestionShownInput): Promise<void> {
    await this.safeSave({
      userId: input.userId,
      contactId: null,
      agentName: input.agentId,
      actionType: ActionTrackingService.ACTION_TYPE_MAP.shown,
      actionMetadata: {
        suggestionId: input.suggestionId,
        suggestionType: input.suggestionType,
        content: input.content,
      },
      outcomeType: 'pending',
      outcomeReason: null,
      actionTimestamp: new Date(),
      responseTimeSeconds: null,
      platform: 'web',
      messageId: null,
      conversationId: null,
      suggestionId: input.suggestionId,
      followupRequired: false,
      followupDeadline: null,
      conversionScore: null,
      metadata: {
        eventCategory: 'agent_suggestion',
      },
    });
  }

  /**
   * 记录建议采纳事件
   * 当用户点击采纳建议时调用
   */
  async recordSuggestionAccepted(input: SuggestionAcceptedInput): Promise<void> {
    await this.safeSave({
      userId: input.userId,
      contactId: null,
      agentName: 'system',
      actionType: ActionTrackingService.ACTION_TYPE_MAP.accepted,
      actionMetadata: {
        suggestionId: input.suggestionId,
      },
      outcomeType: 'success',
      outcomeReason: 'user_accepted',
      actionTimestamp: new Date(),
      responseTimeSeconds: null,
      platform: 'web',
      messageId: null,
      conversationId: null,
      suggestionId: input.suggestionId,
      followupRequired: false,
      followupDeadline: null,
      conversionScore: null,
      metadata: {
        eventCategory: 'agent_suggestion',
      },
    });
  }

  /**
   * 记录消息发送事件
   * 当用户发送消息时调用
   */
  async recordMessageSent(input: MessageSentInput): Promise<void> {
    await this.safeSave({
      userId: input.userId,
      contactId: input.recipientType === 'contact' ? input.recipientId : null,
      agentName: 'system',
      actionType: ActionTrackingService.ACTION_TYPE_MAP.sent,
      actionMetadata: {
        suggestionId: input.suggestionId,
        messageId: input.messageId,
        recipientId: input.recipientId,
        recipientType: input.recipientType,
        channel: input.channel,
        contentPreview: input.contentPreview,
      },
      outcomeType: 'success',
      outcomeReason: 'message_sent',
      actionTimestamp: new Date(),
      responseTimeSeconds: null,
      platform: this.mapChannelToPlatform(input.channel),
      messageId: input.messageId,
      conversationId: null,
      suggestionId: input.suggestionId,
      followupRequired: true,
      followupDeadline: null,
      conversionScore: null,
      metadata: {
        eventCategory: 'agent_message',
        recipientType: input.recipientType,
      },
    });
  }

  /**
   * 记录消息回复事件
   * 当收到消息回复时调用
   */
  async recordMessageReplied(input: MessageRepliedInput): Promise<void> {
    // 先查找原始消息发送事件，获取相关信息
    const originalEvent = await this.findMessageSentEvent(input.messageSentId);

    await this.safeSave({
      userId: originalEvent?.userId ?? '',
      contactId: originalEvent?.contactId ?? null,
      agentName: originalEvent?.agentName ?? 'system',
      actionType: ActionTrackingService.ACTION_TYPE_MAP.replied,
      actionMetadata: {
        messageSentId: input.messageSentId,
        replyPreview: input.replyPreview,
      },
      outcomeType: 'success',
      outcomeReason: 'message_replied',
      actionTimestamp: new Date(),
      responseTimeSeconds: this.calculateResponseTime(originalEvent),
      platform: originalEvent?.platform ?? 'other',
      messageId: originalEvent?.messageId ?? null,
      conversationId: originalEvent?.conversationId ?? null,
      suggestionId: originalEvent?.suggestionId ?? null,
      followupRequired: false,
      followupDeadline: null,
      conversionScore: 1.0,
      metadata: {
        eventCategory: 'agent_message',
        originalMessageSentId: input.messageSentId,
      },
    });
  }

  /**
   * 记录后续跟进完成事件
   * 当用户完成后续跟进行动时调用
   */
  async recordFollowupCompleted(input: FollowupCompletedInput): Promise<void> {
    await this.safeSave({
      userId: input.userId,
      contactId: null,
      agentName: 'system',
      actionType: ActionTrackingService.ACTION_TYPE_MAP.followup_completed,
      actionMetadata: {
        suggestionId: input.suggestionId,
        completionType: input.completionType,
      },
      outcomeType: input.completionType === 'auto' ? 'success' : 'partial',
      outcomeReason: input.completionType === 'auto' ? 'auto_followup' : 'manual_followup',
      actionTimestamp: new Date(),
      responseTimeSeconds: null,
      platform: 'web',
      messageId: null,
      conversationId: null,
      suggestionId: input.suggestionId,
      followupRequired: false,
      followupDeadline: null,
      conversionScore: input.completionType === 'auto' ? 0.8 : 1.0,
      metadata: {
        eventCategory: 'agent_followup',
        completionType: input.completionType,
      },
    });
  }

  /**
   * 安全保存事件到数据库
   * 失败时记录日志但不抛出异常（fire-and-forget 模式）
   */
  private async safeSave(data: Partial<ActionOutcomeLog>): Promise<void> {
    try {
      const repository = this.dataSource.getRepository(ActionOutcomeLog);
      const entity = repository.create(data);
      await repository.save(entity);
    } catch (error) {
      this.logger.error(
        `Failed to save action tracking event: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 查找消息发送事件
   */
  private async findMessageSentEvent(messageId: string): Promise<ActionOutcomeLog | null> {
    try {
      const repository = this.dataSource.getRepository(ActionOutcomeLog);
      return await repository.findOne({
        where: { messageId, actionType: ActionTrackingService.ACTION_TYPE_MAP.sent },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to find message sent event: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * 计算响应时间（秒）
   */
  private calculateResponseTime(originalEvent: ActionOutcomeLog | null): number | null {
    if (!originalEvent?.actionTimestamp) {
      return null;
    }
    const now = Date.now();
    const originalTime = originalEvent.actionTimestamp instanceof Date
      ? originalEvent.actionTimestamp.getTime()
      : new Date(originalEvent.actionTimestamp).getTime();
    return Math.floor((now - originalTime) / 1000);
  }

  /**
   * 映射渠道到平台类型
   */
  private mapChannelToPlatform(channel: string): 'feishu' | 'wechat' | 'email' | 'web' | 'other' {
    const platformMap: Record<string, 'feishu' | 'wechat' | 'email' | 'web' | 'other'> = {
      feishu: 'feishu',
      wechat: 'wechat',
      manual: 'web',
    };
    return platformMap[channel] ?? 'other';
  }

  /**
   * 查询事件列表
   */
  async getEvents(
    userId: string,
    eventType?: string,
    limit: number = 10,
  ): Promise<{
    events: Array<{
      id: string;
      eventType: string;
      eventData: Record<string, unknown>;
      createdAt: Date;
    }>;
    total: number;
  }> {
    try {
      const repository = this.dataSource.getRepository(ActionOutcomeLog);

      // 构建查询条件
      const where: Record<string, unknown> = { userId };
      if (eventType) {
        const actionType = ActionTrackingService.ACTION_TYPE_MAP[eventType as keyof typeof ActionTrackingService.ACTION_TYPE_MAP];
        if (actionType) {
          where.actionType = actionType;
        }
      }

      // 查询总数
      const total = await repository.count({ where });

      // 查询事件列表
      const logs = await repository.find({
        where,
        order: { createdAt: 'DESC' },
        take: limit,
      });

      // 转换为返回格式
      const events = logs.map((log) => ({
        id: log.id,
        eventType: log.actionType,
        eventData: (log.actionMetadata as Record<string, unknown>) || {},
        createdAt: log.createdAt,
      }));

      return { events, total };
    } catch (error) {
      this.logger.error(
        `Failed to get events: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { events: [], total: 0 };
    }
  }
}
