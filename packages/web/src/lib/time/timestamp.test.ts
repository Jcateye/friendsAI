import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { formatTimestamp, formatRelativeTime, resolveEpochMs, toEpochMs } from './timestamp';

describe('timestamp utils', () => {
  describe('toEpochMs', () => {
    it('returns epoch milliseconds for Date, number, numeric string and ISO string', () => {
      expect(toEpochMs(new Date('2026-02-07T10:00:00.123Z'))).toBe(1770458400123);
      expect(toEpochMs(1770458400123)).toBe(1770458400123);
      expect(toEpochMs('1770458400123')).toBe(1770458400123);
      expect(toEpochMs('2026-02-07T10:00:00.123Z')).toBe(1770458400123);
    });

    it('returns null for empty or invalid values', () => {
      expect(toEpochMs(null)).toBeNull();
      expect(toEpochMs(undefined)).toBeNull();
      expect(toEpochMs('')).toBeNull();
      expect(toEpochMs('  ')).toBeNull();
      expect(toEpochMs('invalid-date')).toBeNull();
    });
  });

  describe('resolveEpochMs', () => {
    it('returns first valid candidate in order', () => {
      expect(resolveEpochMs(undefined, null, 'invalid', '1770458400123')).toBe(1770458400123);
      expect(resolveEpochMs(undefined, '2026-02-07T10:00:00.123Z', 1770458400999)).toBe(1770458400123);
    });

    it('returns null if all candidates are invalid', () => {
      expect(resolveEpochMs(undefined, null, 'invalid')).toBeNull();
    });
  });

  describe('formatTimestamp', () => {
    it('uses fallback for invalid value', () => {
      expect(formatTimestamp('invalid', { fallback: 'N/A' })).toBe('N/A');
    });

    it('formats valid timestamp', () => {
      const formatted = formatTimestamp(1770458400000, {
        locale: 'en-US',
        formatOptions: { timeZone: 'UTC' },
      });
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted).not.toBe('-');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      // 固定时间为 2026-02-08 14:00:00 UTC (周日)
      vi.setSystemTime(new Date('2026-02-08T14:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "-" for invalid value', () => {
      expect(formatRelativeTime(null)).toBe('-');
      expect(formatRelativeTime(undefined)).toBe('-');
      expect(formatRelativeTime('invalid')).toBe('-');
    });

    it('returns "刚刚" for less than 1 minute', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 30 * 1000)).toBe('刚刚');
      expect(formatRelativeTime(now - 59 * 1000)).toBe('刚刚');
    });

    it('returns "X分钟前" for less than 1 hour', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 1 * 60 * 1000)).toBe('1分钟前');
      expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe('5分钟前');
      expect(formatRelativeTime(now - 30 * 60 * 1000)).toBe('30分钟前');
      expect(formatRelativeTime(now - 59 * 60 * 1000)).toBe('59分钟前');
    });

    it('returns "X小时前" for today', () => {
      const now = Date.now(); // 2026-02-08 14:00:00
      expect(formatRelativeTime(now - 1 * 60 * 60 * 1000)).toBe('1小时前');
      expect(formatRelativeTime(now - 3 * 60 * 60 * 1000)).toBe('3小时前');
      expect(formatRelativeTime(now - 10 * 60 * 60 * 1000)).toBe('10小时前');
    });

    it('returns "昨天" for yesterday', () => {
      // 2026-02-07 10:30:00
      const yesterday = new Date('2026-02-07T10:30:00.000Z').getTime();
      expect(formatRelativeTime(yesterday)).toBe('昨天');
    });

    it('returns "前天" for day before yesterday', () => {
      // 2026-02-06 10:30:00
      const dayBeforeYesterday = new Date('2026-02-06T10:30:00.000Z').getTime();
      expect(formatRelativeTime(dayBeforeYesterday)).toBe('前天');
    });

    it('returns "X天前" for 3-6 days ago', () => {
      // 2026-02-05, 2026-02-03, 2026-02-02 (分别是3天前、5天前、6天前)
      expect(formatRelativeTime(new Date('2026-02-05T14:00:00.000Z').getTime())).toBe('3天前');
      expect(formatRelativeTime(new Date('2026-02-03T14:00:00.000Z').getTime())).toBe('5天前');
      expect(formatRelativeTime(new Date('2026-02-02T14:00:00.000Z').getTime())).toBe('6天前');
    });

    it('returns "X周前" for 1-4 weeks ago', () => {
      // 2026-02-01 (1周前), 2026-01-25 (2周前), 2026-01-18 (3周前)
      expect(formatRelativeTime(new Date('2026-02-01T14:00:00.000Z').getTime())).toBe('1周前');
      expect(formatRelativeTime(new Date('2026-01-25T14:00:00.000Z').getTime())).toBe('2周前');
      expect(formatRelativeTime(new Date('2026-01-18T14:00:00.000Z').getTime())).toBe('3周前');
    });

    it('returns "YYYY-MM-DD" for over a month ago', () => {
      // 2026-01-04 (35天前), 2025-12-10 (60天前)
      const result1 = formatRelativeTime(new Date('2026-01-04T14:00:00.000Z').getTime());
      expect(result1).toBe('2026-01-04');

      const result2 = formatRelativeTime(new Date('2025-12-10T14:00:00.000Z').getTime());
      expect(result2).toBe('2025-12-10');

      const result3 = formatRelativeTime(new Date('2025-02-08T14:00:00.000Z').getTime());
      expect(result3).toBe('2025-02-08');
    });
  });
});
