import { Injectable, Logger } from '@nestjs/common';
import type { AgentDefinition } from '../contracts/agent-definition.types';
import type { IToolRuntime } from './tool-runtime.interface';

/**
 * Tool Runtime 实现
 * 根据 Agent 定义过滤可用工具列表
 */
@Injectable()
export class ToolRuntime implements IToolRuntime {
  private readonly logger = new Logger(ToolRuntime.name);

  /**
   * 根据 Agent 定义过滤工具列表
   */
  filterTools(definition: AgentDefinition, availableTools: string[]): string[] {
    const toolsConfig = definition.tools;

    if (!toolsConfig) {
      // 未配置工具策略，返回空列表
      return [];
    }

    // 根据模式过滤
    switch (toolsConfig.mode) {
      case 'none':
        return [];

      case 'allowlist': {
        const allowedTools = toolsConfig.allowedTools || [];
        const filtered = availableTools.filter((tool) => allowedTools.includes(tool));

        // 检查是否有请求的工具不在可用列表中
        const missingTools = allowedTools.filter((tool) => !availableTools.includes(tool));
        if (missingTools.length > 0) {
          this.logger.warn(
            `Requested tools not available: ${missingTools.join(', ')}`,
          );
        }

        return filtered;
      }

      case 'denylist': {
        const deniedTools = toolsConfig.allowedTools || []; // 注意：denylist 模式下 allowedTools 实际是禁止列表
        return availableTools.filter((tool) => !deniedTools.includes(tool));
      }

      default:
        this.logger.warn(`Unknown tools mode: ${toolsConfig.mode}, returning empty list`);
        return [];
    }
  }
}
