import { ApiError } from '@/app/errors/ApiError';
import {
  createJournalEntry,
  linkJournalEntryContact,
  createExtractedItem,
  listExtractedItems,
  updateExtractedItem,
  markJournalProcessed
} from '@/infrastructure/repositories/journalRepo';
import { createActionItem, createEvent, createFact, createToolTask } from '@/infrastructure/repositories/contextRepo';
import { AiProvider, ExtractedItem } from '@/infrastructure/ai/provider';
import { embedText } from '@/infrastructure/ai/embeddings';
import { upsertEmbedding } from '@/infrastructure/repositories/embeddingRepo';
import { getContact } from '@/infrastructure/repositories/contactRepo';

export const createJournalEntryUseCase = async (data: {
  id?: string;
  workspaceId: string;
  authorId: string;
  rawText: string;
  createdAt?: Date;
  contactIds?: string[];
}) => {
  const entry = await createJournalEntry({
    id: data.id,
    workspaceId: data.workspaceId,
    authorId: data.authorId,
    rawText: data.rawText,
    createdAt: data.createdAt
  });

  // Best-effort embedding for semantic retrieval.
  try {
    const vector = await embedText(data.rawText);
    await upsertEmbedding({ scope: 'journal_entry', refId: entry.id, vector });
  } catch {
    // ignore embedding failures in MVP
  }

  if (data.contactIds?.length) {
    for (const contactId of data.contactIds) {
      await linkJournalEntryContact(entry.id, contactId, 0.8);
    }
  }
  return entry;
};

export const extractJournalItemsUseCase = async (journalEntryId: string, journalText: string, ai: AiProvider) => {
  const extracted = await ai.extract(journalText);
  const created: ExtractedItem[] = [];
  for (const item of extracted) {
    const saved = await createExtractedItem(journalEntryId, item.type, item.payload);
    created.push({ type: saved.type, payload: saved.payload_json });
  }
  return created;
};

export const listExtractedItemsUseCase = async (journalEntryId: string) => {
  return listExtractedItems(journalEntryId);
};

export const confirmExtractedItemUseCase = async (data: {
  workspaceId: string;
  journalEntryId: string;
  itemId: string;
  action: 'confirm' | 'reject' | 'edit';
  payload?: Record<string, unknown>;
  contactId?: string;
}) => {
  const updated = await updateExtractedItem(
    data.itemId,
    data.journalEntryId,
    data.action === 'reject' ? 'rejected' : 'confirmed',
    data.payload
  );

  if (!updated) {
    throw new ApiError(404, 'Extracted item not found');
  }

  if (data.action === 'reject') {
    return updated;
  }

  const payload = updated.payload_json as Record<string, unknown>;
  const contactId = data.contactId ?? (payload.contactId as string | undefined);
  if (!contactId) {
    throw new ApiError(400, 'contactId is required to confirm item');
  }

  // Prevent cross-tenant writes even if the LLM hallucinated a contactId.
  const contact = await getContact(data.workspaceId, contactId);
  if (!contact) {
    throw new ApiError(404, 'Contact not found');
  }

  // Ensure the source journal entry is linked to the contact for retrieval.
  await linkJournalEntryContact(updated.journal_entry_id, contactId, 0.9);

  if (updated.type === 'event') {
    await createEvent({
      contactId,
      occurredAt: new Date((payload.occurredAt as string) ?? Date.now()),
      summary: String(payload.summary ?? 'event'),
      sourceEntryId: updated.journal_entry_id
    });
  }
  if (updated.type === 'fact') {
    await createFact({
      contactId,
      key: String(payload.key ?? 'note'),
      value: String(payload.value ?? ''),
      confidence: Number(payload.confidence ?? 0.6),
      sourceEntryId: updated.journal_entry_id
    });
  }
  if (updated.type === 'action') {
    const action = await createActionItem({
      contactId,
      dueAt: payload.dueAt ? new Date(String(payload.dueAt)) : null,
      suggestionReason: String(payload.title ?? payload.suggestionReason ?? 'action'),
      sourceEntryId: updated.journal_entry_id
    });

    const toolTask = payload.toolTask as
      | { type?: unknown; payload?: unknown; executeAt?: unknown }
      | undefined;
    if (toolTask?.type && toolTask.payload) {
      await createToolTask({
        actionItemId: action.id,
        type: String(toolTask.type),
        payload: toolTask.payload,
        executeAt: toolTask.executeAt ? new Date(String(toolTask.executeAt)) : null,
        status: 'pending'
      });
    }
  }

  await markJournalProcessed(updated.journal_entry_id);
  return updated;
};
