import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ActionTrackingService } from './action-tracking.service';
import { WeeklyReportService } from './weekly-report.service';
import type { AgentEventType } from './action-tracking.types';
import type { WeeklyMetrics } from './action-tracking.types';

/**
 * 追踪事件响应 DTO
 */
interface TrackEventResponseDto {
  success: boolean;
  message?: string;
}

/**
 * 每周指标响应 DTO
 */
interface WeeklyMetricsResponseDto extends WeeklyMetrics {}

/**
 * 记录事件请求 DTO
 */
interface RecordEventBody {
  eventType: AgentEventType;
  eventData: Record<string, unknown>;
}

@ApiTags('actions')
@ApiBearerAuth()
@Controller()
export class ActionTrackingController {
  constructor(
    private readonly actionTrackingService: ActionTrackingService,
    private readonly weeklyReportService: WeeklyReportService,
  ) {}

  @Post('actions/track')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '记录事件',
    description: '记录 Agent 建议的用户行为事件，用于追踪转化率',
  })
  @ApiResponse({
    status: 200,
    description: '事件记录成功',
    type: Object,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async trackEvent(
    @Request() req: any,
    @Body() recordEventBody: RecordEventBody,
  ): Promise<TrackEventResponseDto> {
    const userId = req.user?.id || req.headers['x-user-id'];
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const { eventType, eventData } = recordEventBody;

    // 根据事件类型调用相应的服务方法
    switch (eventType) {
      case 'shown':
        await this.actionTrackingService.recordSuggestionShown({
          userId,
          agentId: (eventData.agentId as string) ?? '',
          suggestionId: (eventData.suggestionId as string) ?? '',
          suggestionType: (eventData.suggestionType as string) ?? '',
          content: (eventData.content as Record<string, unknown>) ?? {},
        });
        break;

      case 'accepted':
        await this.actionTrackingService.recordSuggestionAccepted({
          userId,
          suggestionId: (eventData.suggestionId as string) ?? '',
        });
        break;

      case 'sent':
        await this.actionTrackingService.recordMessageSent({
          userId,
          suggestionId: (eventData.suggestionId as string) ?? '',
          messageId: (eventData.messageId as string) ?? '',
          recipientId: (eventData.recipientId as string) ?? '',
          recipientType: (eventData.recipientType as 'contact' | 'group') ?? 'contact',
          channel: (eventData.channel as 'feishu' | 'wechat' | 'manual') ?? 'manual',
          contentPreview: (eventData.contentPreview as string) ?? '',
        });
        break;

      case 'replied':
        await this.actionTrackingService.recordMessageReplied({
          messageSentId: (eventData.messageSentId as string) ?? '',
          replyPreview: eventData.replyPreview as string | undefined,
        });
        break;

      case 'followup_completed':
        await this.actionTrackingService.recordFollowupCompleted({
          userId,
          suggestionId: (eventData.suggestionId as string) ?? '',
          completionType: (eventData.completionType as 'manual' | 'auto') ?? 'manual',
        });
        break;

      default:
        return {
          success: false,
          message: `Unknown event type: ${eventType}`,
        };
    }

    return {
      success: true,
      message: 'Event recorded successfully',
    };
  }

  @Get('metrics/weekly')
  @ApiOperation({
    summary: '查询每周指标',
    description: '获取用户行为的每周转化率指标',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: '统计天数，默认 7 天',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: '成功返回每周指标',
    type: Object,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async getWeeklyMetrics(
    @Request() req: any,
    @Query('days') days: number = 7,
  ): Promise<WeeklyMetricsResponseDto> {
    const userId = req.user?.id || req.headers['x-user-id'];
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return this.weeklyReportService.getMetrics(userId, days);
  }

  @Get('metrics/events')
  @ApiOperation({
    summary: '查询事件列表',
    description: '获取用户的事件记录列表',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    type: String,
    description: '事件类型筛选 (shown/accepted/sent/replied/followup_completed)',
    enum: ['shown', 'accepted', 'sent', 'replied', 'followup_completed'],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '返回数量限制，默认 10',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: '成功返回事件列表',
    type: Object,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async getEvents(
    @Request() req: any,
    @Query('eventType') eventType?: string,
    @Query('limit') limit: number = 10,
  ): Promise<{
    events: Array<{
      id: string;
      eventType: string;
      eventData: Record<string, unknown>;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const userId = req.user?.id || req.headers['x-user-id'];
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return this.actionTrackingService.getEvents(userId, eventType, limit);
  }
}
