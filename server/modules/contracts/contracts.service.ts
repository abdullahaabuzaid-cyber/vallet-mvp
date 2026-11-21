import { q, q1, tx } from '../../db/pool.ts';
import { bad, str } from '../../utils/http.ts';
import { ammanMonth } from '../../utils/amman.ts';
import { type ListParams, Where } from '../../utils/listQuery.ts';
import type { SessionUser } from '../auth/session.ts';
export const VENUE_TYPES = ['restaurant', 'hotel', 'mall', 'event', 'other'];
const num = (v: unknown) => Number(v);
const mapC = (r: any) => ({ id: r.id, venue: r.venue, venueType: r.venue_type, siteId: r.site_id, siteName: r.site_name, monthlyFee: num(r.monthly_fee), perVisitFee: num(r.per_visit_fee), startsOn: r.starts_on, status: r.status });
const mapI = (r: any) => ({ id: r.id, number: r.number, contractId: r.contract_id, venue: r.venue, period: r.period, visits: r.visits, amount: num(r.amount), status: r.status, issuedAt: r.issued_at, paidAt: r.paid_at });
export async function listContracts(u: SessionUser, p: ListParams) {
  const w = new Where().add('c.operator_id = ?', u.operatorId).search(p.q, ['c.venue', 's.name']);
  if (p.status) w.add('c.status = ?', p.status);
  if (p.kind) w.add('c.venue_type = ?', p.kind);
  return (await q(`select c.*, s.name site_name from contracts c join sites s on s.id=c.site_id ${w.sql} order by c.created_at desc`, w.params)).map(mapC);
}
export async function createContract(u: SessionUser, b: any) {
  const venue = str(b?.venue, 120), type = str(b?.venueType, 20), siteId = str(b?.siteId, 40), monthly = num(b?.monthlyFee || 0), per = num(b?.perVisitFee || 0);
  if (!venue || !VENUE_TYPES.includes(type)) throw bad('أدخل اسم الجهة ونوعها');
  if (!(await q1(`select 1 from sites where id=$1 and operator_id=$2`, [siteId, u.operatorId]))) throw bad('اختر موقفاً تابعاً لك');
  if (!(monthly >= 0 && per >= 0 && monthly + per > 0 && monthly <= 100000 && per <= 100)) throw bad('أدخل رسوماً شهرية أو رسماً لكل سيارة');
  const r = await q1(`insert into contracts(operator_id,venue,venue_type,site_id,monthly_fee,per_visit_fee) values($1,$2,$3,$4,$5,$6) returning *, (select name from sites where id=$4) site_name`, [u.operatorId, venue, type, siteId, monthly, per]);
  return mapC(r);
}
export async function endContract(u: SessionUser, id: number) {
  const r = await q1(`update contracts set status='ended' where id=$1 and operator_id=$2 returning *`, [id, u.operatorId]);
  if (!r) throw bad('العقد غير موجود', 404);
  return mapC(r);
}
/** Monthly B2B invoice: fixed fee + per-car fee × visits at the contract's lot in that month (Amman time). One per contract per month. */
export async function invoiceMonth(u: SessionUser, id: number, period: string) {
  const range = ammanMonth(period);
  if (!range) throw bad('اختر الشهر بصيغة YYYY-MM');
  return tx(async (c) => {
    const k = (await c.query(`select * from contracts where id=$1 and operator_id=$2 for update`, [id, u.operatorId])).rows[0];
    if (!k) throw bad('العقد غير موجود', 404);
    if ((await c.query(`select 1 from contract_invoices where contract_id=$1 and period=$2`, [id, period])).rowCount) throw bad('فاتورة هذا الشهر صادرة مسبقاً');
    const visits = (await c.query(`select count(*)::int n from visits where site_id=$1 and check_in_at >= $2 and check_in_at < $3`, [k.site_id, range.from, range.to])).rows[0].n;
    const amount = Math.round((num(k.monthly_fee) + num(k.per_visit_fee) * visits) * 1000) / 1000;
    const n = (await c.query(`select nextval('invoice_seq') n`)).rows[0].n;
    const r = (await c.query(`insert into contract_invoices(number,contract_id,operator_id,period,visits,amount) values($1,$2,$3,$4,$5,$6) returning *`,
      [`B2B-${period.replace('-', '')}-${n}`, id, u.operatorId, period, visits, amount])).rows[0];
    return mapI({ ...r, venue: k.venue });
  });
}
export async function listContractInvoices(u: SessionUser, p: ListParams) {
  const w = new Where().add('i.operator_id = ?', u.operatorId).search(p.q, ['c.venue', 'i.number']);
  if (p.status) w.add('i.status = ?', p.status);
  return (await q(`select i.*, c.venue from contract_invoices i join contracts c on c.id=i.contract_id ${w.sql} order by i.issued_at desc limit 200`, w.params)).map(mapI);
}
export async function markPaid(u: SessionUser, id: number) {
  const r = await q1(`update contract_invoices set status='paid', paid_at=now() where id=$1 and operator_id=$2 and status='unpaid' returning *`, [id, u.operatorId]);
  if (!r) throw bad('الفاتورة غير موجودة أو مدفوعة');
  return mapI(r);
}
