import { Router } from 'express';
import { q1 } from '../../db/pool.ts';
import { requireRole } from '../../middleware/auth.ts';
import { bad, str } from '../../utils/http.ts';
import { publish } from '../realtime/sse.ts';
import { visitForUser } from '../visits/visits.service.ts';
import { listParams } from '../../utils/listQuery.ts';
import { listComplaints } from './complaints.service.ts';

const COMPLAINT_CATEGORIES = ['damage', 'delay', 'lost_item', 'behavior', 'overcharge', 'unlicensed', 'other'];
const COMPLAINT_STATUSES = ['open', 'investigating', 'resolved', 'rejected'];

export const complaintsRouter = Router();

/** Complaints list with filters (gov: all; operator: own). */
complaintsRouter.get('/complaints', requireRole('gov', 'operator'), async (req, res) => {
  res.json(await listComplaints(req.user!, listParams(req)));
});

/** Driver files a complaint (optionally linked to a visit or a lot). */
complaintsRouter.post('/complaints', requireRole('driver'), async (req, res) => {
  const category = str(req.body?.category, 30);
  const description = str(req.body?.description, 2000);
  if (!COMPLAINT_CATEGORIES.includes(category)) throw bad('اختر نوع الشكوى');
  if (description.length < 5) throw bad('اكتب تفاصيل الشكوى');
  let operatorId: string | null = null;
  let siteId: string | null = str(req.body?.siteId, 40) || null;
  let visitId: string | null = null;
  if (req.body?.visitId) {
    const v = await visitForUser(str(req.body.visitId, 40), req.user!);
    visitId = v.id; operatorId = v.operator_id; siteId = v.site_id;
  } else if (siteId) {
    const s = await q1(`select operator_id from sites where id=$1`, [siteId]);
    operatorId = s?.operator_id ?? null;
  }
  const c = await q1(
    `insert into complaints (driver_user_id, driver_phone, visit_id, operator_id, site_id, category, description) values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [req.user!.id, req.user!.phone, visitId, operatorId, siteId, category, description]
  );
  publish({ gov: true, operatorId }, { type: 'complaint_new', title: 'شكوى جديدة', body: description.slice(0, 80), link: '/gov/complaints' });
  res.json({ complaint: c });
});

/** Mounted under /api/gov (gov-only). */
export const complaintsGovRouter = Router();

complaintsGovRouter.post('/complaints/:id', async (req, res) => {
  const status = str(req.body?.status, 20);
  if (!COMPLAINT_STATUSES.includes(status)) throw bad('حالة غير صالحة');
  const c = await q1(`update complaints set status=$2, gov_response=coalesce(nullif($3,''), gov_response), updated_at=now() where id=$1 returning *`, [
    Number(req.params.id), status, str(req.body?.response, 1000),
  ]);
  if (!c) throw bad('الشكوى غير موجودة', 404);
  publish({ driverPhone: c.driver_phone, driverUserId: c.driver_user_id, gov: true, operatorId: c.operator_id }, {
    type: 'complaint_updated', title: 'تحديث على شكواك', body: c.gov_response || status, link: '/driver/status',
  });
  res.json({ ok: true });
});
