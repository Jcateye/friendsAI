import type { z } from 'zod';

/**
 * Agent ID 类型
 * 可以是字符串字面量联合类型或普通字符串
 */
export type AgentId = string;

/**
 * Agent 定义接口
 * 描述一个 Agent 的完整配置
 */
export interface AgentDefinition {
  /** Agent 唯一标识符 */
  id: AgentId;
  /** 定义版本 */
  version: string;
  /** 提示词配置 */
  prompt: {
    /** 系统提示模板文件名（相对于 agent 定义目录） */
    systemTemplate: string;
    /** 用户提示模板文件名（相对于 agent 定义目录） */
    userTemplate: string;
    /** 默认值文件（可选，相对于 agent 定义目录） */
    defaultsFile?: string;
  };
  /** 记忆策略配置 */
  memory?: {
    /** 记忆策略类型 */
    strategy?: string;
    /** 最大 token 数 */
    maxTokens?: number;
    /** 其他记忆相关配置 */
    [key: string]: unknown;
  };
  /** 工具策略配置 */
  tools?: {
    /** 工具过滤模式：none（不使用工具）、allowlist 或 denylist */
    mode: 'none' | 'allowlist' | 'denylist';
    /** 允许或禁止的工具列表 */
    allowedTools?: string[];
  };
  /** 验证配置 */
  validation?: {
    /** 输入 schema 文件名（相对于 agent 定义目录，可选） */
    inputSchema?: string;
    /** 输出 schema 文件名（相对于 agent 定义目录） */
    outputSchema?: string;
    /** 输出 schema 文件名（兼容字段名，相对于 agent 定义目录） */
    outputSchemaFile?: string;
  };
  /** 缓存配置 */
  cache?: {
    /** 缓存 TTL（秒） */
    ttl?: number;
    /** 其他缓存相关配置 */
    [key: string]: unknown;
  };
}

/**
 * Agent 定义 Bundle
 * 包含已加载的模板、默认值和 schema
 */
export interface AgentDefinitionBundle {
  /** Agent 定义 */
  definition: AgentDefinition;
  /** 已加载的系统提示模板内容 */
  systemTemplate: string;
  /** 已加载的用户提示模板内容 */
  userTemplate: string;
  /** 从 defaults.json 加载的默认值（可选） */
  defaults?: Record<string, unknown>;
  /** 从 output.schema.json 加载的 JSON Schema 或转换后的 ZodSchema（可选） */
  outputSchema?: z.ZodSchema | Record<string, unknown>;
  /** 从 input.schema.json 加载的 JSON Schema 内容（可选） */
  inputSchema?: Record<string, unknown>;
}

