import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/app/middleware/requireAuth';
import { asyncHandler } from '@/app/middleware/asyncHandler';
import { validate } from '@/app/middleware/validate';
import { createWorkspace, listWorkspacesForUser, addMember, updateMemberRole, findMemberByUser } from '@/infrastructure/repositories/workspaceRepo';
import { findUserByEmailOrPhone } from '@/infrastructure/repositories/userRepo';
import { ApiError } from '@/app/errors/ApiError';

export const workspaceRouter = Router();

const createSchema = z.object({
  body: z.object({
    name: z.string().min(1)
  })
});

const inviteSchema = z.object({
  body: z.object({
    emailOrPhone: z.string().min(3),
    role: z.string().optional()
  })
});

const memberUpdateSchema = z.object({
  body: z.object({
    role: z.string().min(1)
  })
});

workspaceRouter.post('/', requireAuth, validate(createSchema), asyncHandler(async (req, res) => {
  const workspace = await createWorkspace(req.body.name);
  await addMember(workspace.id, req.auth!.userId, 'owner');
  res.json(workspace);
}));

workspaceRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const workspaces = await listWorkspacesForUser(req.auth!.userId);
  res.json({ items: workspaces });
}));

workspaceRouter.post('/:id/invite', requireAuth, validate(inviteSchema), asyncHandler(async (req, res) => {
  const requester = await findMemberByUser(req.params.id, req.auth!.userId);
  if (!requester) {
    throw new ApiError(403, 'Forbidden');
  }
  if (requester.role !== 'owner') {
    throw new ApiError(403, 'Owner role required');
  }
  const user = await findUserByEmailOrPhone(req.body.emailOrPhone);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  const member = await addMember(req.params.id, user.id, req.body.role ?? 'member');
  res.json(member);
}));

workspaceRouter.patch('/:id/members/:memberId', requireAuth, validate(memberUpdateSchema), asyncHandler(async (req, res) => {
  const requester = await findMemberByUser(req.params.id, req.auth!.userId);
  if (!requester) {
    throw new ApiError(403, 'Forbidden');
  }
  if (requester.role !== 'owner') {
    throw new ApiError(403, 'Owner role required');
  }
  const member = await updateMemberRole(req.params.id, req.params.memberId, req.body.role);
  res.json(member);
}));
