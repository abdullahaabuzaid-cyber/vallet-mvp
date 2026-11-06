import { useMemo, useState } from 'react';
import { Badge } from '../../components/Layout';
import {
  durationLabel,
  empName,
  formatDateTime,
  formatTime,
  siteName,
  useStore,
  visitStatusLabel,
  visitTimeline,
} from '../../store/useStore';
import type { Visit } from '../../types';

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

function statusTone(v: Visit): 'ok' | 'warn' | 'info' {
  const s = visitStatusLabel(v);
  if (s === 'تم التسليم') return 'ok';
  if (s === 'بانتظار التسليم') return 'warn';
  return 'info';
}

function carLabel(v: Visit) {
  const parts = [v.carMake, v.carModel, v.carColor].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

export default function OperatorCarLog() {
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

      <div className="card car-log-table-wrap">
        <table className="table car-log-table">
          <thead>
            <tr>
              <th></th>
              <th>اللوحة</th>
              <th>السيارة</th>
              <th>هاتف المالك</th>
              <th>الموقف</th>
              <th>الحالة</th>
              <th>دخول</th>
              <th>خروج</th>
              <th>المدة</th>
              <th>استلم</th>
              <th>سلّم</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} className="car-log-row" onClick={() => setSelectedId(v.id)}>
                <td>
                  {v.photoThumb ? (
                    <img src={v.photoThumb} alt="" className="car-thumb" width={48} height={32} />
                  ) : (
                    <div className="car-thumb car-thumb-empty">—</div>
                  )}
                </td>
                <td>
                  <strong className="plate-cell">{v.plate}</strong>
                  <div className="muted tiny">{v.receiptNo}</div>
                </td>
                <td>{carLabel(v)}</td>
                <td dir="ltr">{v.ownerPhone || '—'}</td>
                <td>{siteName(v.siteId)}</td>
                <td>
                  <Badge tone={statusTone(v)}>{visitStatusLabel(v)}</Badge>
                </td>
                <td>{formatTime(v.checkInAt)}</td>
                <td>{v.checkOutAt ? formatTime(v.checkOutAt) : '—'}</td>
                <td>{durationLabel(v.checkInAt, v.checkOutAt)}</td>
                <td>{empName(v.checkInBy)}</td>
                <td>{v.checkOutBy ? empName(v.checkOutBy) : '—'}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={11} className="empty">
                  لا نتائج مطابقة للفلاتر
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="car-log-cards">
          {filtered.map((v) => (
            <button key={v.id} type="button" className="car-card" onClick={() => setSelectedId(v.id)}>
              <div className="car-card-top">
                {v.photoThumb ? (
                  <img src={v.photoThumb} alt="" className="car-thumb" width={64} height={44} />
                ) : (
                  <div className="car-thumb car-thumb-empty">سيارة</div>
                )}
                <div>
                  <strong className="plate-cell">{v.plate}</strong>
                  <div className="muted tiny">{carLabel(v)}</div>
                  <Badge tone={statusTone(v)}>{visitStatusLabel(v)}</Badge>
                </div>
              </div>
              <div className="car-card-meta">
                <span>{siteName(v.siteId)}</span>
                <span>دخول {formatTime(v.checkInAt)}</span>
                <span>{v.checkOutAt ? `خروج ${formatTime(v.checkOutAt)}` : 'ما زالت داخل'}</span>
                <span>{durationLabel(v.checkInAt, v.checkOutAt)}</span>
              </div>
              <div className="muted tiny">
                استلم: {empName(v.checkInBy)}
                {v.checkOutBy ? ` · سلّم: ${empName(v.checkOutBy)}` : ''}
                {v.ownerPhone ? ` · ${v.ownerPhone}` : ''}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelectedId(null)} role="presentation">
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="تفاصيل الزيارة"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <div>
                <div className="muted tiny">{selected.receiptNo}</div>
                <h3 className="plate-cell" style={{ margin: '4px 0' }}>
                  {selected.plate}
                </h3>
                <Badge tone={statusTone(selected)}>{visitStatusLabel(selected)}</Badge>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => setSelectedId(null)}>
                إغلاق
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-car">
                {selected.photoThumb ? (
                  <img src={selected.photoThumb} alt="" className="car-thumb-lg" />
                ) : (
                  <div className="car-thumb-lg car-thumb-empty">لا صورة</div>
                )}
                <div className="stack" style={{ gap: 6 }}>
                  <div>
                    <span className="muted">السيارة</span>
                    <div>
                      <strong>{carLabel(selected)}</strong>
                    </div>
                  </div>
                  <div>
                    <span className="muted">هاتف المالك</span>
                    <div dir="ltr">{selected.ownerPhone || '—'}</div>
                  </div>
                  <div>
                    <span className="muted">الموقف</span>
                    <div>{siteName(selected.siteId)}</div>
                  </div>
                  <div>
                    <span className="muted">المدة</span>
                    <div>{durationLabel(selected.checkInAt, selected.checkOutAt)}</div>
                  </div>
                  {selected.notes && (
                    <div>
                      <span className="muted">ملاحظات</span>
                      <div>{selected.notes}</div>
                    </div>
                  )}
                </div>
              </div>

              <h4 style={{ marginBottom: 8 }}>الخط الزمني</h4>
              <ol className="timeline">
                {visitTimeline(selected).map((step) => (
                  <li key={step.key} className={step.done ? 'done' : 'pending'}>
                    <div className="timeline-dot" />
                    <div>
                      <strong>{step.label}</strong>
                      {step.at ? (
                        <div className="muted tiny">{formatDateTime(step.at)}</div>
                      ) : (
                        <div className="muted tiny">لم يحدث بعد</div>
                      )}
                      {step.by && <div className="tiny">الموظف: {step.by}</div>}
                    </div>
                  </li>
                ))}
              </ol>

              <div className="drawer-staff">
                <div>
                  <span className="muted">استلمها</span>
                  <div>
                    <strong>{empName(selected.checkInBy)}</strong>
                  </div>
                </div>
                <div>
                  <span className="muted">سلّمها</span>
                  <div>
                    <strong>{selected.checkOutBy ? empName(selected.checkOutBy) : '—'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
