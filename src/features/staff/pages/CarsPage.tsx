import { Link } from 'react-router-dom';
import { PrepareButton } from '@/shared/components/visits/ArrivalButtons';
import { Badge } from '@/shared/components/ui/Badge';
import { checkOut, empName, markReady, useStore } from '@/store';
import { durationLabel } from '@/shared/lib/format';
import { FilterBar, type FilterField } from '@/shared/components/ui/filters';
import { searchField, statusField } from '@/shared/components/ui/filters/fields';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { filterList } from '@/shared/hooks/filterList';
import { useFilters } from '@/shared/hooks/useFilters';

const FIELDS: FilterField[] = [
  searchField('اللوحة أو الإيصال'),
  statusField({ parked: 'مركونة', return_pending: 'مطلوبة للإرجاع', ready: 'جاهزة عند المدخل' }),
  { type: 'sort', options: [{ value: 'priority', label: 'المطلوبة أولاً' }, { value: 'newest', label: 'الأحدث دخولاً' }, { value: 'oldest', label: 'الأقدم دخولاً' }, { value: 'plate', label: 'رقم اللوحة' }] },
];

export default function CarsPage() {
  const emp = useStore((s) => s.employees.find((e) => e.id === s.currentEmployeeId));
  const cars = useStore((s) =>
    s.visits
      .filter((v) => (emp?.siteId ? v.siteId === emp.siteId : v.operatorId === emp?.operatorId) && !v.checkOutAt)
      .sort((a, b) => Number(!!b.returnRequestedAt) - Number(!!a.returnRequestedAt))
  );
  const filters = useFilters();
  const filtered = filterList(cars, filters.values, (v) => ({ text: `${v.plate} ${v.receiptNo}`, status: v.readyAt ? 'ready' : v.returnRequestedAt ? 'return_pending' : 'parked', date: v.checkInAt }));
  // "priority" keeps the requested-first order from the store selector.
  const shown = !filters.values.sort || filters.values.sort === 'priority' ? cars.filter((v) => filtered.includes(v)) : filtered;

  return (
    <div className="staff-page">
      <FilterBar fields={FIELDS} filters={filters} count={shown.length} total={cars.length} />
      <div className="card">
        <div className="section-head"><div><h2>السيارات الحالية</h2><p>في عهدة الموقع الآن — {cars.length}. السيارات المطلوبة للإرجاع تظهر أولاً.</p></div></div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>اللوحة</th>
                <th>الإيصال</th>
                <th>المدة</th>
                <th>الموظف</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => (
                <tr key={v.id}>
                  <td>{v.plate}</td>
                  <td>{v.receiptNo}</td>
                  <td>{durationLabel(v.checkInAt)}</td>
                  <td>{empName(v.checkInBy)}</td>
                  <td className="row">
                    {v.readyAt ? (
                      <Badge tone="ok">جاهزة عند المدخل</Badge>
                    ) : v.returnRequestedAt ? (
                      <Badge tone="warn">مطلوبة للإرجاع</Badge>
                    ) : (
                      <Badge tone="info">مركونة</Badge>
                    )}
                    <Link className="btn btn-sm" to={`/staff/condition?visit=${v.id}`}>صور الحالة</Link>
                    <PrepareButton visit={v}/>
                    {v.arrivalEta&&<small>الوصول {new Date(v.arrivalEta).toLocaleTimeString('ar-JO')} {v.preparingAt?'· جاري التجهيز':''}</small>}
                    {!v.readyAt && (
                      <button type="button" className="btn btn-sm" onClick={() => void markReady(v.id)}>
                        جاهزة
                      </button>
                    )}
                    <button type="button" className="btn btn-sm btn-success" onClick={() => void checkOut(v.id)}>
                      تسليم
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && <EmptyState title={cars.length ? 'لا نتائج مطابقة' : 'لا سيارات حالياً'} icon="car" description={cars.length ? 'غيّر الفلاتر أو امسحها.' : 'أي سيارة تستلمها تظهر هنا مباشرة.'} />}
      </div>
    </div>
  );
}
