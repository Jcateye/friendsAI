import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReconcileRuntimeDto {
  @ApiPropertyOptional({ description: '目标 tenantId，默认当前登录用户' })
  tenantId?: string;

  @ApiPropertyOptional({ enum: ['local', 'openclaw'], default: 'local' })
  engine?: 'local' | 'openclaw';

  @ApiPropertyOptional({ description: 'Agent scope，默认当前登录用户' })
  agentScope?: string;

  @ApiPropertyOptional({ description: '可选能力过滤' })
  capability?: string;
}

export class ReconcileRuntimeResponseDto {
  @ApiProperty({ enum: ['applied', 'failed', 'skipped'] })
  status: 'applied' | 'failed' | 'skipped';

  @ApiPropertyOptional()
  message?: string;

  @ApiProperty({
    description: 'runtime plan',
    additionalProperties: true,
  })
  plan: Record<string, unknown>;
}
