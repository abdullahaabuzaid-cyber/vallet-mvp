import { q } from '../../db/pool.ts';
import { mapIncident } from '../../db/mappers.ts';
import { type ListParams, orderBy, paged, Where } from '../../utils/listQuery.ts';
import type { SessionUser } from '../auth/session.ts';

const SORT = { newest: 'i.created_at desc, i.id desc', oldest: 'i.created_at asc, i.id asc' };

/** GET /api/incidents — gov: all (operatorId=none → field reports); operator/staff: own. `status=active` = open + investigating. */
export async function listIncidents(u: SessionUser, p: ListParams) {
  const w = new Where().scope('i.operator_id', u, p.operatorId);
  if (p.status === 'active') w.add(`i.status in ('open', 'investigating')`);
  else if (p.status) w.add('i.status = ?', p.status);
  if (p.kind) w.add('i.type = ?', p.kind);
  w.range('i.created_at', p.from, p.to);
  w.search(p.q, ['i.description', 'i.area', 'i.id', 'o.name'], ['i.plate']);
  const rows = await q(
    `select i.*, count(*) over() as total_count from incidents i
       left join operators o on o.id = i.operator_id
     ${w.sql} order by ${orderBy(p.sort, SORT)} limit ${w.next(p.limit)} offset ${w.next(p.offset)}`,
    w.params
  );
  return paged(rows, mapIncident);
}
