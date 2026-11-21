import { q } from '../../db/pool.ts';
import { bad } from '../../utils/http.ts';
import { ammanMonth } from '../../utils/amman.ts';
/** Illustrative GST rate on operator visit revenue (Jordan general sales tax 16%). Configurable later. */
export const GST_RATE = 0.16;
/** Monthly tax/revenue report per operator (Amman month). Figures from platform data only. */
export async function taxReport(period: string) {
  const r = ammanMonth(period);
  if (!r) throw bad('اختر الشهر بصيغة YYYY-MM');
  const rows = await q(`select o.id, o.name, o.license_no,
      (select count(*)::int from visits v where v.operator_id=o.id and v.check_in_at >= $1 and v.check_in_at < $2) visits,
      (select coalesce(sum(v.fee),0)::float from visits v where v.operator_id=o.id and v.check_in_at >= $1 and v.check_in_at < $2) visit_revenue,
      (select coalesce(sum(i.amount),0)::float from contract_invoices i where i.operator_id=o.id and i.issued_at >= $1 and i.issued_at < $2) b2b_billed,
      (select coalesce(sum(t.amount),0)::float from tips t join visits v on v.id=t.visit_id where v.operator_id=o.id and t.created_at >= $1 and t.created_at < $2) tips,
      (select coalesce(sum(i.amount),0)::float from invoices i where i.operator_id=o.id and i.kind <> 'fine' and i.status='paid' and i.paid_at >= $1 and i.paid_at < $2) gov_fees_paid,
      (select coalesce(sum(i.amount),0)::float from invoices i where i.operator_id=o.id and i.kind='fine' and i.issued_at >= $1 and i.issued_at < $2) fines_issued
    from operators o order by o.name`, [r.from, r.to]);
  const items = rows.map((x) => ({ ...x, taxable: x.visit_revenue + x.b2b_billed, gst: Math.round((x.visit_revenue + x.b2b_billed) * GST_RATE * 1000) / 1000 }));
  const sum = (k: string) => Math.round(items.reduce((a, x: any) => a + x[k], 0) * 1000) / 1000;
  const unlicensedFines = (await q(`select coalesce(sum(amount),0)::float s from invoices where operator_id is null and kind='fine' and issued_at >= $1 and issued_at < $2`, [r.from, r.to]))[0].s;
  return { period, gstRate: GST_RATE, items, totals: { visits: sum('visits'), visit_revenue: sum('visit_revenue'), b2b_billed: sum('b2b_billed'), tips: sum('tips'), taxable: sum('taxable'), gst: sum('gst'), gov_fees_paid: sum('gov_fees_paid'), fines_issued: sum('fines_issued') + unlicensedFines }, note: 'تقدير آلي من بيانات المنصة — للمراجعة قبل أي تقديم رسمي' };
}
const COLS: [string, string][] = [['name', 'المشغّل'], ['license_no', 'رقم الترخيص'], ['visits', 'الزيارات'], ['visit_revenue', 'إيراد الزيارات'], ['b2b_billed', 'فواتير الجهات'], ['taxable', 'الإيراد الخاضع'], ['gst', 'ضريبة المبيعات (تقدير)'], ['tips', 'الإكراميات'], ['gov_fees_paid', 'رسوم مدفوعة للهيئة'], ['fines_issued', 'غرامات صادرة']];
export function taxCsv(d: Awaited<ReturnType<typeof taxReport>>) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [COLS.map((c) => esc(c[1])).join(','), ...d.items.map((x: any) => COLS.map((c) => esc(x[c[0]])).join(',')),
    COLS.map((c, i) => esc(i === 0 ? 'الإجمالي' : (d.totals as any)[c[0]] ?? '')).join(',')];
  return '\ufeff' + lines.join('\r\n');
}
export { COLS as TAX_COLS };
