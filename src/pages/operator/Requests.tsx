import { useState } from 'react';
import { Badge } from '../../components/Layout';
import {
  acceptHandoff,
  empName,
  formatDateTime,
  rejectHandoff,
  siteName,
  useStore,
} from '../../store/useStore';

export default function OperatorRequests() {
  const opId = useStore((s) => s.currentOperatorId);
  const handoffs = useStore((s) => s.handoffs.filter((h) => h.operatorId === opId));
  const employees = useStore((s) =>
    s.employees.filter((e) => e.operatorId === opId && e.active)
  );
  const pending = handoffs.filter((h) => h.status === 'pending');
  const others = handoffs.filter((h) => h.status !== 'pending');
  const [staffPick, setStaffPick] = useState<Record<string, string>>({});

  function pickFor(handoffId: string, siteId: string) {
    if (staffPick[handoffId]) return staffPick[handoffId];
    const atSite = employees.find((e) => e.siteId === siteId);
    return atSite?.id ?? employees[0]?.id ?? '';
  }

  return (
    <>
      <div className="tiles">
        <div className="tile">
          <div className="n">{pending.length}</div>
          <div className="l">طلبات معلّقة</div>
        </div>
        <div className="tile">
          <div className="n">{handoffs.filter((h) => h.status === 'accepted').length}</div>
          <div className="l">مقبولة</div>
        </div>
      </div>

      <div className="card">
        <h2>صندوق طلبات التسليم من السائقين</h2>
        {!pending.length && <div className="empty">لا طلبات معلّقة حالياً</div>}
        <div className="stack">
          {pending.map((h) => {
            const empId = pickFor(h.id, h.siteId);
            return (
              <div key={h.id} className="lot-card" style={{ cursor: 'default', borderColor: 'var(--warning)' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>لوحة {h.plate}</strong>
                  <Badge tone="warn">بانتظار القبول</Badge>
                </div>
                <div className="muted">{siteName(h.siteId)}</div>
                <div className="muted">طُلب: {formatDateTime(h.createdAt)}</div>
                <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
                  <label>تعيين الموظف المستلم</label>
                  <select
                    value={empId}
                    onChange={(e) => setStaffPick((p) => ({ ...p, [h.id]: e.target.value }))}
                  >
                    {employees
                      .filter((e) => !e.siteId || e.siteId === h.siteId)
                      .concat(
                        employees.filter((e) => e.siteId && e.siteId !== h.siteId)
                      )
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
                    <Badge
                      tone={
                        h.status === 'accepted' ? 'ok' : h.status === 'rejected' ? 'bad' : 'info'
                      }
                    >
                      {h.status === 'accepted'
                        ? 'مقبول'
                        : h.status === 'rejected'
                          ? 'مرفوض'
                          : 'ملغى'}
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
