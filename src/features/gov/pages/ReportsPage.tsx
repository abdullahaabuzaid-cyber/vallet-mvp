import { TaxReportCard } from '@/features/reports/TaxReportCard';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterBar, type FilterField } from '@/shared/components/ui/filters';
import { searchField } from '@/shared/components/ui/filters/fields';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ListSkeleton } from '@/shared/components/ui/ListState';
import { StatCard } from '@/shared/components/ui/StatCard';
import { filterList } from '@/shared/hooks/filterList';
import { useFilters } from '@/shared/hooks/useFilters';
import { api } from '@/shared/lib/api';
import { formatJod } from '@/shared/lib/format';

type Report = {
  range: { from: string; to: string };
  totals: { collected: number; outstanding: number; licenseFees: number; fines: number; visitFees: number; violations: number; unlicensed: number; visits: number; complaints: number };
  revenueByKind: { kind: string; status: string; n: number; total: number }[];
  monthly: { month: string; kind: string; total: number }[];
  violationsByType: { type: string; status: string; n: number }[];
  operators: {
    id: string; name: string; status: string; visits: number; delivered: number; avg_minutes: number | null; handoffs: number;
    handoffs_accepted: number; avg_accept_min: number | null; rating: number | null; rating_count: number; complaints: number;
    incidents: number; paid: number; outstanding: number;
  }[];
};

const KIND: Record<string, string> = { license_fee: 'رسوم ترخيص', fine: 'غرامات', visit_fee: 'رسوم رقابة' };
const TYPE: Record<string, string> = { damage: 'ضرر', lost_keys: 'فقدان مفاتيح', delay: 'تأخير', unlicensed: 'فاليه غير مرخّص', other: 'أخرى' };
const ISTATUS: Record<string, string> = { open: 'مفتوح', investigating: 'قيد التحقيق', closed: 'مغلق', fined: 'مخالفة' };
const OSTATUS: Record<string, string> = { pending: 'قيد المراجعة', approved: 'ساري', rejected: 'مرفوض', suspended: 'موقوف' };

const day = (d: Date) => d.toISOString().slice(0, 10);

export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const from = params.get('rfrom') || day(new Date(Date.now() - 90 * 86400_000));
  const to = params.get('rto') || day(new Date());
  const setRange = (k: 'rfrom' | 'rto', v: string) => setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });
  const filters = useFilters();
  const fields: FilterField[] = [
    searchField('اسم المشغّل'),
    { type: 'select', key: 'status', label: 'الترخيص', options: Object.entries(OSTATUS).map(([value, label]) => ({ value, label })) },
    { type: 'sort', options: [{ value: 'visits', label: 'الأكثر زيارات' }, { value: 'name', label: 'الاسم' }, { value: 'amount_desc', label: 'الأعلى مستحقات' }] },
  ];
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api<Report>(`/api/gov/reports?from=${from}&to=${to}`)
      .then((d) => {
        if (alive) {
          setData(d);
          setError('');
        }
      })
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [from, to]);

  const qs = `from=${from}&to=${to}`;
  const opsFiltered = data ? filterList(data.operators, { ...filters.values, sort: 'name' }, (o) => ({ text: o.name, status: o.status })) : [];
  const sort = filters.values.sort || 'visits';
  const ops = sort === 'name' ? opsFiltered : [...opsFiltered].sort((a, b) => (sort === 'amount_desc' ? b.outstanding - a.outstanding : b.visits - a.visits));
  const maxRev = Math.max(1, ...(data?.revenueByKind.filter((r) => r.status === 'paid').map((r) => r.total) ?? [1]));

  return (
    <div className="reg-page">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ margin: 0 }}>التقارير</h2>
            <p className="muted" style={{ margin: '6px 0 0' }}>الإيرادات (رسوم وغرامات)، المخالفات، وأداء المشغّلين. المبالغ تجريبية.</p>
          </div>
          <div className="row">
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="r-from">من</label>
              <input id="r-from" type="date" value={from} onChange={(e) => setRange('rfrom', e.target.value)} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="r-to">إلى</label>
              <input id="r-to" type="date" value={to} onChange={(e) => setRange('rto', e.target.value)} />
            </div>
            <a className="btn" href={`/api/gov/reports/export.xlsx?${qs}`} data-testid="export-xlsx">
              تصدير Excel
            </a>
            <a className="btn btn-primary" href={`/api/gov/reports/export.pdf?${qs}`} data-testid="export-pdf">
              تصدير PDF
            </a>
          </div>
        </div>
        {error && <div className="reg-alert bad" style={{ marginTop: 10 }}>{error}</div>}
      </div>

      {!data && !error && <ListSkeleton />}
      {data && (
        <>
          <div className="stat-grid">
            <StatCard label="إيرادات محصّلة" value={formatJod(data.totals.collected)} icon="wallet" tone="teal" />
            <StatCard label="مستحقات" value={formatJod(data.totals.outstanding)} icon="clock" tone="amber" />
            <StatCard label="مخالفات/بلاغات" value={data.totals.violations} icon="shield" tone="violet" />
            <StatCard label="زيارات" value={data.totals.visits} icon="car" />
          </div>

          <div className="card">
            <h3>الإيرادات المحصّلة حسب النوع</h3>
            <div className="bars">
              {data.revenueByKind
                .filter((r) => r.status === 'paid')
                .map((r) => (
                  <div key={r.kind} className="bar-row">
                    <span className="bar-label">{KIND[r.kind] || r.kind}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${(r.total / maxRev) * 100}%` }} />
                    </span>
                    <span className="bar-val">{formatJod(r.total)}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="card">
            <h3>المخالفات</h3>
            {!data.violationsByType.length && <div className="empty">لا مخالفات في الفترة</div>}
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>النوع</th><th>الحالة</th><th>العدد</th></tr></thead>
                <tbody>
                  {data.violationsByType.map((v, i) => (
                    <tr key={i}><td>{TYPE[v.type] || v.type}</td><td>{ISTATUS[v.status] || v.status}</td><td>{v.n}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3>أداء المشغّلين</h3>
            <FilterBar fields={fields} filters={filters} count={ops.length} total={data.operators.length} />
            {!ops.length && <EmptyState />}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>المشغّل</th><th>الترخيص</th><th>الزيارات</th><th>متوسط المدة</th><th>نسبة القبول</th>
                    <th>زمن القبول</th><th>التقييم</th><th>الشكاوى</th><th>مدفوع</th><th>مستحق</th>
                  </tr>
                </thead>
                <tbody>
                  {ops.map((o) => (
                    <tr key={o.id}>
                      <td>{o.name}</td>
                      <td>{OSTATUS[o.status] || o.status}</td>
                      <td>{o.visits}</td>
                      <td>{o.avg_minutes != null ? `${o.avg_minutes} د` : '—'}</td>
                      <td>{o.handoffs ? `${Math.round((o.handoffs_accepted / o.handoffs) * 100)}%` : '—'}</td>
                      <td>{o.avg_accept_min != null ? `${o.avg_accept_min} د` : '—'}</td>
                      <td>{o.rating != null ? `★ ${o.rating} (${o.rating_count})` : '—'}</td>
                      <td>{o.complaints}</td>
                      <td>{formatJod(o.paid)}</td>
                      <td>{formatJod(o.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <TaxReportCard />
    </>
      )}
    </div>
  );
}
