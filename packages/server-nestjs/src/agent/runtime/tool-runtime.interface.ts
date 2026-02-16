import type { AgentDefinition } from '../contracts/agent-definition.types';

/**
 * Tool Runtime 接口
 * 负责根据 Agent 定义过滤可用工具
 */
export interface IToolRuntime {
  /**
   * 根据 Agent 定义过滤工具列表
   * @param definition Agent 定义
   * @param availableTools 所有可用工具列表
   * @returns 过滤后的工具列表
   */
  filterTools(definition: AgentDefinition, availableTools: string[]): string[];
}




