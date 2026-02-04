import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/app/middleware/requireAuth';
import { requireWorkspaceMember } from '@/app/middleware/requireWorkspaceMember';
import { asyncHandler } from '@/app/middleware/asyncHandler';
import { validate } from '@/app/middleware/validate';
import { getWorkspaceId } from '@/presentation/http/utils/workspace';
import { syncPullUseCase, syncPushUseCase } from '@/application/usecases/syncUsecases';
import { getSyncState } from '@/infrastructure/repositories/syncRepo';

export const syncRouter = Router();

const pushSchema = z.object({
  body: z.object({
    clientId: z.string(),
    changes: z.array(
      z.object({
        entity: z.string(),
        op: z.enum(['upsert', 'delete']),
        data: z.record(z.string(), z.unknown()),
        clientChangeId: z.string().optional()
      })
    )
  })
});

syncRouter.post('/push', requireAuth, asyncHandler(requireWorkspaceMember), validate(pushSchema), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  await syncPushUseCase(workspaceId, req.auth!.userId, req.body.clientId, req.body.changes);
  res.json({ status: 'ok' });
}));

syncRouter.get('/pull', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const result = await syncPullUseCase(workspaceId, cursor);
  res.json(result);
}));

syncRouter.get('/state', requireAuth, asyncHandler(requireWorkspaceMember), asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const clientId = String(req.query.clientId ?? '');
  const state = await getSyncState(workspaceId, req.auth!.userId, clientId);
  res.json(state ?? null);
}));
