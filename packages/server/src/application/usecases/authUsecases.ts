import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ApiError } from '@/app/errors/ApiError';
import { env } from '@/config/env';
import { createUser, createSession, findSession, findUserByEmailOrPhone, findUserById, revokeSession } from '@/infrastructure/repositories/userRepo';
import { addMember, createWorkspace, listWorkspacesForUser } from '@/infrastructure/repositories/workspaceRepo';

export const registerUseCase = async (data: { email?: string; phone?: string; name: string; password?: string; verifyCode?: string }) => {
  const devCode = env.devVerifyCode;
  const canBypass = !!devCode && data.verifyCode === devCode;
  const password = data.password ?? (canBypass ? devCode : undefined);
  if (!password) {
    throw new ApiError(400, 'Password or verifyCode is required');
  }
  const passwordHash = await bcrypt.hash(password, 10);
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

export const loginUseCase = async (data: { emailOrPhone: string; password?: string; verifyCode?: string }) => {
  const devCode = env.devVerifyCode;
  const canBypass = !!devCode && data.verifyCode === devCode;
  let user = await findUserByEmailOrPhone(data.emailOrPhone);
  if (!user) {
    if (!canBypass) {
      throw new ApiError(401, 'Invalid credentials');
    }
    // Dev-only: auto create user + workspace when verifyCode matches.
    const passwordHash = await bcrypt.hash(devCode!, 10);
    const isEmail = data.emailOrPhone.includes('@');
    user = await createUser({
      email: isEmail ? data.emailOrPhone : undefined,
      phone: isEmail ? undefined : data.emailOrPhone,
      name: isEmail ? data.emailOrPhone.split('@')[0] : data.emailOrPhone,
      passwordHash
    });
    const workspace = await createWorkspace(`${user.name}'s workspace`);
    await addMember(workspace.id, user.id, 'owner');
    const tokens = await issueTokens(user.id, workspace.id);
    return { user, workspace, ...tokens };
  }
  if (!canBypass) {
    if (!data.password) {
      throw new ApiError(401, 'Invalid credentials');
    }
    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) {
      throw new ApiError(401, 'Invalid credentials');
    }
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
