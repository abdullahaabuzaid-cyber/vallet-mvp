import { q } from '../../db/pool.ts';
import { mapInvoice } from '../../db/mappers.ts';
import { type ListParams, orderBy, paged, Where } from '../../utils/listQuery.ts';
import type { SessionUser } from '../auth/session.ts';

const SORT = {
  newest: 'i.issued_at desc, i.id desc',
  oldest: 'i.issued_at asc, i.id asc',
  amount_desc: 'i.amount desc, i.id desc',
  amount_asc: 'i.amount asc, i.id asc',
};

/** GET /api/invoices — gov: all (operatorId=none → unregistered payers); operator: own. */
export async function listInvoices(u: SessionUser, p: ListParams) {
  const w = new Where().scope('i.operator_id', u, p.operatorId);
  if (p.status) w.add('i.status = ?', p.status);
  if (p.kind) w.add('i.kind = ?', p.kind);
  w.range('i.issued_at', p.from, p.to);
  w.search(p.q, ['i.number', 'i.description', 'i.payer_name', 'o.name', 'i.payment_ref']);
  const rows = await q(
    `select i.*, count(*) over() as total_count from invoices i
       left join operators o on o.id = i.operator_id
     ${w.sql} order by ${orderBy(p.sort, SORT)} limit ${w.next(p.limit)} offset ${w.next(p.offset)}`,
    w.params
  );
  return paged(rows, mapInvoice);
}
