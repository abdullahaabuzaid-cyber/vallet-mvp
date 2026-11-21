import { Router } from 'express';
import { requireRole } from '../../middleware/auth.ts';
import { capacityBoard } from './capacity.service.ts';
export const capacityRouter = Router();
capacityRouter.get('/capacity', requireRole('operator', 'staff', 'gov'), async (req, res) => res.json({ items: await capacityBoard(req.user!) }));
