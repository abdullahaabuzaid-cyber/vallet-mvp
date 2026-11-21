import { FilterBar } from '@/shared/components/ui/filters';
import { useFilters, filterQuery } from '@/shared/hooks/useFilters';
import { filterList } from '@/shared/hooks/filterList';
import { searchField,dateField,sortField } from '@/shared/components/ui/filters/fields';
import { useState } from 'react';
import { api } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
import { useResource } from '@/shared/hooks/useResource';
import { formatDateTime, formatJod } from '@/shared/lib/format';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useStore } from '@/store';
type Shift = { id: number; employeeName: string; startsAt: string; endsAt: string };
type Perf = { id: string; name: string; cars_in: number; cars_out: number; avg_ready_min: number | null; rating: number | null; ratings: number; tips: number; shift_hours: number; carsPerHour: number | null };
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
export default function ShiftsPage() {
  const employees = useStore((s) => s.employees.filter((e) => e.active));
  const filters=useFilters();
  const shifts = useResource<{ items: Shift[] }>(`/api/shifts?${filterQuery(filters.values,200)}`, { items: [] });
  const perf = useResource<{ items: Perf[] }>(`/api/staff-performance?${filterQuery(filters.values,200)}`, { items: [] });
  const [f, setF] = useState({ employeeId: '', startsAt: local(new Date(Date.now() + 3600_000)), endsAt: local(new Date(Date.now() + 9 * 3600_000)) });
  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); await shifts.reload(); await perf.reload(); toast(msg, { tone: 'ok' }); } catch (e) { toast((e as Error).message, { tone: 'bad' }); } };
  const shown=filterList(shifts.data.items,filters.values,s=>({text:s.employeeName,date:s.startsAt,employeeId:undefined}));
  const perfShown=filterList(perf.data.items,filters.values,p=>({text:p.name,employeeId:p.id}));
  return <>
    <form className="card stack" onSubmit={(e) => { e.preventDefault(); void act(() => api('/api/shifts', { employeeId: f.employeeId, startsAt: new Date(f.startsAt).toISOString(), endsAt: new Date(f.endsAt).toISOString() }), 'تمت جدولة الوردية'); }}>
      <h3>جدولة وردية</h3>
      <div className="grid-2"><div className="field"><label>الموظف</label><select value={f.employeeId} onChange={(e) => setF({ ...f, employeeId: e.target.value })} required><option value="">اختر</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div><div /></div>
      <div className="grid-2"><div className="field"><label>البداية</label><input type="datetime-local" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /></div><div className="field"><label>النهاية</label><input type="datetime-local" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} /></div></div>
      <button className="btn btn-primary" type="submit">إضافة الوردية</button>
    </form>
    <FilterBar fields={[searchField('اسم الموظف'),dateField,sortField]} filters={filters} count={shown.length} total={shifts.data.items.length}/>
    <div className="card"><h3>الورديات القادمة والحالية</h3>{shown.length ? <ul className="activity-list">{shown.map((s) => <li key={s.id} data-testid="shift"><span><strong>{s.employeeName}</strong> · {formatDateTime(s.startsAt)} ← {formatDateTime(s.endsAt)}</span><button className="btn btn-sm" type="button" onClick={() => void act(() => api(`/api/shifts/${s.id}/delete`, {}), 'تم حذف الوردية')}>حذف</button></li>)}</ul> : <EmptyState title="لا ورديات مجدولة" icon="clock" />}</div>
    <div className="card"><div className="section-head"><div><h3>أداء الموظفين — آخر 30 يوماً</h3><p>استلام وتسليم، سرعة التجهيز، التقييم بالاسم، والإكراميات.</p></div></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>الموظف</th><th>استلام</th><th>تسليم</th><th>متوسط التجهيز</th><th>التقييم</th><th>الإكراميات</th><th>ساعات الوردية</th><th>سيارة/ساعة</th></tr></thead>
        <tbody>{perfShown.map((p) => <tr key={p.id} data-testid="perf-row"><td>{p.name}</td><td>{p.cars_in}</td><td>{p.cars_out}</td><td>{p.avg_ready_min == null ? '—' : `${p.avg_ready_min} د`}</td><td>{p.rating == null ? '—' : `${p.rating} ★ (${p.ratings})`}</td><td>{formatJod(p.tips)}</td><td>{p.shift_hours.toFixed(1)}</td><td>{p.carsPerHour ?? '—'}</td></tr>)}</tbody></table></div></div>
  </>;
}
