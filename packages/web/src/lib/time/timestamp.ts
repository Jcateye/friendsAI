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
