import { Router } from 'express';
import { sseHandler } from './sse.ts';

export const realtimeRouter = Router();

realtimeRouter.get('/events', sseHandler);
