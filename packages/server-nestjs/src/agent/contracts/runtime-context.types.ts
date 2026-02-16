/**
 * 运行时上下文类型定义
 */

/**
 * 模板渲染结果
 */
export interface RenderResult {
  /** 渲染后的系统提示 */
  systemPrompt: string;
  /** 渲染后的用户提示 */
  userPrompt: string;
  /** 渲染过程中的警告（如缺失变量） */
  warnings: string[];
}

/**
 * 运行时上下文
 * 用于模板渲染的上下文数据
 */
export interface RuntimeContext {
  [key: string]: unknown;
}

/**
 * 输出校验结果
 */
export interface ValidationResult {
  /** 是否通过校验 */
  valid: boolean;
  /** 校验错误列表 */
  errors: ValidationError[];
}

/**
 * 校验错误
 */
export interface ValidationError {
  /** 错误路径 */
  path: string;
  /** 错误消息 */
  message: string;
}




