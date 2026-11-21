import { Router } from 'express';
import { requireRole } from '../../middleware/auth.ts';
import { arrival,prepare } from './arrival.service.ts';
export const arrivalRouter=Router();
arrivalRouter.post('/visits/:id/arrival',requireRole('driver'),async(req,res)=>res.json(await arrival(String(req.params.id),req.user!,req.body?.minutes)));
arrivalRouter.post('/visits/:id/prepare',requireRole('staff','operator'),async(req,res)=>res.json(await prepare(String(req.params.id),req.user!)));
