import { describe, expect, it } from 'vitest';
import { parseVercelAgentCustomDataLine } from './parseVercelAgentStream';

describe('parseVercelAgentCustomDataLine', () => {
  it('parses conversation.created event', () => {
    const result = parseVercelAgentCustomDataLine(
      '2:[{"type":"conversation.created","conversationId":"conv-123"}]',
    );

    expect(result).toEqual({
      conversationId: 'conv-123',
      awaitingTools: [],
    });
  });

  it('parses tool.awaiting_input event', () => {
    const result = parseVercelAgentCustomDataLine(
      '2:[{"type":"tool.awaiting_input","toolCallId":"tool-1","toolName":"send","confirmationId":"conf-1","input":{"to":"alice"}}]',
    );

    expect(result).toEqual({
      conversationId: undefined,
      awaitingTools: [
        {
          toolCallId: 'tool-1',
          toolName: 'send',
          confirmationId: 'conf-1',
          input: { to: 'alice' },
          message: undefined,
        },
      ],
    });
  });

  it('parses mixed custom events from one line', () => {
    const result = parseVercelAgentCustomDataLine(
      '2:[{"type":"conversation.created","conversationId":"conv-9"},{"type":"tool.awaiting_input","toolCallId":"tool-2"}]',
    );

    expect(result).toEqual({
      conversationId: 'conv-9',
      awaitingTools: [
        {
          toolCallId: 'tool-2',
          toolName: undefined,
          confirmationId: undefined,
          input: undefined,
          message: undefined,
        },
      ],
    });
  });

  it('returns null for non-custom line and invalid payload', () => {
    expect(parseVercelAgentCustomDataLine('0:"hello"')).toBeNull();
    expect(parseVercelAgentCustomDataLine('2:bad-json')).toBeNull();
    expect(parseVercelAgentCustomDataLine('2:[{"type":"unknown"}]')).toBeNull();
  });
});
