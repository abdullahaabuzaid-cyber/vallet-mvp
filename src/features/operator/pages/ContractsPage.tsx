import { FilterBar } from '@/shared/components/ui/filters';
import { useFilters, filterQuery } from '@/shared/hooks/useFilters';
import { searchField,statusField,kindField } from '@/shared/components/ui/filters/fields';
import { useState } from 'react';
import { api } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
import { useResource } from '@/shared/hooks/useResource';
import { formatJod } from '@/shared/lib/format';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useStore } from '@/store';
type C = { id: number; venue: string; venueType: string; siteName: string; monthlyFee: number; perVisitFee: number; status: string };
type I = { id: number; number: string; venue: string; period: string; visits: number; amount: number; status: string };
export const VENUE: Record<string, string> = { restaurant: 'مطعم', hotel: 'فندق', mall: 'مول', event: 'قاعة/مناسبات', other: 'أخرى' };
const lastMonth = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); };
export default function ContractsPage() {
  const sites = useStore((s) => s.operators.flatMap((o) => o.sites));
  const filters=useFilters(),invFilters=useFilters({},'inv');
  const contracts = useResource<{ items: C[] }>(`/api/contracts?${filterQuery(filters.values,200)}`, { items: [] });
  const invoices = useResource<{ items: I[] }>(`/api/contract-invoices?${filterQuery(invFilters.values,200)}`, { items: [] });
  const [f, setF] = useState({ venue: '', venueType: 'restaurant', siteId: '', monthlyFee: '300', perVisitFee: '0.5' });
  const [period, setPeriod] = useState(lastMonth());
  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); await contracts.reload(); await invoices.reload(); toast(msg, { tone: 'ok' }); } catch (e) { toast((e as Error).message, { tone: 'bad' }); } };
  return <>
    <form className="card stack" onSubmit={(e) => { e.preventDefault(); void act(() => api('/api/contracts', { ...f, monthlyFee: Number(f.monthlyFee), perVisitFee: Number(f.perVisitFee) }), 'تم إنشاء العقد'); }}>
      <h3>عقد جديد مع جهة</h3>
      <div className="grid-2"><div className="field"><label>اسم الجهة</label><input value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} placeholder="مطعم الشام" required /></div>
        <div className="field"><label>النوع</label><select value={f.venueType} onChange={(e) => setF({ ...f, venueType: e.target.value })}>{Object.entries(VENUE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div></div>
      <div className="grid-2"><div className="field"><label>الموقف</label><select value={f.siteId} onChange={(e) => setF({ ...f, siteId: e.target.value })} required><option value="">اختر</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="grid-2"><div className="field"><label>شهري (د.أ)</label><input value={f.monthlyFee} onChange={(e) => setF({ ...f, monthlyFee: e.target.value })} /></div><div className="field"><label>لكل سيارة</label><input value={f.perVisitFee} onChange={(e) => setF({ ...f, perVisitFee: e.target.value })} /></div></div></div>
      <button className="btn btn-primary" type="submit">حفظ العقد</button>
    </form>
    <FilterBar fields={[searchField('اسم الجهة أو الموقف'),statusField({active:'ساري',ended:'منتهي'}),kindField(VENUE)]} filters={filters} count={contracts.data.items.length}/>
    <div className="card"><div className="section-head"><div><h3>العقود</h3><p>الفاتورة الشهرية = الرسم الثابت + رسم السيارة × عدد زيارات الموقف بالشهر.</p></div><input aria-label="شهر الفوترة" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
      {contracts.data.items.length ? <div className="table-wrap"><table className="table"><thead><tr><th>الجهة</th><th>النوع</th><th>الموقف</th><th>شهري</th><th>لكل سيارة</th><th>الحالة</th><th></th></tr></thead>
        <tbody>{contracts.data.items.map((c) => <tr key={c.id} data-testid="contract"><td>{c.venue}</td><td>{VENUE[c.venueType]}</td><td>{c.siteName}</td><td>{formatJod(c.monthlyFee)}</td><td>{formatJod(c.perVisitFee)}</td><td><Badge tone={c.status === 'active' ? 'ok' : 'default'}>{c.status === 'active' ? 'ساري' : 'منتهي'}</Badge></td>
          <td className="row">{c.status === 'active' && <><button className="btn btn-sm btn-primary" type="button" onClick={() => void act(() => api(`/api/contracts/${c.id}/invoice`, { period }), `تم إصدار فاتورة ${period}`)}>فوترة {period}</button><button className="btn btn-sm" type="button" onClick={() => void act(() => api(`/api/contracts/${c.id}/end`, {}), 'تم إنهاء العقد')}>إنهاء</button></>}</td></tr>)}</tbody></table></div> : <EmptyState title="لا عقود بعد" icon="file" description="أضف المطاعم والفنادق والمولات اللي بتخدمها." />}
    </div>
    <FilterBar fields={[searchField('رقم الفاتورة أو الجهة'),statusField({unpaid:'غير مدفوعة',paid:'مدفوعة'})]} filters={invFilters} count={invoices.data.items.length}/>
    <div className="card"><h3>فواتير الجهات</h3>{invoices.data.items.length ? <div className="table-wrap"><table className="table"><thead><tr><th>الرقم</th><th>الجهة</th><th>الشهر</th><th>الزيارات</th><th>المبلغ</th><th>الحالة</th><th></th></tr></thead>
      <tbody>{invoices.data.items.map((i) => <tr key={i.id} data-testid="b2b-invoice"><td>{i.number}</td><td>{i.venue}</td><td>{i.period}</td><td>{i.visits}</td><td>{formatJod(i.amount)}</td><td><Badge tone={i.status === 'paid' ? 'ok' : 'warn'}>{i.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'}</Badge></td>
        <td>{i.status === 'unpaid' && <button className="btn btn-sm" type="button" onClick={() => void act(() => api(`/api/contract-invoices/${i.id}/paid`, {}), 'تم تسجيل الدفع')}>تسجيل دفع</button>}</td></tr>)}</tbody></table></div> : <EmptyState title="لا فواتير" icon="wallet" />}</div>
  </>;
}
