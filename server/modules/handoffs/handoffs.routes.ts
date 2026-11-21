import { Router } from 'express';
import { q1, tx } from '../../db/pool.ts';
import { mapHandoff, mapVisit } from '../../db/mappers.ts';
import { requireRole } from '../../middleware/auth.ts';
import { bad, str } from '../../utils/http.ts';
import { notifyOperator } from '../realtime/notify.ts';
import { publish } from '../realtime/sse.ts';
import { acceptHandoffTx, createHandoff, notifyHandoffAccepted } from './handoffs.service.ts';

export const handoffsRouter = Router();

// ---------- driver ----------
handoffsRouter.post('/handoffs', requireRole('driver'), async (req, res) => {
  const h = await createHandoff(req.user!, str(req.body?.siteId, 40), str(req.body?.plate, 20));
  res.json({ handoff: mapHandoff(h) });
});

handoffsRouter.post('/handoffs/:id/cancel', requireRole('driver'), async (req, res) => {
  const h = await q1(`update handoffs set status='cancelled' where id=$1 and status='pending' and (driver_user_id=$2 or owner_phone=$3) returning *`, [
    req.params.id, req.user!.id, req.user!.phone,
  ]);
  if (!h) throw bad('لا يمكن إلغاء هذا الطلب');
  notifyOperator(h.operator_id, { type: 'handoff_cancelled', title: 'ألغى السائق طلب التسليم', body: h.plate });
  res.json({ handoff: mapHandoff(h) });
});

// ---------- operator / staff ----------
handoffsRouter.post('/handoffs/:id/accept', requireRole('operator', 'staff'), async (req, res) => {
  const h0 = await q1(`select * from handoffs where id=$1`, [req.params.id]);
  if (!h0 || h0.operator_id !== req.user!.operatorId) throw bad('الطلب غير موجود', 404);
  const employeeId = req.user!.role === 'staff' ? req.user!.employeeId! : str(req.body?.employeeId, 40);
  const r = await tx((c) => acceptHandoffTx(c, h0.id, employeeId));
  notifyHandoffAccepted(r.handoff, r.visit, r.employee.name);
  res.json({ visit: mapVisit(r.visit), handoff: mapHandoff(r.handoff) });
});

handoffsRouter.post('/handoffs/:id/reject', requireRole('operator'), async (req, res) => {
  const h = await q1(`update handoffs set status='rejected' where id=$1 and operator_id=$2 and status='pending' returning *`, [req.params.id, req.user!.operatorId]);
  if (!h) throw bad('لا يمكن رفض هذا الطلب');
  publish({ driverPhone: h.owner_phone, driverUserId: h.driver_user_id }, { type: 'handoff_rejected', title: 'تم رفض طلب التسليم', body: `${h.plate} — جرّب موقفاً آخر`, link: '/driver/status' });
  notifyOperator(h.operator_id, { type: 'handoff_rejected' });
  res.json({ handoff: mapHandoff(h) });
});
