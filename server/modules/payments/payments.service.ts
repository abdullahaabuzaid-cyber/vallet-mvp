import crypto from 'node:crypto';
import { q, q1, tx } from '../../db/pool.ts';
import { bad, str } from '../../utils/http.ts';
import { publish } from '../realtime/sse.ts';
import type { SessionUser } from '../auth/session.ts';
import { invoiceForUser } from './invoices.service.ts';

/** Mock gateway, test mode: start a payment for an unpaid invoice. */
export async function startCheckout(invoiceId: number, u: SessionUser) {
  const inv = await invoiceForUser(invoiceId, u);
  if (inv.status === 'paid') throw bad('الفاتورة مدفوعة مسبقاً');
  const ref = `TEST-PAY-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  await q(`insert into payments (invoice_id, ref, amount, status) values ($1,$2,$3,'pending')`, [inv.id, ref, inv.amount]);
  return { inv, ref };
}

/** Mock gateway rules: 4000 0000 0000 0002 → declined, anything else valid → approved. */
export async function confirmPayment(ref: string, u: SessionUser, body: any) {
  const p = await q1(`select * from payments where ref=$1`, [ref]);
  if (!p) throw bad('عملية الدفع غير موجودة', 404);
  const inv = await invoiceForUser(p.invoice_id, u);
  if (p.status !== 'pending') throw bad('تمت معالجة هذه العملية');
  const card = String(body?.cardNumber || '').replace(/\D/g, '');
  const exp = str(body?.expiry, 7);
  const cvc = str(body?.cvc, 4);
  if (card.length < 12 || !/^\d{2}\/\d{2}$/.test(exp) || !/^\d{3,4}$/.test(cvc)) throw bad('بيانات البطاقة غير مكتملة');
  if (card === '4000000000000002') {
    await q(`update payments set status='failed', failure_reason='card_declined', completed_at=now(), card_last4=$2 where id=$1`, [p.id, card.slice(-4)]);
    throw bad('تم رفض البطاقة (بطاقة اختبار للرفض)', 402);
  }
  await tx(async (c) => {
    await c.query(`update payments set status='succeeded', completed_at=now(), card_last4=$2 where id=$1`, [p.id, card.slice(-4)]);
    await c.query(`update invoices set status='paid', paid_at=now(), payment_ref=$2 where id=$1`, [inv.id, p.ref]);
  });
  publish({ gov: true, operatorId: inv.operator_id }, { type: 'invoice_paid', title: 'تم دفع فاتورة', body: `${inv.number} — ${Number(inv.amount).toFixed(3)} د.أ` });
  return p.ref as string;
}
