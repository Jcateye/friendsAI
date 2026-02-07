import type { Message as AISDKMessage } from 'ai';
import { resolveEpochMs } from '../time/timestamp';

function resolveMessageTimestamp(message: AISDKMessage): number | null {
  const messageWithMs = message as AISDKMessage & {
    createdAtMs?: number | string | Date | null;
  };

  return resolveEpochMs(messageWithMs.createdAtMs, message.createdAt);
}

/**
 * 按 createdAt 升序排序消息。
 *
 * 当时间戳相同（或缺失）时，保持原始顺序，避免因随机 ID 导致重排。
 */
export function sortMessagesByCreatedAt(messages: AISDKMessage[]): AISDKMessage[] {
  return messages
    .map((message, index) => ({
      message,
      index,
      timestamp: resolveMessageTimestamp(message),
    }))
    .sort((a, b) => {
      if (
        a.timestamp !== null
        && b.timestamp !== null
        && a.timestamp !== b.timestamp
      ) {
        return a.timestamp - b.timestamp;
      }

      return a.index - b.index;
    })
    .map(({ message }) => message);
}
