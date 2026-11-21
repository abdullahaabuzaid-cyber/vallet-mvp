import { Router } from 'express';
import crypto from 'node:crypto';
import { env } from '../../config/env.ts';
import { q1, tx } from '../../db/pool.ts';
import { requireRole } from '../../middleware/auth.ts';
import { bad, str } from '../../utils/http.ts';
import { issueInvoice } from '../payments/invoices.service.ts';
import { notifyOperator } from '../realtime/notify.ts';
import { publish } from '../realtime/sse.ts';
import { listParams } from '../../utils/listQuery.ts';
import { listLicenses } from './licenses.service.ts';

export const licensesRouter = Router();

/** Operator submits the licence application once every required document is uploaded. */
licensesRouter.post('/operator/submit', requireRole('operator'), async (req, res) => {
  const opId = req.user!.operatorId!;
  const missing = await q1(`select count(*)::int as n from documents where owner_type='operator' and owner_id=$1 and status in ('missing','rejected')`, [opId]);
  if (missing.n > 0) throw bad('ارفع كل المستندات المطلوبة قبل الإرسال');
  const op = await q1(`update operators set status = case when status='approved' then status else 'pending' end, submitted_at = now(), reject_reason = null where id=$1 returning *`, [opId]);
  publish({ gov: true, operatorId: opId }, { type: 'operator_submitted', title: 'طلب ترخيص للمراجعة', body: op.name, link: '/gov/licenses' });
  res.json({ ok: true });
});

/** Mounted under /api/gov (gov-only). */
export const licensesGovRouter = Router();

/** Licence applications with filters. */
licensesGovRouter.get('/licenses', async (req, res) => {
  res.json(await listLicenses(listParams(req)));
});

/** Approve: issue licence number + expiry, accept uploaded docs, bill the yearly fee on first approval. */
licensesGovRouter.post('/operators/:id/approve', async (req, res) => {
  const year = new Date().getFullYear();
  const op = await q1(`select * from operators where id=$1`, [req.params.id]);
  if (!op) throw bad('المشغّل غير موجود', 404);
  const licenseNo = op.license_no || `LIC-AMM-${year}-${String(crypto.randomInt(100, 1000))}`;
  await tx(async (c) => {
    await c.query(`update operators set status='approved', license_no=$2, license_expiry=$3, reject_reason=null where id=$1`, [op.id, licenseNo, `${year + 1}-12-31`]);
    await c.query(`update documents set status='accepted', note=null, reviewed_at=now(), reviewed_by=$2 where owner_type='operator' and owner_id=$1 and status <> 'missing'`, [op.id, `user-${req.user!.id}`]);
  });
  if (op.status !== 'approved') await issueInvoice(op.id, null, 'license_fee', `رسوم ترخيص سنوية — ${op.name}`, env.licenseFeeJod);
  publish({ public: true }, { type: 'lots_changed' });
  notifyOperator(op.id, { type: 'license_approved', title: 'تم اعتماد الترخيص', body: licenseNo, link: '/operator/license' });
  res.json({ ok: true, licenseNo });
});

licensesGovRouter.post('/operators/:id/reject', async (req, res) => {
  const reason = str(req.body?.reason, 300) || 'مستندات غير مكتملة';
  const op = await q1(`update operators set status='rejected', reject_reason=$2 where id=$1 returning *`, [req.params.id, reason]);
  if (!op) throw bad('المشغّل غير موجود', 404);
  publish({ public: true }, { type: 'lots_changed' });
  notifyOperator(op.id, { type: 'license_rejected', title: 'تم رفض طلب الترخيص', body: reason, link: '/operator/license' });
  res.json({ ok: true });
});
