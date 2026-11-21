import { Router } from 'express';
import { env } from '../../config/env.ts';
import { nextId, q1 } from '../../db/pool.ts';
import { requireRole } from '../../middleware/auth.ts';
import { bad, str } from '../../utils/http.ts';
import { optionalNumber } from '../../utils/validation.ts';
import { issueInvoice } from '../payments/invoices.service.ts';
import { publish } from '../realtime/sse.ts';
import { listParams } from '../../utils/listQuery.ts';
import { listIncidents } from './incidents.service.ts';

const INCIDENT_TYPES = ['damage', 'lost_keys', 'delay', 'unlicensed', 'other'];
const INCIDENT_STATUSES = ['open', 'investigating', 'closed', 'fined'];

export const incidentsRouter = Router();

/** Incidents list with filters (gov: all; operator/staff: own). */
incidentsRouter.get('/incidents', requireRole('gov', 'operator', 'staff'), async (req, res) => {
  res.json(await listIncidents(req.user!, listParams(req)));
});

/** Staff/operator/gov reports an incident (incl. unlicensed valet with location). */
incidentsRouter.post('/incidents', requireRole('staff', 'gov', 'operator'), async (req, res) => {
  const type = str(req.body?.type, 20);
  const description = str(req.body?.description, 2000);
  if (!INCIDENT_TYPES.includes(type)) throw bad('نوع البلاغ غير صالح');
  if (!description) throw bad('اكتب وصف البلاغ');
  const u = req.user!;
  const operatorId = u.role === 'gov' ? str(req.body?.operatorId, 40) || null : u.operatorId;
  const lat = optionalNumber(req.body?.lat);
  const lng = optionalNumber(req.body?.lng);
  const id = await nextId('inc-', 'incident_seq');
  const i = await q1(
    `insert into incidents (id, type, visit_id, operator_id, description, status, created_by, plate, lat, lng, area) values ($1,$2,$3,$4,$5,'open',$6,$7,$8,$9,$10) returning *`,
    [id, type, str(req.body?.visitId, 40) || null, operatorId, description, u.role === 'gov' ? 'gov' : u.employeeId || `user-${u.id}`,
      str(req.body?.plate, 20) || null, lat, lng, str(req.body?.area, 80) || null]
  );
  publish({ gov: true, operatorId }, { type: 'incident_new', title: 'بلاغ جديد', body: description.slice(0, 80), link: '/gov/incidents' });
  res.json({ incident: i });
});

/** Mounted under /api/gov (gov-only). Marking "fined" issues a fine invoice once. */
export const incidentsGovRouter = Router();

incidentsGovRouter.post('/incidents/:id/status', async (req, res) => {
  const status = str(req.body?.status, 20);
  if (!INCIDENT_STATUSES.includes(status)) throw bad('حالة غير صالحة');
  const prev = await q1(`select * from incidents where id=$1`, [req.params.id]);
  if (!prev) throw bad('البلاغ غير موجود', 404);
  const i = await q1(`update incidents set status=$2 where id=$1 returning *`, [prev.id, status]);
  if (status === 'fined' && prev.status !== 'fined') {
    const amount = Math.max(1, Number(req.body?.fineAmount) || env.fineDefaultJod);
    const payer = i.operator_id ? null : `فاليه غير مرخّص — ${i.area || 'عمّان'}`;
    await issueInvoice(i.operator_id, payer, 'fine', `مخالفة: ${i.description.slice(0, 80)}`, amount, i.id);
  }
  publish({ gov: true, operatorId: i.operator_id }, { type: 'incident_updated' });
  res.json({ ok: true });
});
