import { NextFunction, Request, Response } from 'express';
import { ApiError } from '@/app/errors/ApiError';
import { findMemberByUser } from '@/infrastructure/repositories/workspaceRepo';
import { getWorkspaceId } from '@/presentation/http/utils/workspace';

export const requireWorkspaceMember = async (req: Request, _res: Response, next: NextFunction) => {
  const workspaceId = getWorkspaceId(req);
  const auth = req.auth!;
  const userId = auth.userId;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }
  const member = await findMemberByUser(workspaceId, userId);
  if (!member) {
    throw new ApiError(403, 'Forbidden');
  }
  req.auth = { ...auth, workspaceId };
  next();
};
