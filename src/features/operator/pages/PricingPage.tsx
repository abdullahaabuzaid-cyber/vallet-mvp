import { FilterBar } from '@/shared/components/ui/filters';
import { useFilters } from '@/shared/hooks/useFilters';
import { filterList } from '@/shared/hooks/filterList';
import { searchField,statusField,sortField } from '@/shared/components/ui/filters/fields';
import { useState } from 'react';
import { api } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
import { useResource } from '@/shared/hooks/useResource';
import { formatJod } from '@/shared/lib/format';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { siteName, useStore } from '@/store';
type Rule = { id: number; siteId?: string; name: string; days: string; startHour: number; endHour: number; fee: number; active: boolean };
const DAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
export default function PricingPage() {
  const sites = useStore((s) => s.operators.flatMap((o) => o.sites));
  const { data, reload } = useResource<{ items: Rule[] }>('/api/pricing/rules', { items: [] });
  const filters=useFilters();
  const shown=filterList(data.items,filters.values,r=>({text:r.name+' '+(r.siteId?siteName(r.siteId):''),status:r.active?'active':'paused',siteId:r.siteId}));
  const [f, setF] = useState({ name: '', siteId: '', days: '0123456', startHour: '18', endHour: '24', fee: '3' });
  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); await reload(); toast(msg, { tone: 'ok' }); } catch (e) { toast((e as Error).message, { tone: 'bad' }); } };
  const toggleDay = (d: string) => setF({ ...f, days: f.days.includes(d) ? f.days.replace(d, '') : f.days + d });
  return <>
    <form className="card stack" onSubmit={(e) => { e.preventDefault(); void act(() => api('/api/pricing/rules', { ...f, startHour: Number(f.startHour), endHour: Number(f.endHour), fee: Number(f.fee) }), 'تمت إضافة قاعدة التسعير'); }}>
      <div className="section-head"><div><h3>قاعدة تسعير جديدة</h3><p>سعر حسب الموقف ووقت الذروة. القاعدة الخاصة بموقف تتقدّم على العامة، ثم الأعلى سعراً.</p></div></div>
      <div className="grid-2"><div className="field"><label>اسم القاعدة</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ذروة المساء" required /></div>
        <div className="field"><label>الموقف</label><select value={f.siteId} onChange={(e) => setF({ ...f, siteId: e.target.value })}><option value="">كل المواقف</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div></div>
      <div className="segmented" role="group" aria-label="الأيام">{DAYS.map((d, i) => <button key={d} type="button" className={f.days.includes(String(i)) ? 'active' : ''} onClick={() => toggleDay(String(i))}>{d}</button>)}</div>
      <div className="grid-2"><div className="field"><label>من الساعة</label><input type="number" min={0} max={24} value={f.startHour} onChange={(e) => setF({ ...f, startHour: e.target.value })} /></div>
        <div className="field"><label>إلى الساعة</label><input type="number" min={0} max={24} value={f.endHour} onChange={(e) => setF({ ...f, endHour: e.target.value })} /></div></div>
      <div className="field"><label>السعر (د.أ)</label><input inputMode="decimal" value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} /></div>
      <button className="btn btn-primary" type="submit">إضافة القاعدة</button>
    </form>
    <FilterBar fields={[searchField('اسم القاعدة أو الموقف'),statusField({active:'فعّالة',paused:'متوقفة'}),sortField]} filters={filters} count={shown.length} total={data.items.length}/>
    <div className="card"><h3>القواعد الحالية</h3>{shown.length ? <div className="table-wrap"><table className="table"><thead><tr><th>القاعدة</th><th>الموقف</th><th>الأيام</th><th>الوقت</th><th>السعر</th><th>الحالة</th><th></th></tr></thead>
      <tbody>{shown.map((r) => <tr key={r.id} data-testid="pricing-rule"><td>{r.name}</td><td>{r.siteId ? siteName(r.siteId) : 'كل المواقف'}</td><td>{r.days.split('').map((d) => DAYS[Number(d)]).join('، ')}</td><td dir="ltr">{r.startHour}:00–{r.endHour}:00</td><td>{formatJod(r.fee)}</td><td>{r.active ? 'فعّالة' : 'متوقفة'}</td>
        <td className="row"><button className="btn btn-sm" type="button" onClick={() => void act(() => api(`/api/pricing/rules/${r.id}`, { active: !r.active }), 'تم التحديث')}>{r.active ? 'إيقاف' : 'تفعيل'}</button><button className="btn btn-sm" type="button" onClick={() => void act(() => api(`/api/pricing/rules/${r.id}`, { delete: true }), 'تم الحذف')}>حذف</button></td></tr>)}</tbody></table></div>
      : <EmptyState title="لا قواعد تسعير" icon="wallet" description="أضف سعراً أساسياً وسعر ذروة لكل موقف." />}</div>
  </>;
}
