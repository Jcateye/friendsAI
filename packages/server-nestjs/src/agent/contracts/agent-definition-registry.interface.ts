import type { AgentDefinitionBundle, AgentId } from './agent-definition.types';

/**
 * Agent 定义注册表接口
 * 负责从文件系统加载和管理 Agent 定义
 */
export interface IAgentDefinitionRegistry {
  /**
   * 加载 Agent 定义 Bundle
   * @param agentId Agent ID
   * @returns Agent 定义 Bundle
   * @throws {AgentDefinitionError} 当定义不存在、模板缺失或 schema 无效时
   */
  loadDefinition(agentId: AgentId): Promise<AgentDefinitionBundle>;

  /**
   * 获取 Agent 定义路径
   * @param agentId Agent ID
   * @returns 定义目录的绝对路径
   */
  getDefinitionPath(agentId: AgentId): string;
}

/**
 * Agent 定义错误
 */
export class AgentDefinitionError extends Error {
  constructor(
    public readonly code: AgentDefinitionErrorCode,
    message: string,
    public readonly agentId?: AgentId,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AgentDefinitionError';
  }
}

/**
 * Agent 定义错误码
 */
export enum AgentDefinitionErrorCode {
  /** Agent 定义不存在 */
  DEFINITION_NOT_FOUND = 'definition_not_found',
  /** 模板文件缺失 */
  DEFINITION_TEMPLATE_MISSING = 'definition_template_missing',
  /** Schema 文件格式无效 */
  DEFINITION_SCHEMA_INVALID = 'definition_schema_invalid',
  /** 输出验证失败 */
  OUTPUT_VALIDATION_FAILED = 'output_validation_failed',
}




