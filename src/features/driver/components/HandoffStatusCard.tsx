import { Link } from 'react-router-dom';
import { Badge } from '@/shared/components/ui/Badge';
import { HANDOFF_STATUS_LABELS } from '@/shared/constants/labels';
import { formatDateTime } from '@/shared/lib/format';
import { useStore } from '@/store';

/** Live tracking of one handoff request (pending → accepted → ready → delivered). */
export function HandoffStatusCard({ handoffId, onNew }: { handoffId: string; onNew: () => void }) {
  const handoff = useStore((s) => s.handoffs.find((h) => h.id === handoffId));
  const visit = useStore((s) =>
    handoff?.visitId ? s.visits.find((v) => v.id === handoff.visitId) : undefined
  );
  const op = useStore((s) =>
    handoff ? s.operators.find((o) => o.id === handoff.operatorId) : undefined
  );
  const site = useStore((s) => {
    if (!handoff) return undefined;
    const operator = s.operators.find((o) => o.id === handoff.operatorId);
    return operator?.sites.find((x) => x.id === handoff.siteId);
  });
  const staff = useStore((s) =>
    handoff?.assignedEmployeeId
      ? s.employees.find((e) => e.id === handoff.assignedEmployeeId)
      : undefined
  );

  if (!handoff) return null;

  const pending = handoff.status === 'pending';

  return (
    <div className="driver-landing">
      <section className="driver-hero compact">
        <p className="driver-kicker">تتبّع الزيارة</p>
        <h1>{HANDOFF_STATUS_LABELS[handoff.status]}</h1>
      </section>
      <section className="driver-sheet tracking">
        <div className="sheet-handle" aria-hidden />
        <div className="tracking-card">
          <div className={`tracking-pulse ${pending ? 'live' : 'done'}`} aria-hidden />
          <div className="tracking-plate">{handoff.plate}</div>
          <div className="muted">
            {site?.name} — {site?.area}
          </div>
          <div className="muted">طُلب: {formatDateTime(handoff.createdAt)}</div>

          {pending && (
            <p className="tracking-hint">
              بانتظار قبول المشغّل… رح توصلك الحالة هون مباشرة أول ما يقبل الطلب.
            </p>
          )}

          {handoff.status === 'accepted' && (
            <div className="tracking-details">
              <div>
                <span className="muted">الشركة</span>
                <strong>{op?.name}</strong>
              </div>
              <div>
                <span className="muted">استلم</span>
                <strong>{staff?.name ?? '—'}</strong>
              </div>
              <div>
                <span className="muted">وقت الاستلام</span>
                <strong>{handoff.acceptedAt ? formatDateTime(handoff.acceptedAt) : '—'}</strong>
              </div>
              {visit && (
                <div>
                  <span className="muted">إيصال</span>
                  <strong>{visit.receiptNo}</strong>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                {visit?.checkOutAt ? (
                  <Badge tone="ok">تم الخروج · {formatDateTime(visit.checkOutAt)}</Badge>
                ) : visit?.readyAt ? (
                  <Badge tone="ok">سيارتك جاهزة عند المدخل 🚗</Badge>
                ) : (
                  <Badge tone="info">السيارة لا تزال في الموقف</Badge>
                )}
              </div>
            </div>
          )}

          {(handoff.status === 'rejected' || handoff.status === 'cancelled') && (
            <p className="tracking-hint">يمكنك إرسال طلب جديد لموقف آخر.</p>
          )}

          <div className="row" style={{ marginTop: 16 }}>
            {handoff.status !== 'pending' && (
              <button className="btn btn-primary" type="button" onClick={onNew}>
                طلب جديد
              </button>
            )}
            <Link to="/driver/status" className="btn">
              كل الطلبات
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
