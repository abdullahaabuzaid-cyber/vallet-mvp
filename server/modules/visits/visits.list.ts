import { q } from '../../db/pool.ts';
import { mapVisit } from '../../db/mappers.ts';
import { type ListParams, orderBy, paged, Where } from '../../utils/listQuery.ts';
import type { SessionUser } from '../auth/session.ts';

const STATUS: Record<string, string> = {
  inside: 'v.check_out_at is null and v.return_requested_at is null',
  return_pending: 'v.check_out_at is null and v.return_requested_at is not null',
  ready: 'v.check_out_at is null and v.ready_at is not null',
  active: 'v.check_out_at is null',
  delivered: 'v.check_out_at is not null',
};

const SORT = {
  newest: 'v.check_in_at desc',
  oldest: 'v.check_in_at asc',
  plate: 'v.plate asc, v.check_in_at desc',
  longest: 'coalesce(v.check_out_at, now()) - v.check_in_at desc',
};

/** GET /api/visits — the car log with server-side filters (gov: all operators; operator/staff: own). */
export async function listVisits(u: SessionUser, p: ListParams) {
  const w = new Where().scope('v.operator_id', u, p.operatorId);
  if (STATUS[p.status]) w.add(STATUS[p.status]);
  if (p.siteId) w.add('v.site_id = ?', p.siteId);
  if (p.employeeId) w.add('(v.check_in_by = ? or v.check_out_by = ?)', p.employeeId, p.employeeId);
  // A visit belongs to a period if the car came in or left during it.
  w.rangeAny(['v.check_in_at', 'v.check_out_at'], p.from, p.to);
  w.search(p.q, ['v.receipt_no', 'v.owner_phone', 'v.car_make', 'v.car_model', 'ei.name', 'eo.name', 'o.name'], ['v.plate']);
  const rows = await q(
    `select v.*, count(*) over() as total_count from visits v
       left join employees ei on ei.id = v.check_in_by
       left join employees eo on eo.id = v.check_out_by
       left join operators o on o.id = v.operator_id
     ${w.sql} order by ${orderBy(p.sort, SORT)} limit ${w.next(p.limit)} offset ${w.next(p.offset)}`,
    w.params
  );
  return paged(rows, mapVisit);
}
