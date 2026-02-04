import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/app/middleware/requireAuth';
import { requireWorkspaceMember } from '@/app/middleware/requireWorkspaceMember';
import { asyncHandler } from '@/app/middleware/asyncHandler';
import { validate } from '@/app/middleware/validate';
import { createActionItemUseCase, executeActionToolUseCase } from '@/application/usecases/actionUsecases';
import { getActionItemForWorkspace, listOpenActions, listOpenActionsForWorkspace, updateActionItemForWorkspace } from '@/infrastructure/repositories/contextRepo';
import { getWorkspaceId } from '@/presentation/http/utils/workspace';
import { getContact } from '@/infrastructure/repositories/contactRepo';
import { getJournalEntry } from '@/infrastructure/repositories/journalRepo';

export const actionRouter = Router();

const createSchema = z.object({
  body: z.object({
    contactId: z.string(),
    dueAt: z.string().optional(),
    suggestionReason: z.string().optional(),
    sourceEntryId: z.string(),
    toolTask: z
      .object({
        type: z.string(),
        payloadJson: z.record(z.string(), z.unknown()),
        executeAt: z.string().optional()
      })
      .optional()
  })
});

const updateSchema = z.object({
  body: z.object({
    status: z.string().optional(),
    dueAt: z.string().optional()
  })
});

const executeSchema = z.object({
  body: z.object({
    type: z.string(),
    payloadJson: z.record(z.string(), z.unknown()),
    executeAt: z.string().optional()
  })
});

actionRouter.post('/', requireAuth, asyncHandler(requireWorkspaceMember), validate(createSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const contact = await getContact(workspaceId, req.body.contactId);
  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }
  await getJournalEntry(workspaceId, req.body.sourceEntryId);
  const action = await createActionItemUseCase({
    contactId: req.body.contactId,
    dueAt: req.body.dueAt ? new Date(req.body.dueAt) : null,
    suggestionReason: req.body.suggestionReason,
    sourceEntryId: req.body.sourceEntryId,
    toolTask: req.body.toolTask
      ? {
          type: req.body.toolTask.type,
          payload: req.body.toolTask.payloadJson,
          executeAt: req.body.toolTask.executeAt ? new Date(req.body.toolTask.executeAt) : null
        }
      : undefined
  });
  res.json(action);
}));

actionRouter.patch('/:id', requireAuth, asyncHandler(requireWorkspaceMember), validate(updateSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const action = await updateActionItemForWorkspace(workspaceId, req.params.id, {
    status: req.body.status,
    dueAt: req.body.dueAt ? new Date(req.body.dueAt) : null
  });
  res.json(action);
}));

actionRouter.post('/:id/execute', requireAuth, asyncHandler(requireWorkspaceMember), validate(executeSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const action = await getActionItemForWorkspace(workspaceId, req.params.id);
  if (!action) {
    return res.status(404).json({ message: 'Action item not found' });
  }
  const task = await executeActionToolUseCase(req.params.id, {
    type: req.body.type,
    payload: req.body.payloadJson,
    executeAt: req.body.executeAt ? new Date(req.body.executeAt) : null
  });
  res.json(task);
}));

actionRouter.get('/', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const contactId = req.query.contactId ? String(req.query.contactId) : undefined;
  if (contactId) {
    const contact = await getContact(workspaceId, contactId);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    const items = await listOpenActions(contactId);
    res.json({ items });
    return;
  }
  const items = await listOpenActionsForWorkspace(workspaceId);
  res.json({ items });
}));
