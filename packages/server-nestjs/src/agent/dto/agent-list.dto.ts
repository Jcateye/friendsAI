import { ApiProperty } from '@nestjs/swagger';

/**
 * Agent 工具配置信息
 */
export class AgentToolInfoDto {
  @ApiProperty({ description: '工具模式：none（不使用工具）、allowlist 或 denylist' })
  mode: 'none' | 'allowlist' | 'denylist';

  @ApiProperty({ description: '允许或禁止的工具列表', type: [String] })
  allowedTools?: string[];
}

/**
 * Agent 缓存配置信息
 */
export class AgentCacheInfoDto {
  @ApiProperty({ description: '缓存 TTL（秒）' })
  ttl?: number;
}

/**
 * Agent 记忆配置信息
 */
export class AgentMemoryInfoDto {
  @ApiProperty({ description: '记忆策略类型' })
  strategy?: string;

  @ApiProperty({ description: '最大 token 数' })
  maxTokens?: number;
}

/**
 * Agent 操作信息
 */
export class AgentOperationDto {
  @ApiProperty({ description: '操作名称' })
  name: string;

  @ApiProperty({ description: '操作描述' })
  description?: string;

  @ApiProperty({ description: '输入字段说明', type: Object })
  inputSchema?: Record<string, unknown>;

  @ApiProperty({ description: '输出字段说明', type: Object })
  outputSchema?: Record<string, unknown>;
}

export class AgentSkillActionDto {
  @ApiProperty({ description: '动作 ID，前端可直接回传到 composer.skillActionId' })
  actionId: string;

  @ApiProperty({ description: '技能 key' })
  skillKey: string;

  @ApiProperty({ description: '操作名' })
  operation: string;

  @ApiProperty({ description: '展示名称' })
  name: string;

  @ApiProperty({ description: '动作描述' })
  description?: string;

  @ApiProperty({ description: '执行映射配置', type: Object })
  run?: {
    agentId: string;
    operation?: string | null;
    inputTemplate?: Record<string, unknown>;
  };

  @ApiProperty({ description: '风险等级' })
  riskLevel?: 'low' | 'medium' | 'high';
}

/**
 * Agent 名片信息
 */
export class AgentInfoDto {
  @ApiProperty({ description: 'Agent 唯一标识符' })
  id: string;

  @ApiProperty({ description: 'Agent 名称' })
  name?: string;

  @ApiProperty({ description: 'Agent 描述' })
  description?: string;

  @ApiProperty({ description: 'Agent 版本' })
  version: string;

  @ApiProperty({ description: 'Agent 状态：available（可用）、unavailable（不可用）' })
  status: 'available' | 'unavailable';

  @ApiProperty({ description: '状态错误信息（当 status 为 unavailable 时）' })
  statusError?: string;

  @ApiProperty({ description: '支持的操作列表（如果有）', type: [AgentOperationDto] })
  operations?: AgentOperationDto[];

  @ApiProperty({ description: '工具配置', type: AgentToolInfoDto })
  tools?: AgentToolInfoDto;

  @ApiProperty({ description: '缓存配置', type: AgentCacheInfoDto })
  cache?: AgentCacheInfoDto;

  @ApiProperty({ description: '记忆配置', type: AgentMemoryInfoDto })
  memory?: AgentMemoryInfoDto;

  @ApiProperty({ description: '输入 Schema（如果有）', type: Object })
  inputSchema?: Record<string, unknown>;

  @ApiProperty({ description: '输出 Schema（如果有）', type: Object })
  outputSchema?: Record<string, unknown>;

  @ApiProperty({ description: '使用说明' })
  usage?: string;

  @ApiProperty({ description: 'API 端点' })
  endpoint?: string;

  @ApiProperty({ description: '可触发的 skills actions', type: [AgentSkillActionDto] })
  skillActions?: AgentSkillActionDto[];
}

/**
 * Agent 列表响应
 */
export class AgentListResponseDto {
  @ApiProperty({ description: 'Agent 列表', type: [AgentInfoDto] })
  agents: AgentInfoDto[];

  @ApiProperty({ description: '总数' })
  total: number;
}
