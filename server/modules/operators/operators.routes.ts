import { Router } from 'express';
import { q, q1 } from '../../db/pool.ts';
import { requireRole } from '../../middleware/auth.ts';
import { bad, str } from '../../utils/http.ts';
import { notifyOperator } from '../realtime/notify.ts';
import { publish } from '../realtime/sse.ts';
import { createOperator } from './operators.service.ts';

const OPERATOR_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

export const operatorsRouter = Router();

operatorsRouter.post('/operator/auto-accept', requireRole('operator'), async (req, res) => {
  await q(`update operators set auto_accept = $2 where id = $1`, [req.user!.operatorId, !!req.body?.enabled]);
  notifyOperator(req.user!.operatorId!, { type: 'operator_updated' });
  res.json({ ok: true });
});

/** Mounted under /api/gov (gov-only). */
export const operatorsGovRouter = Router();

operatorsGovRouter.post('/operators', async (req, res) => {
  const opId = await createOperator(req.body || {});
  publish({ gov: true }, { type: 'operator_created' });
  res.json({ operator: { id: opId } });
});

operatorsGovRouter.post('/operators/:id/status', async (req, res) => {
  const status = str(req.body?.status, 20);
  if (!OPERATOR_STATUSES.includes(status)) throw bad('حالة غير صالحة');
  const op = await q1(`update operators set status=$2 where id=$1 returning *`, [req.params.id, status]);
  if (!op) throw bad('المشغّل غير موجود', 404);
  publish({ public: true }, { type: 'lots_changed' });
  notifyOperator(op.id, { type: 'operator_status', title: 'تغيّرت حالة الترخيص', body: status });
  res.json({ ok: true });
});
