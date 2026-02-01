import { queryOne, query } from '@/infrastructure/db/query';

export interface UserRecord {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  password_hash: string;
  settings: unknown;
}

export interface AuthSessionRecord {
  id: string;
  user_id: string;
  refresh_token: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export const findUserByEmailOrPhone = async (emailOrPhone: string) => {
  return queryOne<UserRecord>(
    `SELECT * FROM app_user WHERE (email = $1 OR phone = $1) AND deleted_at IS NULL`,
    [emailOrPhone]
  );
};

export const findUserById = async (id: string) => {
  return queryOne<UserRecord>(
    `SELECT * FROM app_user WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
};

export const createUser = async (data: { email?: string; phone?: string; name: string; passwordHash: string }) => {
  return queryOne<UserRecord>(
    `INSERT INTO app_user (email, phone, name, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.email ?? null, data.phone ?? null, data.name, data.passwordHash]
  );
};

export const createSession = async (data: { userId: string; refreshToken: string; expiresAt: Date }) => {
  return queryOne(
    `INSERT INTO auth_session (user_id, refresh_token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [data.userId, data.refreshToken, data.expiresAt]
  );
};

export const revokeSession = async (refreshToken: string) => {
  await query(
    `UPDATE auth_session SET revoked_at = now() WHERE refresh_token = $1`,
    [refreshToken]
  );
};

export const findSession = async (refreshToken: string) => {
  return queryOne<AuthSessionRecord>(
    `SELECT * FROM auth_session WHERE refresh_token = $1`,
    [refreshToken]
  );
};
