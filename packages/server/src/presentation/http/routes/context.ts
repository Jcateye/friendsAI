import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/app/middleware/requireAuth';
import { requireWorkspaceMember } from '@/app/middleware/requireWorkspaceMember';
import { asyncHandler } from '@/app/middleware/asyncHandler';
import { validate } from '@/app/middleware/validate';
import { buildContactContextUseCase, generateBriefUseCase } from '@/application/usecases/contextUsecases';
import { getAiProvider } from '@/infrastructure/ai';
import { getLatestBriefSnapshot } from '@/infrastructure/repositories/contextRepo';
import { getContact } from '@/infrastructure/repositories/contactRepo';
import { getWorkspaceId } from '@/presentation/http/utils/workspace';

export const contextRouter = Router();

const briefSchema = z.object({
  body: z.object({
    forceRefresh: z.boolean().optional()
  })
});

contextRouter.get('/:id/context', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const contact = await getContact(workspaceId, req.params.id);
  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }
  const context = await buildContactContextUseCase(req.params.id);
  res.json(context);
}));

contextRouter.get('/:id/brief', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const contact = await getContact(workspaceId, req.params.id);
  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }
  const snapshot = await getLatestBriefSnapshot(req.params.id);
  res.json(snapshot ?? null);
}));

contextRouter.post('/:id/brief', requireAuth, asyncHandler(requireWorkspaceMember), validate(briefSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const contact = await getContact(workspaceId, req.params.id);
  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }
  if (!req.body.forceRefresh) {
    const cached = await getLatestBriefSnapshot(req.params.id);
    if (cached) {
      return res.json(cached);
    }
  }
  const ai = getAiProvider();
  const snapshot = await generateBriefUseCase(req.params.id, ai);
  res.json(snapshot);
}));
