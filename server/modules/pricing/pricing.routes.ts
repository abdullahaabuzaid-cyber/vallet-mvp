import { Router } from 'express';
import { requireRole } from '../../middleware/auth.ts';
import { str } from '../../utils/http.ts';
import { createRule, listRules, quote, setRule } from './pricing.service.ts';
export const pricingRouter = Router();
pricingRouter.get('/pricing/quote', async (req, res) => res.json(await quote(str(req.query.siteId, 40))));
pricingRouter.get('/pricing/rules', requireRole('operator'), async (req, res) => res.json({ items: await listRules(req.user!) }));
pricingRouter.post('/pricing/rules', requireRole('operator'), async (req, res) => res.json(await createRule(req.user!, req.body)));
pricingRouter.post('/pricing/rules/:id', requireRole('operator'), async (req, res) =>
  res.json(await setRule(req.user!, Number(req.params.id), req.body?.delete ? 'delete' : !!req.body?.active)));
