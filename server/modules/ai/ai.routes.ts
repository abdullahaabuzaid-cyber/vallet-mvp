import { Router } from 'express';
import { requireRole } from '../../middleware/auth.ts';
import { bad, str } from '../../utils/http.ts';
import { getDamage, runDamage } from './damage.service.ts';
import { forecast } from './forecast.service.ts';
import { fraudSignals } from './fraud.rules.ts';
import { answer, SUGGESTIONS } from './assistant.service.ts';
import { damageProvider } from './damage.providers.ts';
import { env } from '../../config/env.ts';
export const aiRouter = Router();
aiRouter.get('/visits/:id/damage', requireRole('driver', 'staff', 'operator', 'gov'), async (req, res) => res.json(await getDamage(String(req.params.id), req.user!)));
aiRouter.post('/visits/:id/damage', requireRole('staff', 'operator', 'gov'), async (req, res) => res.json(await runDamage(String(req.params.id), req.user!)));
aiRouter.get('/ai/forecast', requireRole('operator', 'gov'), async (req, res) => res.json(await forecast(req.user!, str(req.query.siteId, 40) || undefined, str(req.query.operatorId, 40) || undefined)));
aiRouter.get('/ai/fraud', requireRole('operator', 'gov'), async (req, res) => {
  const items = await fraudSignals(req.user!.role === 'operator' ? req.user!.operatorId : str(req.query.operatorId, 40) || null);
  const kind = str(req.query.kind, 30), text = str(req.query.q, 80);
  res.json({ items: items.filter((s) => (!kind || s.kind === kind) && (!text || (s.title + s.detail).includes(text))) });
});
aiRouter.get('/ai/status', requireRole('operator', 'gov'), (_req, res) => res.json({
  damage: { provider: damageProvider().name, demo: damageProvider().demo, label: damageProvider().label },
  assistant: { provider: env.ai.assistantProvider || 'faq', configured: !!env.ai.assistantKey },
  forecast: { provider: 'statistical', demo: false }, fraud: { provider: 'rules', demo: false },
}));
const hits = new Map<string, number[]>();
aiRouter.get('/assistant', (_req, res) => res.json({ suggestions: SUGGESTIONS }));
aiRouter.post('/assistant', (req, res) => {
  const ip = req.ip || 'x', recent = (hits.get(ip) || []).filter((t) => Date.now() - t < 60_000);
  if (recent.length >= 30) throw bad('رسائل كثيرة؛ انتظر دقيقة', 429);
  hits.set(ip, [...recent, Date.now()]);
  const message = str(req.body?.message, 500);
  if (!message) throw bad('اكتب سؤالك');
  res.json(answer(message));
});
