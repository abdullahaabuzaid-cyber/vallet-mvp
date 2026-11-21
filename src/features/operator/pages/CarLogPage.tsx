import { useMemo, useState } from 'react';
import type { Visit } from '@common/types';
import { useStore } from '@/store';
import { CarLogList } from '../components/CarLogList';
import { VisitDetailDrawer } from '../components/VisitDetailDrawer';

type StatusFilter = 'all' | 'inside' | 'delivered' | 'return_pending';

function matchesStatus(v: Visit, f: StatusFilter) {
  if (f === 'all') return true;
  if (f === 'inside') return !v.checkOutAt && !v.returnRequestedAt;
  if (f === 'return_pending') return !v.checkOutAt && !!v.returnRequestedAt;
  return !!v.checkOutAt;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function CarLogPage() {
  const opId = useStore((s) => s.currentOperatorId);
  const visits = useStore((s) => s.visits.filter((v) => v.operatorId === opId));
  const [todayOnly, setTodayOnly] = useState(true);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visits
      .filter((v) => (!todayOnly || isToday(v.checkInAt) || (v.checkOutAt ? isToday(v.checkOutAt) : false)))
      .filter((v) => matchesStatus(v, status))
      .filter((v) => {
        if (!needle) return true;
        return (
          v.plate.toLowerCase().includes(needle) ||
          v.receiptNo.toLowerCase().includes(needle) ||
          (v.ownerPhone || '').includes(needle) ||
          (v.carMake || '').toLowerCase().includes(needle) ||
          (v.carModel || '').toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime());
  }, [visits, todayOnly, status, q]);

  const selected = selectedId ? visits.find((v) => v.id === selectedId) : undefined;

  return (
    <div className="car-log">
      <div className="card car-log-hero">
        <div>
          <h2>سجل السيارات</h2>
          <p className="muted" style={{ margin: 0 }}>
            كل الزيارات: اللوحة، السيارة، المالك، الدخول/الخروج، والموظفون. اضغط سطراً للتفاصيل والخط الزمني.
          </p>
        </div>
        <div className="car-log-stats">
          <div>
            <strong>{filtered.length}</strong>
            <span>معروضة</span>
          </div>
          <div>
            <strong>{visits.filter((v) => !v.checkOutAt).length}</strong>
            <span>داخل الموقف</span>
          </div>
        </div>
      </div>

      <div className="card car-log-filters">
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label>بحث باللوحة / الهاتف / السيارة</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="مثال: 12-34567"
            inputMode="search"
          />
        </div>
        <div className="view-toggle" role="tablist" aria-label="اليوم">
          <button type="button" className={todayOnly ? 'active' : ''} onClick={() => setTodayOnly(true)}>
            اليوم
          </button>
          <button type="button" className={!todayOnly ? 'active' : ''} onClick={() => setTodayOnly(false)}>
            الكل
          </button>
        </div>
        <div className="view-toggle" role="tablist" aria-label="الحالة">
          {(
            [
              ['all', 'الكل'],
              ['inside', 'داخل الموقف'],
              ['return_pending', 'بانتظار التسليم'],
              ['delivered', 'تم التسليم'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" className={status === k ? 'active' : ''} onClick={() => setStatus(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>


      <CarLogList visits={filtered} onSelect={setSelectedId} />

      {selected && <VisitDetailDrawer visit={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
