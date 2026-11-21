import { q } from '../../db/pool.ts';
import { mapComplaint } from '../../db/mappers.ts';
import { type ListParams, orderBy, paged, Where } from '../../utils/listQuery.ts';
import type { SessionUser } from '../auth/session.ts';

const SORT = { newest: 'c.created_at desc, c.id desc', oldest: 'c.created_at asc, c.id asc' };

/** GET /api/complaints — gov: all; operator: complaints about them. `status=active` = open + investigating. */
export async function listComplaints(u: SessionUser, p: ListParams) {
  const w = new Where().scope('c.operator_id', u, p.operatorId);
  if (p.status === 'active') w.add(`c.status in ('open', 'investigating')`);
  else if (p.status) w.add('c.status = ?', p.status);
  if (p.kind) w.add('c.category = ?', p.kind);
  if (p.siteId) w.add('c.site_id = ?', p.siteId);
  w.range('c.created_at', p.from, p.to);
  w.search(p.q, ['c.description', 'c.driver_phone', 'c.id::text', 'v.receipt_no', 'o.name'], ['v.plate']);
  const rows = await q(
    `select c.*, count(*) over() as total_count from complaints c
       left join visits v on v.id = c.visit_id
       left join operators o on o.id = c.operator_id
     ${w.sql} order by ${orderBy(p.sort, SORT)} limit ${w.next(p.limit)} offset ${w.next(p.offset)}`,
    w.params
  );
  return paged(rows, mapComplaint);
}
