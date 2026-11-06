import { useState } from 'react';
import { Badge } from '../../components/Layout';
import {
  acceptHandoff,
  empName,
  formatDateTime,
  rejectHandoff,
  setAutoAcceptHandoffs,
  siteHasCapacity,
  siteName,
  siteOccupancy,
  useStore,
} from '../../store/useStore';

export default function OperatorRequests() {
  const opId = useStore((s) => s.currentOperatorId);
  const op = useStore((s) => s.operators.find((o) => o.id === opId));
  const handoffs = useStore((s) => s.handoffs);
  const employees = useStore((s) => s.employees);
  const myHandoffs = handoffs.filter((h) => h.operatorId === opId);
  const myEmps = employees.filter((e) => e.operatorId === opId && e.active);
  const pending = myHandoffs.filter((h) => h.status === 'pending');
  const others = myHandoffs.filter((h) => h.status !== 'pending');
  const [staffPick, setStaffPick] = useState<Record<string, string>>({});

  if (!op) return <div className="card empty">لا بيانات</div>;

  function pickFor(handoffId: string, siteId: string) {
    if (staffPick[handoffId]) return staffPick[handoffId];
    const atSite = myEmps.find((e) => e.siteId === siteId);
    return atSite?.id ?? myEmps[0]?.id ?? '';
  }

  return (
    <>
      <div className="card">
        <h2>قبول تلقائي للتسليم</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          عند التفعيل تُقبل طلبات السائقين تلقائياً إذا كان في الموقف سعة متاحة. يمكن إيقاف الخيار في أي وقت.
        </p>
        <label className="auto-toggle">
          <input
            type="checkbox"
            checked={!!op.autoAcceptHandoffs}
            onChange={(e) => setAutoAcceptHandoffs(op.id, e.target.checked)}
          />
          <span>تفعيل القبول التلقائي عند توفر سعة</span>
        </label>
        <div className="stack" style={{ marginTop: 12 }}>
          {op.sites.map((site) => {
            const used = siteOccupancy(site.id);
            const free = siteHasCapacity(site.id);
            return (
              <div key={site.id} className="lot-card" style={{ cursor: 'default' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>
                    {site.name} — {site.area}
                  </strong>
                  <Badge tone={free ? 'ok' : 'bad'}>
                    {used}/{site.capacity} · {free ? 'متاح' : 'ممتلئ'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="n">{pending.length}</div>
          <div className="l">طلبات معلّقة</div>
        </div>
        <div className="tile">
          <div className="n">{myHandoffs.filter((h) => h.status === 'accepted').length}</div>
          <div className="l">مقبولة</div>
        </div>
      </div>

      <div className="card">
        <h2>صندوق طلبات التسليم من السائقين</h2>
        {!pending.length && <div className="empty">لا طلبات معلّقة حالياً</div>}
        <div className="stack">
          {pending.map((h) => {
            const empId = pickFor(h.id, h.siteId);
            const free = siteHasCapacity(h.siteId);
            return (
              <div key={h.id} className="lot-card" style={{ cursor: 'default', borderColor: 'var(--warning)' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>لوحة {h.plate}</strong>
                  <Badge tone="warn">بانتظار القبول</Badge>
                </div>
                <div className="muted">{siteName(h.siteId)}</div>
                <div className="muted">طُلب: {formatDateTime(h.createdAt)}</div>
                <div className="muted">السعة: {free ? 'متاحة للقبول التلقائي' : 'ممتلئة — قبول يدوي فقط'}</div>
                <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
                  <label>تعيين الموظف المستلم</label>
                  <select
                    value={empId}
                    onChange={(e) => setStaffPick((p) => ({ ...p, [h.id]: e.target.value }))}
                  >
                    {myEmps
                      .filter((e) => !e.siteId || e.siteId === h.siteId)
                      .concat(myEmps.filter((e) => e.siteId && e.siteId !== h.siteId))
                      .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                          {e.siteId === h.siteId ? ' (نفس الموقع)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button
                    className="btn btn-success"
                    type="button"
                    disabled={!empId}
                    onClick={() => acceptHandoff(h.id, empId)}
                  >
                    قبول وإنشاء زيارة
                  </button>
                  <button className="btn btn-danger" type="button" onClick={() => rejectHandoff(h.id)}>
                    رفض
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {others.length > 0 && (
        <div className="card">
          <h3>سجل الطلبات</h3>
          <table className="table">
            <thead>
              <tr>
                <th>اللوحة</th>
                <th>الموقع</th>
                <th>الحالة</th>
                <th>الموظف</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              {others.map((h) => (
                <tr key={h.id}>
                  <td>{h.plate}</td>
                  <td>{siteName(h.siteId)}</td>
                  <td>
                    <Badge tone={h.status === 'accepted' ? 'ok' : h.status === 'rejected' ? 'bad' : 'info'}>
                      {h.status === 'accepted' ? 'مقبول' : h.status === 'rejected' ? 'مرفوض' : 'ملغى'}
                    </Badge>
                  </td>
                  <td>{h.assignedEmployeeId ? empName(h.assignedEmployeeId) : '—'}</td>
                  <td>{formatDateTime(h.acceptedAt || h.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
