import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ApiError } from '@/app/errors/ApiError';
import { env } from '@/config/env';
import { createUser, createSession, findSession, findUserByEmailOrPhone, findUserById, revokeSession } from '@/infrastructure/repositories/userRepo';
import { addMember, createWorkspace, listWorkspacesForUser } from '@/infrastructure/repositories/workspaceRepo';

export const registerUseCase = async (data: { email?: string; phone?: string; name: string; password: string }) => {
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await createUser({
    email: data.email,
    phone: data.phone,
    name: data.name,
    passwordHash
  });
  const workspace = await createWorkspace(`${data.name}'s workspace`);
  await addMember(workspace.id, user.id, 'owner');
  const tokens = await issueTokens(user.id, workspace.id);
  return { user, workspace, ...tokens };
};

export const loginUseCase = async (data: { emailOrPhone: string; password: string }) => {
  const user = await findUserByEmailOrPhone(data.emailOrPhone);
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }
  const ok = await bcrypt.compare(data.password, user.password_hash);
  if (!ok) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const workspaces = await listWorkspacesForUser(user.id);
  const workspace = workspaces[0];
  const tokens = await issueTokens(user.id, workspace?.id);
  return { user, workspace, ...tokens };
};

const issueTokens = async (userId: string, workspaceId?: string) => {
  const accessToken = jwt.sign(
    { userId, workspaceId },
    env.jwtSecret,
    { expiresIn: env.jwtAccessTtlSec, issuer: env.jwtIssuer }
  );

  const refreshToken = jwt.sign(
    { userId },
    env.jwtSecret,
    { expiresIn: env.jwtRefreshTtlSec, issuer: env.jwtIssuer }
  );

  await createSession({
    userId,
    refreshToken,
    expiresAt: new Date(Date.now() + env.jwtRefreshTtlSec * 1000)
  });

  return { accessToken, refreshToken };
};

export const refreshUseCase = async (refreshToken: string) => {
  const session = await findSession(refreshToken);
  if (!session || session.revoked_at) {
    throw new ApiError(401, 'Invalid session');
  }
  const payload = jwt.verify(refreshToken, env.jwtSecret, { issuer: env.jwtIssuer }) as { userId: string };
  const user = await findUserById(payload.userId);
  if (!user) {
    throw new ApiError(401, 'Invalid session');
  }
  const workspaces = await listWorkspacesForUser(user.id);
  const workspace = workspaces[0];
  const tokens = await issueTokens(user.id, workspace?.id);
  return { user, workspace, ...tokens };
};

export const logoutUseCase = async (refreshToken: string) => {
  await revokeSession(refreshToken);
};
