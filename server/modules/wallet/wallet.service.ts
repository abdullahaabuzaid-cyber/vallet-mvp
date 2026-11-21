import crypto from 'node:crypto';
import { q, q1, tx, type DbClient } from '../../db/pool.ts';
import { bad, str } from '../../utils/http.ts';
import { PLANS, type PlanKey } from '../../../common/constants/plans.ts';
import { visitForUser } from '../visits/visits.service.ts';
import { notifyOperator } from '../realtime/notify.ts';
import type { SessionUser } from '../auth/session.ts';
const ref = (p: string) => `${p}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
async function balanceTx(c: DbClient, userId: number) {
  await c.query(`select pg_advisory_xact_lock($1)`, [userId]);
  return Number((await c.query(`select coalesce(sum(amount),0) b from wallet_entries where user_id=$1`, [userId])).rows[0].b);
}
export async function wallet(u: SessionUser) {
  const [b, entries, sub, tips] = await Promise.all([
    q1(`select coalesce(sum(amount),0)::float b from wallet_entries where user_id=$1`, [u.id]),
    q(`select id,kind,amount::float,ref,note,created_at from wallet_entries where user_id=$1 order by created_at desc limit 50`, [u.id]),
    q1(`select plan,price::float,starts_at,ends_at from subscriptions where user_id=$1 and status='active' and ends_at>now() order by ends_at desc limit 1`, [u.id]),
    q(`select visit_id,amount::float from tips where user_id=$1`, [u.id]),
  ]);
  return { balance: b!.b, entries, subscription: sub ?? null, tips, plans: PLANS, testMode: true };
}
/** Mock top-up: no money moves. 4000 0000 0000 0002 is declined. */
export async function topUp(u: SessionUser, body: any) {
  const amount = Math.round(Number(body?.amount) * 1000) / 1000;
  if (!(amount >= 1 && amount <= 500)) throw bad('مبلغ الشحن من 1 إلى 500 د.أ');
  const card = String(body?.cardNumber || '').replace(/\D/g, '');
  if (card.length < 12 || !/^\d{2}\/\d{2}$/.test(str(body?.expiry, 7)) || !/^\d{3,4}$/.test(str(body?.cvc, 4))) throw bad('بيانات البطاقة غير مكتملة');
  if (card === '4000000000000002') throw bad('تم رفض البطاقة (بطاقة اختبار للرفض)', 402);
  return q1(`insert into wallet_entries(user_id,kind,amount,ref,note) values($1,'topup',$2,$3,$4) returning id,ref`, [u.id, amount, ref('TOPUP'), `شحن تجريبي — بطاقة ${card.slice(-4)}`]);
}
export async function subscribe(u: SessionUser, planKey: string) {
  const plan = PLANS[planKey as PlanKey];
  if (!plan) throw bad('اختر باقة');
  return tx(async (c) => {
    if ((await balanceTx(c, u.id)) < plan.price) throw bad('الرصيد غير كافٍ — اشحن المحفظة أولاً');
    if ((await c.query(`select 1 from subscriptions where user_id=$1 and status='active' and ends_at>now()`, [u.id])).rowCount) throw bad('لديك اشتراك فعّال');
    await c.query(`insert into wallet_entries(user_id,kind,amount,ref,note) values($1,'subscription',$2,$3,$4)`, [u.id, -plan.price, ref('SUB'), `اشتراك ${plan.name} — 30 يوماً`]);
    return (await c.query(`insert into subscriptions(user_id,plan,price,ends_at) values($1,$2,$3,now()+interval '30 days') returning plan,ends_at`, [u.id, planKey, plan.price])).rows[0];
  });
}
/** Tip the staff member who handed the car back, from the wallet. One tip per visit. */
export async function tip(u: SessionUser, visitId: string, amountIn: unknown) {
  const v = await visitForUser(visitId, u);
  if (!v.check_out_at) throw bad('الإكرامية بعد استلام السيارة');
  const amount = Number(amountIn);
  if (!(amount >= 0.5 && amount <= 20)) throw bad('الإكرامية من 0.5 إلى 20 د.أ');
  const employeeId = v.check_out_by || v.check_in_by;
  const r = await tx(async (c) => {
    if ((await balanceTx(c, u.id)) < amount) throw bad('الرصيد غير كافٍ — اشحن المحفظة أولاً');
    if ((await c.query(`select 1 from tips where visit_id=$1`, [v.id])).rowCount) throw bad('تم إرسال إكرامية لهذه الزيارة');
    const e = (await c.query(`insert into wallet_entries(user_id,kind,amount,ref,note) values($1,'tip',$2,$3,$4) returning id`, [u.id, -amount, ref('TIP'), `إكرامية — ${v.plate}`])).rows[0];
    return (await c.query(`insert into tips(visit_id,employee_id,user_id,amount,entry_id) values($1,$2,$3,$4,$5) returning *`, [v.id, employeeId, u.id, amount, e.id])).rows[0];
  });
  notifyOperator(v.operator_id, { type: 'tip', title: 'إكرامية جديدة', body: `${amount.toFixed(3)} د.أ — ${v.plate}` });
  return r;
}
