import { ApiError } from '@/app/errors/ApiError';
import { Request } from 'express';

export const getWorkspaceId = (req: Request) => {
  const header = req.headers['x-workspace-id'];
  // Prefer explicit workspace header to allow users to switch workspace context.
  // Membership is enforced separately by requireWorkspaceMember.
  const workspaceId = (Array.isArray(header) ? header[0] : header) ?? req.auth?.workspaceId;
  if (!workspaceId) {
    throw new ApiError(400, 'workspaceId is required');
  }
  return workspaceId;
};
