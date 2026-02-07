import { describe, expect, it } from 'vitest';
import { formatTimestamp, resolveEpochMs, toEpochMs } from './timestamp';

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
});
