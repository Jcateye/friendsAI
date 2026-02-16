import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageStatusDto {
  @ApiProperty({ description: '飞书 message_id 或系统侧 messageId' })
  messageId: string;

  @ApiProperty({ description: '投递状态', enum: ['pending', 'sent', 'delivered', 'read', 'failed'] })
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

  @ApiPropertyOptional({ description: '错误码（失败时）' })
  errorCode?: string;

  @ApiPropertyOptional({ description: '错误信息（失败时）' })
  errorMessage?: string;

  @ApiPropertyOptional({ description: '回调时间戳（毫秒）' })
  timestamp?: string;

  @ApiPropertyOptional({ description: '追踪 ID' })
  traceId?: string;

  @ApiPropertyOptional({ description: '透传附加字段' })
  extra?: Record<string, unknown>;
}

export class MessageStatusResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ description: '命中的 deliveryId' })
  deliveryId?: string;
}
