import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ButtonClickDto {
  @ApiProperty({ description: '请求时间戳（毫秒）' })
  timestamp: string;

  @ApiProperty({ description: '飞书签名字符串' })
  token: string;

  @ApiProperty({ description: 'Bitable 应用 token' })
  appToken: string;

  @ApiPropertyOptional({ description: 'Bitable 应用 token（snake_case 兼容）' })
  app_token?: string;

  @ApiProperty({ description: 'Bitable 数据表 ID' })
  tableId: string;

  @ApiPropertyOptional({ description: 'Bitable 数据表 ID（snake_case 兼容）' })
  table_id?: string;

  @ApiProperty({ description: '记录 ID' })
  recordId: string;

  @ApiPropertyOptional({ description: '记录 ID（snake_case 兼容）' })
  record_id?: string;

  @ApiPropertyOptional({ description: '按钮 ID' })
  buttonId?: string;

  @ApiPropertyOptional({ description: '按钮 ID（snake_case 兼容）' })
  button_id?: string;

  @ApiProperty({ description: '飞书用户 ID' })
  userId: string;

  @ApiPropertyOptional({ description: '飞书用户 ID（snake_case 兼容）' })
  user_id?: string;

  @ApiPropertyOptional({ description: '视图 ID' })
  viewId?: string;

  @ApiPropertyOptional({ description: '视图 ID（snake_case 兼容）' })
  view_id?: string;

  @ApiPropertyOptional({ description: '自动化透传的扩展数据' })
  extraData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '自动化透传的扩展数据（snake_case 兼容）' })
  extra_data?: Record<string, unknown>;
}

export class ButtonClickResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      recordId: { type: 'string' },
      status: { type: 'string' },
      result: { type: 'object', nullable: true, additionalProperties: true },
    },
  })
  data?: {
    recordId?: string;
    status?: 'received' | 'processing' | 'completed' | 'failed';
    result?: Record<string, unknown>;
  };
}

export class ButtonClickErrorResponse {
  @ApiProperty({ default: false })
  success: false;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  error?: string;
}
