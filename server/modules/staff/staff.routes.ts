import { Router } from 'express';
import { q, q1 } from '../../db/pool.ts';
import { requireRole } from '../../middleware/auth.ts';
import { bad, str } from '../../utils/http.ts';
import { notifyOperator } from '../realtime/notify.ts';
import { publish } from '../realtime/sse.ts';
import { createEmployee } from './staff.service.ts';

export const staffRouter = Router();

// ---------- operator ----------
staffRouter.post('/employees', requireRole('operator'), async (req, res) => {
  const opId = req.user!.operatorId!;
  const { id, name } = await createEmployee(opId, req.body || {});
  publish({ gov: true, operatorId: opId }, { type: 'employee_new', title: 'طلب تسجيل موظف', body: name, link: '/gov/licenses' });
  res.json({ employee: { id } });
});

staffRouter.post('/employees/:id/toggle', requireRole('operator'), async (req, res) => {
  const e = await q1(`select * from employees where id=$1 and operator_id=$2`, [req.params.id, req.user!.operatorId]);
  if (!e) throw bad('الموظف غير موجود', 404);
  if (!e.active && e.review_status !== 'approved') throw bad('لا يمكن تفعيل موظف قبل اعتماد الهيئة');
  await q(`update employees set active = not active where id=$1`, [e.id]);
  notifyOperator(e.operator_id, { type: 'employee_updated' });
  res.json({ ok: true });
});

/** Mounted under /api/gov (gov-only): staff registration review. */
export const staffGovRouter = Router();

staffGovRouter.post('/employees/:id/approve', async (req, res) => {
  const e = await q1(`update employees set review_status='approved', active=true, reject_reason=null where id=$1 returning *`, [req.params.id]);
  if (!e) throw bad('الموظف غير موجود', 404);
  await q(`update documents set status='accepted', reviewed_at=now() where owner_type='employee' and owner_id=$1 and status in ('uploaded','accepted','expiring')`, [e.id]);
  notifyOperator(e.operator_id, { type: 'employee_approved', title: 'تم اعتماد موظف', body: e.name });
  res.json({ ok: true });
});

staffGovRouter.post('/employees/:id/reject', async (req, res) => {
  const reason = str(req.body?.reason, 300) || 'مستندات غير مكتملة';
  const e = await q1(`update employees set review_status='rejected', active=false, reject_reason=$2 where id=$1 returning *`, [req.params.id, reason]);
  if (!e) throw bad('الموظف غير موجود', 404);
  notifyOperator(e.operator_id, { type: 'employee_rejected', title: 'تم رفض موظف', body: `${e.name}: ${reason}` });
  res.json({ ok: true });
});
