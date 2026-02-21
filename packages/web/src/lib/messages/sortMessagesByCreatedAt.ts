import { resolveEpochMs } from '../time/timestamp';

export interface ChatMessageLike {
  id: string;
  role: string;
  content: unknown;
  createdAt?: Date | string;
  createdAtMs?: number | string | Date | null;
}

function resolveMessageTimestamp(message: ChatMessageLike): number | null {
  const messageWithMs = message as ChatMessageLike;

  return resolveEpochMs(messageWithMs.createdAtMs, message.createdAt);
}

/**
 * 按 createdAt 升序排序消息。
 *
 * 当时间戳相同（或缺失）时，保持原始顺序，避免因随机 ID 导致重排。
 */
export function sortMessagesByCreatedAt<TMessage extends ChatMessageLike>(messages: TMessage[]): TMessage[] {
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
