export type ExtractedItemType = 'event' | 'fact' | 'action';

export interface ExtractedItem {
  type: ExtractedItemType;
  payload: Record<string, unknown>;
}

export interface ContactContext {
  stableFacts: Array<Record<string, unknown>>;
  recentEvents: Array<Record<string, unknown>>;
  openActions: Array<Record<string, unknown>>;
  similarHistory: Array<Record<string, unknown>>;
}

export interface AiProvider {
  extract(journalText: string): Promise<ExtractedItem[]>;
  brief(context: ContactContext): Promise<string>;
}

const parseLine = (line: string): ExtractedItem | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const prefixes: Array<[ExtractedItemType, string[]]> = [
    ['action', ['action:', 'todo:', '待办:', '行动:']],
    ['fact', ['fact:', '事实:']],
    ['event', ['event:', '事件:']]
  ];
  for (const [type, keys] of prefixes) {
    for (const key of keys) {
      if (trimmed.toLowerCase().startsWith(key)) {
        const content = trimmed.slice(key.length).trim();
        if (!content) return null;
        if (type === 'action') {
          return { type, payload: { title: content } };
        }
        if (type === 'fact') {
          const [k, v] = content.split(/[:：]/).map((part) => part.trim());
          if (k && v) {
            return { type, payload: { key: k, value: v, confidence: 0.6 } };
          }
          return { type, payload: { key: 'note', value: content, confidence: 0.5 } };
        }
        return { type, payload: { summary: content, occurredAt: new Date().toISOString() } };
      }
    }
  }
  return null;
};

export class MockAiProvider implements AiProvider {
  async extract(journalText: string): Promise<ExtractedItem[]> {
    const lines = journalText.split(/\r?\n/);
    const items: ExtractedItem[] = [];
    for (const line of lines) {
      const parsed = parseLine(line);
      if (parsed) items.push(parsed);
    }
    return items;
  }

  async brief(context: ContactContext): Promise<string> {
    const lines: string[] = [];
    lines.push(`画像事实 ${context.stableFacts.length} 条`);
    lines.push(`近期事件 ${context.recentEvents.length} 条`);
    lines.push(`待办 ${context.openActions.length} 条`);
    if (context.openActions[0]) {
      const first = context.openActions[0] as any;
      if (first.suggestion_reason) {
        lines.push(`优先关注：${first.suggestion_reason}`);
      }
    }
    return lines.join('\n');
  }
}
