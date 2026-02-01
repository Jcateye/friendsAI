import express from 'express';
import cors from 'cors';
import { errorHandler } from '@/app/middleware/errorHandler';
import { requestLogger } from '@/app/middleware/requestLogger';
import { router } from '@/presentation/http/router';

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(requestLogger);
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/v1', router);
  app.use(errorHandler);

  return app;
};
