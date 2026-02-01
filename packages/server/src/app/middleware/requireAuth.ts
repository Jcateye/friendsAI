import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { ApiError } from '@/app/errors/ApiError';
import { AuthPayload } from '@/types/express';

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Unauthorized');
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret, { issuer: env.jwtIssuer }) as AuthPayload;
    req.auth = payload;
    return next();
  } catch (err) {
    throw new ApiError(401, 'Invalid token');
  }
};
