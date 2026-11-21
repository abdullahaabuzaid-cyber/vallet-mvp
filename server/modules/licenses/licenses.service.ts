import { q } from '../../db/pool.ts';
import { type ListParams, orderBy, Where } from '../../utils/listQuery.ts';
import { operatorsWith } from '../operators/operators.query.ts';

const SORT = { newest: 'submitted_at desc, id', oldest: 'submitted_at asc, id', name: 'name asc, id' };

/** GET /api/gov/licenses — operator licence applications with their documents. */
export async function listLicenses(p: ListParams) {
  const w = new Where();
  if (p.status) w.add('status = ?', p.status);
  if (p.operatorId) w.add('id = ?', p.operatorId);
  w.range('submitted_at', p.from, p.to);
  w.search(p.q, ['name', 'license_no', 'area']);
  const total = Number((await q(`select count(*)::int as n from operators ${w.sql}`, w.params))[0]?.n ?? 0);
  const where = `${w.sql} order by ${orderBy(p.sort, SORT)} limit ${w.next(p.limit)} offset ${w.next(p.offset)}`;
  // operatorsWith appends its own ORDER BY, so feed it the id list in our order.
  const ids = (await q(`select id from operators ${where}`, w.params)).map((r) => r.id);
  const ops = ids.length ? await operatorsWith(`where id = any($1)`, [ids], true) : [];
  return { items: ids.map((id) => ops.find((o) => o.id === id)!), total };
}
