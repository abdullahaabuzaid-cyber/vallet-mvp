import { Router } from 'express';
import { requireRole } from '../../middleware/auth.ts';
import { listParams } from '../../utils/listQuery.ts';
import { createShift, deleteShift, listShifts, performance } from './shifts.service.ts';
export const shiftsRouter = Router();
shiftsRouter.get('/shifts', requireRole('operator', 'staff'), async (req, res) => res.json({ items: await listShifts(req.user!, listParams(req)) }));
shiftsRouter.post('/shifts', requireRole('operator'), async (req, res) => res.json(await createShift(req.user!, req.body)));
shiftsRouter.post('/shifts/:id/delete', requireRole('operator'), async (req, res) => res.json(await deleteShift(req.user!, Number(req.params.id))));
shiftsRouter.get('/staff-performance', requireRole('operator'), async (req, res) => res.json({ items: await performance(req.user!, listParams(req)) }));
