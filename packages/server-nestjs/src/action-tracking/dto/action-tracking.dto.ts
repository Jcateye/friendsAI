import { ApiProperty } from '@nestjs/swagger';

/**
 * 建议展示事件 DTO
 * 当 Agent 建议展示给用户时记录
 */
export class SuggestionShownDto {
  @ApiProperty({ description: '用户 ID' })
  userId: string;

  @ApiProperty({ description: 'Agent ID' })
  agentId: string;

  @ApiProperty({ description: '建议 ID' })
  suggestionId: string;

  @ApiProperty({ description: '建议类型' })
  suggestionType: string;

  @ApiProperty({ description: '建议内容', type: Object })
  content: Record<string, unknown>;
}

/**
 * 建议采纳事件 DTO
 * 当用户点击采纳建议时记录
 */
export class SuggestionAcceptedDto {
  @ApiProperty({ description: '用户 ID' })
  userId: string;

  @ApiProperty({ description: '建议 ID' })
  suggestionId: string;
}

/**
 * 消息发送事件 DTO
 * 当用户发送消息时记录
 */
export class MessageSentDto {
  @ApiProperty({ description: '用户 ID' })
  userId: string;

  @ApiProperty({ description: '建议 ID' })
  suggestionId: string;

  @ApiProperty({ description: '消息 ID' })
  messageId: string;

  @ApiProperty({ description: '接收者 ID' })
  recipientId: string;

  @ApiProperty({
    description: '接收者类型',
    enum: ['contact', 'group'],
  })
  recipientType: 'contact' | 'group';

  @ApiProperty({
    description: '发送渠道',
    enum: ['feishu', 'wechat', 'manual'],
  })
  channel: 'feishu' | 'wechat' | 'manual';

  @ApiProperty({ description: '消息内容预览' })
  contentPreview: string;
}

/**
 * 消息回复事件 DTO
 * 当收到消息回复时记录
 */
export class MessageRepliedDto {
  @ApiProperty({ description: '消息发送事件 ID' })
  messageSentId: string;

  @ApiProperty({ description: '回复内容预览', required: false })
  replyPreview?: string;
}

/**
 * 后续跟进完成事件 DTO
 * 当用户完成后续跟进行动时记录
 */
export class FollowupCompletedDto {
  @ApiProperty({ description: '用户 ID' })
  userId: string;

  @ApiProperty({ description: '建议 ID' })
  suggestionId: string;

  @ApiProperty({
    description: '完成类型',
    enum: ['manual', 'auto'],
  })
  completionType: 'manual' | 'auto';
}

/**
 * 每周指标响应 DTO
 * 用于返回用户行为转化率统计
 */
export class WeeklyMetricsResponseDto {
  @ApiProperty({ description: '采纳率 = 采纳数 / 展示数', example: 0.65 })
  actionCompletionRate: number;

  @ApiProperty({ description: '回复率 = 回复数 / 发送数', example: 0.42 })
  replyRate: number;

  @ApiProperty({ description: '推进率 = 完成跟进数 / 采纳数', example: 0.78 })
  followupRate: number;

  @ApiProperty({ description: '总建议展示数', example: 100 })
  totalSuggestions: number;

  @ApiProperty({ description: '总采纳数', example: 65 })
  totalAccepted: number;

  @ApiProperty({ description: '总发送数', example: 50 })
  totalSent: number;

  @ApiProperty({ description: '总回复数', example: 21 })
  totalReplied: number;
}

/**
 * 事件统计响应 DTO
 * 按事件类型统计结果
 */
export class EventStatisticsResponseDto {
  @ApiProperty({ description: '按事件类型统计', type: Object })
  byType: Partial<Record<'shown' | 'accepted' | 'sent' | 'replied' | 'followup_completed', number>>;

  @ApiProperty({ description: '总事件数', example: 236 })
  total: number;
}

/**
 * 追踪事件响应 DTO
 * 单个事件记录
 */
export class TrackingEventResponseDto {
  @ApiProperty({ description: '事件 ID' })
  id: string;

  @ApiProperty({
    description: '事件类型',
    enum: ['shown', 'accepted', 'sent', 'replied', 'followup_completed'],
  })
  eventType: string;

  @ApiProperty({ description: '用户 ID' })
  userId: string;

  @ApiProperty({ description: '关联的建议 ID' })
  suggestionId: string;

  @ApiProperty({ description: '关联的 Agent ID', required: false })
  agentId?: string;

  @ApiProperty({ description: '事件数据', type: Object })
  eventData: Record<string, unknown>;

  @ApiProperty({ description: '创建时间（毫秒时间戳）', example: 1699999999999 })
  createdAt: number;
}

/**
 * 创建事件响应 DTO
 * 创建事件后返回的确认信息
 */
export class CreateEventResponseDto {
  @ApiProperty({ description: '事件 ID' })
  id: string;

  @ApiProperty({ description: '创建状态', example: 'created' })
  status: string;

  @ApiProperty({ description: '创建时间（毫秒时间戳）', example: 1699999999999 })
  createdAt: number;
}

/**
 * 记录事件请求 DTO
 * 通用事件记录请求
 */
export class TrackEventRequestDto {
  @ApiProperty({
    description: '事件类型',
    enum: ['shown', 'accepted', 'sent', 'replied', 'followup_completed'],
  })
  eventType: string;

  @ApiProperty({ description: '事件数据', type: Object })
  eventData: Record<string, unknown>;
}

/**
 * 记录事件响应 DTO
 */
export class TrackEventResponseDto {
  @ApiProperty({ description: '操作状态', example: true })
  success: boolean;

  @ApiProperty({ description: '事件 ID' })
  eventId: string;
}

/**
 * 事件列表响应 DTO
 */
export class EventsListResponseDto {
  @ApiProperty({ description: '事件列表', type: [TrackingEventResponseDto] })
  events: TrackingEventResponseDto[];

  @ApiProperty({ description: '总数量', example: 100 })
  total: number;
}
