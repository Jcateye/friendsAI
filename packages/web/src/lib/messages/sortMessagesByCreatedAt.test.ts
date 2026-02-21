import { describe, expect, it } from 'vitest';
import { sortMessagesByCreatedAt, type ChatMessageLike } from './sortMessagesByCreatedAt';

type MessageWithMs = ChatMessageLike & { createdAtMs?: number };

function buildMessage(input: Partial<MessageWithMs> & Pick<ChatMessageLike, 'id' | 'role' | 'content'>): MessageWithMs {
  return {
    id: input.id,
    role: input.role,
    content: input.content,
    createdAt: input.createdAt,
    createdAtMs: input.createdAtMs,
  } as MessageWithMs;
}

describe('sortMessagesByCreatedAt', () => {
  it('sorts by createdAt ascending when timestamps differ', () => {
    const messages = [
      buildMessage({ id: 'b', role: 'assistant', content: '2', createdAt: new Date('2026-02-07T10:00:01.000Z') }),
      buildMessage({ id: 'a', role: 'user', content: '1', createdAt: new Date('2026-02-07T10:00:00.000Z') }),
    ];

    const sorted = sortMessagesByCreatedAt(messages);
    expect(sorted.map((message) => message.id)).toEqual(['a', 'b']);
  });

  it('prefers createdAtMs when it exists', () => {
    const messages = [
      buildMessage({
        id: 'b',
        role: 'assistant',
        content: 'assistant',
        createdAt: new Date('2026-02-07T10:00:00.000Z'),
        createdAtMs: 1770458402000,
      }),
      buildMessage({
        id: 'a',
        role: 'user',
        content: 'user',
        createdAt: new Date('2026-02-07T09:59:59.000Z'),
        createdAtMs: 1770458401000,
      }),
    ];

    const sorted = sortMessagesByCreatedAt(messages);
    expect(sorted.map((message) => message.id)).toEqual(['a', 'b']);
  });

  it('keeps original order when createdAt is identical', () => {
    const createdAt = new Date('2026-02-07T10:00:00.000Z');
    const messages = [
      buildMessage({ id: 'z', role: 'assistant', content: 'assistant', createdAt }),
      buildMessage({ id: 'a', role: 'user', content: '1', createdAt }),
      buildMessage({ id: 'b', role: 'user', content: '2', createdAt }),
    ];

    const sorted = sortMessagesByCreatedAt(messages);
    expect(sorted.map((message) => message.id)).toEqual(['z', 'a', 'b']);
  });

  it('keeps original order when createdAt is missing or invalid', () => {
    const messages = [
      buildMessage({ id: 'z', role: 'assistant', content: 'assistant', createdAt: 'invalid-date' as any }),
      buildMessage({ id: 'a', role: 'user', content: '1' }),
      buildMessage({ id: 'b', role: 'user', content: '2', createdAt: undefined }),
    ];

    const sorted = sortMessagesByCreatedAt(messages);
    expect(sorted.map((message) => message.id)).toEqual(['z', 'a', 'b']);
  });
});
