import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/app/middleware/requireAuth';
import { requireWorkspaceMember } from '@/app/middleware/requireWorkspaceMember';
import { validate } from '@/app/middleware/validate';
import { asyncHandler } from '@/app/middleware/asyncHandler';
import { getWorkspaceId } from '@/presentation/http/utils/workspace';
import { getAiProvider } from '@/infrastructure/ai';
import { getJournalEntry, listJournalEntries } from '@/infrastructure/repositories/journalRepo';
import { getContact } from '@/infrastructure/repositories/contactRepo';
import {
  createJournalEntryUseCase,
  extractJournalItemsUseCase,
  listExtractedItemsUseCase,
  confirmExtractedItemUseCase
} from '@/application/usecases/journalUsecases';

export const journalRouter = Router();

const createSchema = z.object({
  body: z.object({
    id: z.string().uuid().optional(),
    contactIds: z.array(z.string()).optional(),
    rawText: z.string().min(1),
    createdAt: z.string().optional()
  })
});

const extractSchema = z.object({
  body: z.object({
    mode: z.enum(['fast', 'full']).optional()
  })
});

const confirmSchema = z.object({
  body: z.object({
    itemId: z.string(),
    action: z.enum(['confirm', 'reject', 'edit']),
    payloadJson: z.record(z.string(), z.unknown()).optional(),
    contactId: z.string().optional()
  })
});

journalRouter.post('/', requireAuth, asyncHandler(requireWorkspaceMember), validate(createSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const entry = await createJournalEntryUseCase({
    id: req.body.id,
    workspaceId,
    authorId: req.auth!.userId,
    rawText: req.body.rawText,
    createdAt: req.body.createdAt ? new Date(req.body.createdAt) : undefined,
    contactIds: req.body.contactIds
  });
  res.json(entry);
}));

journalRouter.get('/', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const items = await listJournalEntries(workspaceId);
  res.json({ items });
}));

journalRouter.get('/:id', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const item = await getJournalEntry(workspaceId, req.params.id);
  res.json(item);
}));

journalRouter.post('/:id/extract', requireAuth, asyncHandler(requireWorkspaceMember), validate(extractSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const entry = await getJournalEntry(workspaceId, req.params.id);
  const ai = getAiProvider();
  const items = await extractJournalItemsUseCase(entry.id, entry.raw_text, ai);
  res.json({ items });
}));

journalRouter.get('/:id/extract', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  await getJournalEntry(workspaceId, req.params.id);
  const items = await listExtractedItemsUseCase(req.params.id);
  res.json({ items });
}));

journalRouter.post('/:id/confirm', requireAuth, asyncHandler(requireWorkspaceMember), validate(confirmSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  await getJournalEntry(workspaceId, req.params.id);
  if (req.body.contactId) {
    const contact = await getContact(workspaceId, req.body.contactId);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
  }
  const result = await confirmExtractedItemUseCase({
    workspaceId,
    journalEntryId: req.params.id,
    itemId: req.body.itemId,
    action: req.body.action,
    payload: req.body.payloadJson,
    contactId: req.body.contactId
  });
  res.json(result);
}));
