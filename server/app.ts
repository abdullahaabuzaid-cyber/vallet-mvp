import express from 'express';
import cookieParser from 'cookie-parser';
import { pool } from './db/pool.ts';
import { attachUser } from './middleware/auth.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { serveSpa } from './middleware/spa.ts';
import { apiRouter } from './routes.ts';

/** Builds the Express app: middleware → /health → /api → web app → error handler. */
export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(attachUser);

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('select 1');
      res.type('text').send('ok');
    } catch {
      res.status(503).type('text').send('db down');
    }
  });

  app.use('/api', apiRouter);
  serveSpa(app);
  app.use(errorHandler);
  return app;
}
