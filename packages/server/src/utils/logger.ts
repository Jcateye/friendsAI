/**
 * 统一日志工具
 * 所有日志输出都带有 ISO 时间戳和结构化格式
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

/**
 * 获取东八区时间字符串
 */
const getLocalTimestamp = (): string => {
  const now = new Date();
  // 东八区偏移 +8 小时
  const offset = 8 * 60 * 60 * 1000;
  const localTime = new Date(now.getTime() + offset);
  return localTime.toISOString().replace('Z', '+08:00');
};

const formatLog = (level: LogLevel, message: string, context?: LogContext): string => {
  return JSON.stringify({
    timestamp: getLocalTimestamp(),
    level,
    msg: message,
    ...context
  });
};

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (process.env.LOG_LEVEL === 'debug') {
      // eslint-disable-next-line no-console
      console.log(formatLog('debug', message, context));
    }
  },

  info: (message: string, context?: LogContext) => {
    // eslint-disable-next-line no-console
    console.log(formatLog('info', message, context));
  },

  warn: (message: string, context?: LogContext) => {
    // eslint-disable-next-line no-console
    console.warn(formatLog('warn', message, context));
  },

  error: (message: string, context?: LogContext) => {
    // eslint-disable-next-line no-console
    console.error(formatLog('error', message, context));
  }
};

/**
 * 安全序列化对象，处理循环引用和不可序列化的值
 */
export const safeStringify = (obj: unknown): string => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    if (typeof value === 'function') {
      return '[Function]';
    }
    if (typeof value === 'undefined') {
      return null;
    }
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
};

/**
 * 确保对象可以安全地序列化为 JSON（用于数据库 JSONB 字段）
 */
export const ensureSerializable = <T>(obj: T): T => {
  if (obj === null || obj === undefined) {
    return {} as T;
  }
  try {
    // 通过序列化和反序列化来确保对象是可序列化的
    return JSON.parse(safeStringify(obj));
  } catch {
    logger.warn('Failed to serialize object, returning empty object', { originalType: typeof obj });
    return {} as T;
  }
};
