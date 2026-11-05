import { Link } from 'react-router-dom';
import { Badge } from '../../components/Layout';
import {
  empName,
  formatDateTime,
  HANDOFF_STATUS_LABELS,
  operatorName,
  siteName,
  useStore,
} from '../../store/useStore';

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'info' | 'default'> = {
  pending: 'warn',
  accepted: 'ok',
  rejected: 'bad',
  cancelled: 'default',
};

export default function DriverStatus() {
  const handoffs = useStore((s) => s.handoffs);
  const visits = useStore((s) => s.visits);

  return (
    <div className="phone-shell">
      <div className="card">
        <h2>طلباتي</h2>
        {!handoffs.length && <div className="empty">لا طلبات بعد</div>}
        <div className="stack">
          {handoffs.map((h) => {
            const visit = h.visitId ? visits.find((v) => v.id === h.visitId) : undefined;
            return (
              <div key={h.id} className="lot-card" style={{ cursor: 'default' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{h.plate}</strong>
                  <Badge tone={TONE[h.status] || 'info'}>{HANDOFF_STATUS_LABELS[h.status]}</Badge>
                </div>
                <div className="muted">{siteName(h.siteId)}</div>
                <div className="muted">{operatorName(h.operatorId)}</div>
                <div className="muted">{formatDateTime(h.createdAt)}</div>
                {h.status === 'accepted' && (
                  <div style={{ marginTop: 6, fontSize: 0.9 }}>
                    استلم: {h.assignedEmployeeId ? empName(h.assignedEmployeeId) : '—'}
                    {h.acceptedAt && <> · {formatDateTime(h.acceptedAt)}</>}
                    {visit?.checkOutAt && (
                      <div>خروج: {formatDateTime(visit.checkOutAt)}</div>
                    )}
                    {visit && <div>إيصال: {visit.receiptNo}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Link to="/driver" className="btn" style={{ display: 'inline-block', marginTop: 12 }}>
          العودة
        </Link>
      </div>
    </div>
  );
}
