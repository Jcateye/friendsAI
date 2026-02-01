import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/app/middleware/requireAuth';
import { requireWorkspaceMember } from '@/app/middleware/requireWorkspaceMember';
import { asyncHandler } from '@/app/middleware/asyncHandler';
import { validate } from '@/app/middleware/validate';
import { getWorkspaceId } from '@/presentation/http/utils/workspace';
import { confirmToolTaskForWorkspace, listToolExecutionsForWorkspace, listToolTasksForWorkspace } from '@/infrastructure/repositories/contextRepo';

export const toolTasksRouter = Router();

const listSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'confirmed', 'running', 'done', 'failed', 'all']).optional(),
    limit: z.string().optional()
  })
});

const confirmSchema = z.object({
  body: z.object({})
});

toolTasksRouter.get('/', requireAuth, asyncHandler(requireWorkspaceMember), validate(listSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const status = req.query.status ? String(req.query.status) : 'pending';
  const items = await listToolTasksForWorkspace(workspaceId, { status, limit: Number.isFinite(limit) ? limit : 50 });
  res.json({ items });
}));

toolTasksRouter.post('/:id/confirm', requireAuth, asyncHandler(requireWorkspaceMember), validate(confirmSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const updated = await confirmToolTaskForWorkspace(workspaceId, req.params.id);
  if (!updated) {
    return res.status(404).json({ message: 'Tool task not found' });
  }
  res.json(updated);
}));

toolTasksRouter.get('/:id/executions', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const items = await listToolExecutionsForWorkspace(workspaceId, req.params.id);
  res.json({ items });
}));
