import { appendTimestampMsFields } from './timestamp-ms.interceptor';

describe('TimestampMsInterceptor helpers', () => {
  it('adds epoch millisecond fields for Date objects and ISO strings', () => {
    const payload = {
      createdAt: new Date('2026-02-07T10:00:00.000Z'),
      generatedAt: '2026-02-07T11:00:00.000Z',
      nested: {
        eventDate: '2026-02-07T12:00:00.000Z',
      },
    };

    const result = appendTimestampMsFields(payload) as Record<string, any>;

    expect(result.createdAtMs).toBe(1770458400000);
    expect(result.generatedAtMs).toBe(1770462000000);
    expect(result.nested.eventDateMs).toBe(1770465600000);
  });

  it('keeps existing *Ms field untouched', () => {
    const payload = {
      createdAt: '2026-02-07T10:00:00.000Z',
      createdAtMs: 123,
    };

    const result = appendTimestampMsFields(payload) as Record<string, any>;

    expect(result.createdAtMs).toBe(123);
  });

  it('handles arrays and nullable values', () => {
    const payload = [
      { appliedAt: null },
      { discardedAt: '2026-02-07T10:00:00.000Z' },
    ];

    const result = appendTimestampMsFields(payload) as Array<Record<string, any>>;

    expect(result[0].appliedAtMs).toBeNull();
    expect(result[1].discardedAtMs).toBe(1770458400000);
  });
});

