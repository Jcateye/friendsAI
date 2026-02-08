import type { AgentDefinition } from '../contracts/agent-definition.types';
import type { MemoryContext, RuntimeContext } from '../contracts/runtime.types';

/**
 * Memory Runtime 接口
 * 负责根据 Agent 定义和运行时上下文构建记忆上下文
 */
export interface IMemoryRuntime {
  /**
   * 构建记忆上下文
   * @param definition Agent 定义
   * @param context 运行时上下文
   * @returns 记忆上下文
   */
  buildMemory(
    definition: AgentDefinition,
    context: RuntimeContext
  ): Promise<MemoryContext>;
}



