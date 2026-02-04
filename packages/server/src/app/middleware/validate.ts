import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '@/app/errors/ApiError';

export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params
  });
  if (!result.success) {
    throw new ApiError(400, 'Validation error', result.error.flatten());
  }
  const data = result.data as { body?: any; query?: any; params?: any };
  req.body = data.body ?? req.body;
  req.query = data.query ?? req.query;
  req.params = data.params ?? req.params;
  next();
};
