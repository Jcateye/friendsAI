import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();

  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      level: 'info',
      msg: 'http_request',
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs
    }));
  });

  next();
};

