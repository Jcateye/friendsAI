import { appendChangeLog, listChangesSince, updateSyncState } from '@/infrastructure/repositories/syncRepo';
import { createContact, softDeleteContact } from '@/infrastructure/repositories/contactRepo';
import { createJournalEntry, softDeleteJournalEntry } from '@/infrastructure/repositories/journalRepo';
import { createActionItem } from '@/infrastructure/repositories/contextRepo';
import { withTransaction } from '@/infrastructure/db/transaction';

interface SyncChange {
  entity: string;
  op: 'upsert' | 'delete';
  data: Record<string, unknown>;
  clientChangeId?: string;
}

export const syncPushUseCase = async (workspaceId: string, userId: string, clientId: string, changes: SyncChange[]) => {
  for (const change of changes) {
    const entityId = String(change.data.id ?? '');
    if (!entityId) {
      continue;
    }
    await withTransaction(async (tx) => {
      let version = Number(change.data.version ?? 1);

      // Idempotency: if clientChangeId is provided, skip if already processed.
      if (change.clientChangeId) {
        const logged = await appendChangeLog({
          workspaceId,
          clientId,
          clientChangeId: change.clientChangeId,
          entity: change.entity,
          entityId,
          op: change.op,
          payload: change.data,
          version
        }, tx);
        if (!logged) {
          return;
        }
      }

      if (change.entity === 'contact' && change.op === 'upsert') {
        const payload = change.data as any;
        await createContact(
          workspaceId,
          {
            id: entityId,
            name: payload.name ?? payload.raw?.name ?? '联系人',
            avatarUrl: payload.avatar_url ?? payload.avatarUrl,
            notes: payload.notes,
            status: payload.status,
            clientId,
            clientChangeId: change.clientChangeId
          },
          tx
        );
        version += 1;
      }

      if (change.entity === 'contact' && change.op === 'delete') {
        await softDeleteContact(workspaceId, entityId, tx);
        version += 1;
      }

      if (change.entity === 'journal_entry' && change.op === 'upsert') {
        const payload = change.data as any;
        await createJournalEntry({
          id: entityId,
          workspaceId,
          authorId: userId,
          rawText: payload.raw_text ?? payload.rawText ?? '',
          createdAt: payload.created_at ? new Date(payload.created_at) : undefined,
          clientId,
          clientChangeId: change.clientChangeId
        }, tx);
        version += 1;
      }

      if (change.entity === 'journal_entry' && change.op === 'delete') {
        await softDeleteJournalEntry(workspaceId, entityId, tx);
        version += 1;
      }

      if (change.entity === 'action_item' && change.op === 'upsert') {
        const payload = change.data as any;
        const contactId = payload.contact_id ?? payload.contactId;
        const sourceEntryId = payload.source_entry_id ?? payload.sourceEntryId;
        if (contactId && sourceEntryId) {
          await createActionItem({
            id: entityId,
            contactId,
            dueAt: payload.due_at ? new Date(payload.due_at) : null,
            suggestionReason: payload.suggestion_reason ?? payload.suggestionReason,
            sourceEntryId
          }, tx);
        }
        version += 1;
      }

      // If clientChangeId was missing, log best-effort (no idempotency).
      if (!change.clientChangeId) {
        await appendChangeLog({
          workspaceId,
          clientId,
          clientChangeId: undefined,
          entity: change.entity,
          entityId,
          op: change.op,
          payload: change.data,
          version
        }, tx);
      }
    });
  }

  await updateSyncState({ workspaceId, userId, clientId, lastCursor: new Date().toISOString() });
};

export const syncPullUseCase = async (workspaceId: string, cursor?: string) => {
  const changes = await listChangesSince(workspaceId, cursor);
  const last = changes[changes.length - 1];
  const nextCursor = last ? `${last.created_at}|${last.id}` : cursor ?? `${new Date().toISOString()}|00000000-0000-0000-0000-000000000000`;
  return { changes, nextCursor };
};
