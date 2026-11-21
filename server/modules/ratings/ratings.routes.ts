import { Router } from 'express';
import { q1 } from '../../db/pool.ts';
import { requireRole } from '../../middleware/auth.ts';
import { bad, str } from '../../utils/http.ts';
import { notifyOperator } from '../realtime/notify.ts';
import { visitForUser } from '../visits/visits.service.ts';

export const ratingsRouter = Router();

/** Driver rates a delivered visit (1–5); re-rating overwrites. */
ratingsRouter.post('/ratings', requireRole('driver'), async (req, res) => {
  const v = await visitForUser(str(req.body?.visitId, 40), req.user!);
  const stars = Math.round(Number(req.body?.stars));
  if (!(stars >= 1 && stars <= 5)) throw bad('اختر تقييماً من 1 إلى 5');
  if (!v.check_out_at) throw bad('يمكن التقييم بعد استلام السيارة');
  const r = await q1(
    `insert into ratings (driver_user_id, driver_phone, visit_id, operator_id, site_id, stars, comment, employee_id) values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (visit_id) do update set stars = excluded.stars, comment = excluded.comment, employee_id = excluded.employee_id, created_at = now() returning *`,
    [req.user!.id, req.user!.phone, v.id, v.operator_id, v.site_id, stars, str(req.body?.comment, 500) || null, v.check_out_by || v.check_in_by]
  );
  notifyOperator(v.operator_id, { type: 'rating', title: 'تقييم جديد', body: `${stars}/5 — ${v.plate}` });
  res.json({ rating: r });
});
