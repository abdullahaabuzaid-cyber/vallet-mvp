import { useState } from 'react';
import { useResource } from '@/shared/hooks/useResource';
import { formatJod } from '@/shared/lib/format';
type Row = { id: string; name: string; license_no?: string; visits: number; visit_revenue: number; b2b_billed: number; taxable: number; gst: number; tips: number; gov_fees_paid: number; fines_issued: number };
type Tax = { period: string; gstRate: number; items: Row[]; totals: Omit<Row, 'id' | 'name' | 'license_no'>; note: string };
const thisMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
/** Automatic monthly tax / revenue report with CSV + Excel export. */
export function TaxReportCard() {
  const [period, setPeriod] = useState(thisMonth());
  const { data, error } = useResource<Tax | null>(`/api/gov/reports/tax?period=${period}`, null);
  return <div className="card" data-testid="tax-report">
    <div className="section-head"><div><h3>التقرير الضريبي والإيرادات الشهري</h3><p>يُحسب تلقائياً من الزيارات والعقود والفواتير. ضريبة المبيعات تقديرية ({Math.round((data?.gstRate ?? 0.16) * 100)}%).</p></div>
      <div className="row"><input aria-label="شهر التقرير" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        <a className="btn btn-sm" href={`/api/gov/reports/tax?period=${period}&format=csv`}>CSV</a><a className="btn btn-sm btn-primary" href={`/api/gov/reports/tax?period=${period}&format=xlsx`}>Excel</a></div></div>
    {error && <p role="alert">{error}</p>}
    {data && <div className="table-wrap"><table className="table"><thead><tr><th>المشغّل</th><th>الزيارات</th><th>إيراد الزيارات</th><th>فواتير الجهات</th><th>الخاضع</th><th>الضريبة</th><th>الإكراميات</th><th>رسوم للهيئة</th><th>غرامات</th></tr></thead>
      <tbody>{data.items.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.visits}</td><td>{formatJod(r.visit_revenue)}</td><td>{formatJod(r.b2b_billed)}</td><td>{formatJod(r.taxable)}</td><td>{formatJod(r.gst)}</td><td>{formatJod(r.tips)}</td><td>{formatJod(r.gov_fees_paid)}</td><td>{formatJod(r.fines_issued)}</td></tr>)}
        <tr className="total-row"><td><strong>الإجمالي</strong></td><td>{data.totals.visits}</td><td>{formatJod(data.totals.visit_revenue)}</td><td>{formatJod(data.totals.b2b_billed)}</td><td>{formatJod(data.totals.taxable)}</td><td><strong>{formatJod(data.totals.gst)}</strong></td><td>{formatJod(data.totals.tips)}</td><td>{formatJod(data.totals.gov_fees_paid)}</td><td>{formatJod(data.totals.fines_issued)}</td></tr></tbody></table></div>}
    <p className="muted tiny">{data?.note}</p>
  </div>;
}
