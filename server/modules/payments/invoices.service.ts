import { q1 } from '../../db/pool.ts';
import { bad } from '../../utils/http.ts';
import { notifyOperator } from '../realtime/notify.ts';
import type { SessionUser } from '../auth/session.ts';

/** Create an unpaid invoice (due in 30 days) and notify the operator. */
export async function issueInvoice(operatorId: string | null, payerName: string | null, kind: string, description: string, amount: number, incidentId?: string | null) {
  const n = (await q1(`select nextval('invoice_seq') as n`))!.n;
  const number = `INV-${new Date().getFullYear()}-${n}`;
  const inv = await q1(
    `insert into invoices (number, operator_id, payer_name, kind, description, amount, status, due_at, incident_id) values ($1,$2,$3,$4,$5,$6,'unpaid', now() + interval '30 days', $7) returning *`,
    [number, operatorId, payerName, kind, description, amount, incidentId ?? null]
  );
  if (operatorId) notifyOperator(operatorId, { type: 'invoice_new', title: 'فاتورة جديدة', body: `${description} — ${amount.toFixed(3)} د.أ`, link: '/operator/payments' });
  return inv;
}

/** Invoice visible to gov, or to the operator it belongs to. */
export async function invoiceForUser(id: number, u: SessionUser) {
  const inv = await q1(`select * from invoices where id=$1`, [id]);
  if (!inv) throw bad('الفاتورة غير موجودة', 404);
  if (u.role === 'gov' || (u.role === 'operator' && inv.operator_id === u.operatorId)) return inv;
  throw bad('غير مصرّح', 403);
}
