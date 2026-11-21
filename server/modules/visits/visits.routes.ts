import { Router } from 'express';
import { checkCapacity } from '../capacity/capacity.service.ts';
import { quote } from '../pricing/pricing.service.ts';
import { requireCompleteEvidence } from '../condition/condition.guard.ts';
import { q1 } from '../../db/pool.ts';
import { mapVisit } from '../../db/mappers.ts';
import { requireRole } from '../../middleware/auth.ts';
import { bad } from '../../utils/http.ts';
import { notifyOperator } from '../realtime/notify.ts';
import { publish } from '../realtime/sse.ts';
import { checkIn, staffVisit, visitForUser } from './visits.service.ts';
import { listParams } from '../../utils/listQuery.ts';
import { listVisits } from './visits.list.ts';

export const visitsRouter = Router();

/** Car log with filters (see utils/listQuery). */
visitsRouter.get('/visits', requireRole('gov', 'operator', 'staff'), async (req, res) => {
  res.json(await listVisits(req.user!, listParams(req)));
});

visitsRouter.post('/visits/:id/request-return', requireRole('driver', 'staff', 'operator'), async (req, res) => {
  const v = await visitForUser(String(req.params.id), req.user!);
  if (v.check_out_at) throw bad('السيارة سُلّمت مسبقاً');
  const r = await q1(`update visits set return_requested_at = coalesce(return_requested_at, now()) where id=$1 returning *`, [v.id]);
  notifyOperator(v.operator_id, { type: 'return_requested', title: 'طلب إرجاع سيارة', body: `${v.plate} — ${v.receipt_no}`, link: '/staff/cars' });
  res.json({ visit: mapVisit(r) });
});

visitsRouter.post('/visits/checkin', requireRole('staff'), async (req, res) => {
  const v0 = await checkIn(req.user!, req.body);
  const price = await quote(v0.site_id).catch(() => ({ fee: null }));
  const ocr = typeof req.body?.ocrPlate === 'string' ? req.body.ocrPlate.trim().slice(0, 20) || null : null;
  const v = await q1(`update visits set fee=coalesce($2, fee), ocr_plate=$3 where id=$1 returning *`, [v0.id, price.fee, ocr]);
  void checkCapacity(v.site_id);
  notifyOperator(v.operator_id, { type: 'visit_in', title: 'دخول سيارة', body: `${v.plate} — ${v.receipt_no}` });
  if (v.owner_phone) publish({ driverPhone: v.owner_phone }, { type: 'visit_in', title: 'تم استلام سيارتك', body: `${v.plate} — إيصال ${v.receipt_no}`, link: '/driver/status' });
  res.json({ visit: mapVisit(v) });
});

visitsRouter.post('/visits/:id/checkout', requireRole('staff', 'operator'), async (req, res) => {
  const v = await staffVisit(req);
  if (v.check_out_at) throw bad('تم تسجيل الخروج مسبقاً');
  await requireCompleteEvidence(v.id);
  const by = req.user!.employeeId || v.check_in_by;
  const r = await q1(`update visits set check_out_at = now(), check_out_by = $2 where id=$1 returning *`, [v.id, by]);
  notifyOperator(v.operator_id, { type: 'visit_out', title: 'خروج سيارة', body: `${v.plate} — ${v.receipt_no}` });
  publish({ driverPhone: v.owner_phone }, { type: 'visit_out', title: 'تم تسليم سيارتك', body: `${v.plate} — قيّم الخدمة الآن`, link: '/driver/status' });
  res.json({ visit: mapVisit(r) });
});

visitsRouter.post('/visits/:id/parked', requireRole('staff', 'operator'), async (req, res) => {
  const v = await staffVisit(req);
  const r = await q1(`update visits set parked_at = coalesce(parked_at, now()) where id=$1 returning *`, [v.id]);
  publish({ driverPhone: v.owner_phone, operatorId: v.operator_id }, { type: 'visit_parked', title: 'رُكنت سيارتك', body: v.plate });
  res.json({ visit: mapVisit(r) });
});

visitsRouter.post('/visits/:id/ready', requireRole('staff', 'operator'), async (req, res) => {
  const v = await staffVisit(req);
  if (v.check_out_at) throw bad('تم تسليم السيارة مسبقاً');
  const r = await q1(`update visits set ready_at = now(), return_requested_at = coalesce(return_requested_at, now()) where id=$1 returning *`, [v.id]);
  publish({ driverPhone: v.owner_phone }, { type: 'visit_ready', title: 'سيارتك جاهزة 🚗', body: `${v.plate} بانتظارك عند المدخل`, link: '/driver/status' });
  notifyOperator(v.operator_id, { type: 'visit_ready', title: 'سيارة جاهزة للتسليم', body: v.plate });
  res.json({ visit: mapVisit(r) });
});
