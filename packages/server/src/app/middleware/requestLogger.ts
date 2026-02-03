import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '@/utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();

  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('http_request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs
    });
  });

  next();
};

