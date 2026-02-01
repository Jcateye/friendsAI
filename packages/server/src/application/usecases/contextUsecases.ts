import crypto from 'crypto';
import {
  listFacts,
  listRecentEvents,
  listOpenActions,
  listSimilarHistory,
  createBriefSnapshot,
  getBriefSnapshotByHash
} from '@/infrastructure/repositories/contextRepo';
import { AiProvider, ContactContext } from '@/infrastructure/ai/provider';
import { embedText } from '@/infrastructure/ai/embeddings';

export const buildContactContextUseCase = async (contactId: string) => {
  const [stableFacts, recentEvents, openActions] = await Promise.all([
    listFacts(contactId),
    listRecentEvents(contactId, 10),
    listOpenActions(contactId)
  ]);

  let similarHistory: any[] = [];
  try {
    const queryText = [
      'Facts:',
      ...stableFacts.map((f: any) => `${f.key}: ${f.value}`),
      '',
      'Recent events:',
      ...recentEvents.map((e: any) => `${e.occurred_at}: ${e.summary}`),
      '',
      'Open actions:',
      ...openActions.map((a: any) => `${a.due_at ?? ''} ${a.suggestion_reason ?? ''}`)
    ].join('\n');
    const vector = await embedText(queryText);
    similarHistory = await listSimilarHistory(contactId, vector, 5);
  } catch {
    similarHistory = [];
  }

  return {
    stableFacts,
    recentEvents,
    openActions,
    similarHistory
  } as ContactContext;
};

export const generateBriefUseCase = async (contactId: string, ai: AiProvider) => {
  const context = await buildContactContextUseCase(contactId);
  const sourceHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(context))
    .digest('hex');

  const cached = await getBriefSnapshotByHash(contactId, sourceHash);
  if (cached) {
    return cached;
  }

  const content = await ai.brief(context);
  const snapshot = await createBriefSnapshot(contactId, content, sourceHash, new Date());
  return snapshot;
};
