export type TimestampLike = number | string | Date | null | undefined;

const NUMERIC_STRING_PATTERN = /^-?\d+(\.\d+)?$/;

export function toEpochMs(value: TimestampLike): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return null;
    }

    if (NUMERIC_STRING_PATTERN.test(text)) {
      const numericValue = Number(text);
      return Number.isFinite(numericValue) ? Math.trunc(numericValue) : null;
    }

    const timestamp = new Date(text).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  return null;
}

export function resolveEpochMs(...candidates: TimestampLike[]): number | null {
  for (const candidate of candidates) {
    const timestamp = toEpochMs(candidate);
    if (timestamp !== null) {
      return timestamp;
    }
  }

  return null;
}

interface FormatTimestampOptions {
  locale?: string;
  fallback?: string;
  formatOptions?: Intl.DateTimeFormatOptions;
}

export function formatTimestamp(
  value: TimestampLike,
  options: FormatTimestampOptions = {},
): string {
  const timestamp = toEpochMs(value);
  if (timestamp === null) {
    return options.fallback ?? '-';
  }

  return new Date(timestamp).toLocaleString(options.locale, options.formatOptions);
}

/**
 * 格式化相对时间
 * - 1分钟内: "刚刚"
 * - 1小时内: "X分钟前"
 * - 今天内: "X小时前"
 * - 昨天: "昨天"
 * - 前天: "前天"
 * - 3-6天前: "X天前"
 * - 1周到1个月内: "X周前"
 * - 超过1个月: "YYYY-MM-DD"
 */
export function formatRelativeTime(value: TimestampLike): string {
  const timestamp = toEpochMs(value);
  if (timestamp === null) {
    return '-';
  }

  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const date = new Date(timestamp);
  const today = new Date(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBeforeYesterday = new Date(today);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

  // 重置时间为00:00:00进行比较
  const resetTime = (d: Date) => {
    const result = new Date(d);
    result.setHours(0, 0, 0, 0);
    return result.getTime();
  };

  const todayStart = resetTime(today);
  const yesterdayStart = resetTime(yesterday);
  const dayBeforeYesterdayStart = resetTime(dayBeforeYesterday);
  const dateStart = resetTime(date);

  // 1分钟内
  if (diffMinutes < 1) {
    return '刚刚';
  }

  // 1小时内
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  }

  // 今天内
  if (dateStart === todayStart) {
    return `${diffHours}小时前`;
  }

  // 昨天
  if (dateStart === yesterdayStart) {
    return '昨天';
  }

  // 前天
  if (dateStart === dayBeforeYesterdayStart) {
    return '前天';
  }

  // 3-6天前
  if (diffDays < 7) {
    return `${diffDays}天前`;
  }

  // 1周到4周内
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}周前`;
  }

  // 超过1个月，显示日期格式 YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
