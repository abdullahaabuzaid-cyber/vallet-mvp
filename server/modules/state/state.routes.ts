import { Router } from 'express';
import { buildState } from './state.service.ts';

export const stateRouter = Router();

stateRouter.get('/state', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await buildState(req.user));
});
