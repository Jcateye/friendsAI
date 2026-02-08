import type { z } from 'zod';
import type { AgentId } from './agent-definition.types';

/**
 * 运行时上下文
 * 用于模板渲染的变量集合
 */
export type RuntimeContext = Record<string, unknown>;

/**
 * 模板渲染结果
 */
export interface RenderResult {
  /** 渲染后的系统提示 */
  system: string;
  /** 渲染后的用户提示 */
  user: string;
  /** 渲染过程中的警告（如缺失变量） */
  warnings: Array<{
    /** 变量路径（如 'contact.company'） */
    path: string;
    /** 警告消息 */
    message: string;
  }>;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 验证错误（如果验证失败） */
  errors?: z.ZodError;
}

/**
 * 记忆上下文
 * 用于构建 Agent 的记忆/历史消息
 */
export interface MemoryContext {
  /** 历史消息列表 */
  messages?: Array<{
    role: string;
    content: string;
    [key: string]: unknown;
  }>;
  /** 其他记忆相关数据 */
  [key: string]: unknown;
}

/**
 * Agent 运行请求
 * 用于统一入口 /v1/agent/run
 */
export interface AgentRunRequest {
  /** Agent ID */
  agentId: AgentId;
  /** 用户输入 */
  input?: string;
  /** 运行时上下文变量 */
  context?: RuntimeContext;
  /** 用户 ID */
  userId?: string;
  /** 会话 ID */
  sessionId?: string;
  /** 对话 ID */
  conversationId?: string;
  /** 模型配置 */
  model?: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大 token 数 */
  maxTokens?: number;
  /** 其他配置 */
  [key: string]: unknown;
}

