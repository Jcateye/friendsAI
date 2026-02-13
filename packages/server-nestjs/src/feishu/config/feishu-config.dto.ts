import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 飞书配置 DTO
 *
 * 用于配置管理相关的数据传输
 */
export class SaveConfigDto {
  /**
   * Bitable 应用 token
   */
  @ApiProperty({ description: 'Bitable 应用 token' })
  appToken: string;

  /**
   * Bitable 数据表 ID
   */
  @ApiProperty({ description: 'Bitable 数据表 ID' })
  tableId: string;

  /**
   * Webhook URL（外部接收回调的地址）
   */
  @ApiProperty({ description: 'Webhook URL（外部接收回调的地址）' })
  webhookUrl: string;

  /**
   * 是否启用此配置
   */
  @ApiPropertyOptional({ description: '是否启用此配置', default: true })
  enabled?: boolean;
}

/**
 * 飞书配置响应
 */
export class FeishuConfigResponse {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '响应消息' })
  message: string;

  @ApiPropertyOptional({
    description: '配置数据',
    type: 'object',
    properties: {
      appToken: { type: 'string', nullable: true },
      tableId: { type: 'string', nullable: true },
      webhookUrl: { type: 'string', nullable: true },
      enabled: { type: 'boolean' },
    },
  })
  data?: {
    appToken: string | null;
    tableId: string | null;
    webhookUrl: string | null;
    enabled: boolean;
  };
}
