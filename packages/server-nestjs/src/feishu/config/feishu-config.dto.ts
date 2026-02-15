import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveFeishuConfigDto {
  @ApiPropertyOptional({ description: 'Bitable 应用 token', nullable: true })
  appToken?: string | null;

  @ApiPropertyOptional({ description: 'Bitable 数据表 ID', nullable: true })
  tableId?: string | null;

  @ApiPropertyOptional({ description: '飞书按钮回调 URL', nullable: true })
  webhookUrl?: string | null;

  @ApiPropertyOptional({ description: '是否启用配置', default: true })
  enabled?: boolean;
}

export class FeishuConfigData {
  @ApiPropertyOptional({ nullable: true })
  appToken: string | null;

  @ApiPropertyOptional({ nullable: true })
  tableId: string | null;

  @ApiPropertyOptional({ nullable: true })
  webhookUrl: string | null;

  @ApiProperty()
  enabled: boolean;
}

export class FeishuConfigResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: FeishuConfigData })
  data: FeishuConfigData;
}
