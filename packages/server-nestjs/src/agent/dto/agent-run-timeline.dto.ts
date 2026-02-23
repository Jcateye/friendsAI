import { ApiProperty } from '@nestjs/swagger';

export class AgentRunTimelineItemDto {
  @ApiProperty({ example: 1, description: '时序事件序号（同一 run 内递增）' })
  seq!: number;

  @ApiProperty({ example: 'tool.state', description: '事件类型（对应 SSE event）' })
  event!: string;

  @ApiProperty({ example: '2026-02-22T09:00:00.000Z', description: '服务端记录时间（ISO 8601）' })
  at!: string;

  @ApiProperty({
    description: '事件数据负载（与流式事件 data 字段同构）',
    additionalProperties: true,
    type: 'object',
  })
  payload!: Record<string, unknown>;
}

export class AgentRunTimelineResponseDto {
  @ApiProperty({ example: '01JXYZABCDEF', description: '运行 ID' })
  runId!: string;

  @ApiProperty({ example: 'chat_conversation', description: 'Agent ID（如果可解析）', required: false })
  agentId?: string;

  @ApiProperty({ example: 'running', description: '运行状态' })
  status!: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

  @ApiProperty({ example: '2026-02-22T09:00:00.000Z', description: 'run 开始时间（ISO 8601）' })
  startedAt!: string;

  @ApiProperty({
    example: '2026-02-22T09:00:03.000Z',
    description: 'run 结束时间（ISO 8601，未结束时为空）',
    required: false,
  })
  endedAt?: string;

  @ApiProperty({
    type: [AgentRunTimelineItemDto],
    description: '完整时序事件数组（按 seq 升序），用于前端可视化“思维链+工具链”过程',
  })
  events!: AgentRunTimelineItemDto[];
}
