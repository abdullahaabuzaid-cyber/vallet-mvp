import { Badge } from '../../components/Layout';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS, formatDateTime, siteName, useStore } from '../../store/useStore';

export default function OperatorFeedback() {
  const ratings = useStore((s) => s.ratings);
  const complaints = useStore((s) => s.complaints);
  const avg = ratings.length ? ratings.reduce((a, r) => a + r.stars, 0) / ratings.length : 0;
  return (
    <div className="reg-page">
      <div className="tiles">
        <div className="tile"><div className="n">{avg ? `★ ${avg.toFixed(1)}` : '—'}</div><div className="l">متوسط التقييم</div></div>
        <div className="tile"><div className="n">{ratings.length}</div><div className="l">تقييمات</div></div>
        <div className="tile"><div className="n">{complaints.filter((c) => c.status === 'open' || c.status === 'investigating').length}</div><div className="l">شكاوى مفتوحة</div></div>
      </div>
      <div className="card">
        <h2>الشكاوى عليك</h2>
        <p className="muted" style={{ marginTop: 0 }}>الهيئة تتابع الشكاوى وترد على السائق. للاطلاع فقط.</p>
        {!complaints.length && <div className="empty">لا شكاوى</div>}
        <div className="stack">
          {complaints.map((c) => (
            <div key={c.id} className="complaint-card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{COMPLAINT_CATEGORY_LABELS[c.category]}</strong>
                <Badge tone={c.status === 'resolved' ? 'ok' : c.status === 'rejected' ? 'info' : 'warn'}>{COMPLAINT_STATUS_LABELS[c.status]}</Badge>
              </div>
              <div>{c.description}</div>
              <div className="muted tiny">{c.siteId ? siteName(c.siteId) : ''} · {formatDateTime(c.createdAt)}</div>
              {c.govResponse && <div className="tiny">رد الهيئة: {c.govResponse}</div>}
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h2>تقييمات السائقين</h2>
        {!ratings.length && <div className="empty">لا تقييمات بعد</div>}
        <div className="stack">
          {ratings.map((r) => (
            <div key={r.id} className="row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              <div>
                <span className="stars-static">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                {r.comment && <div className="muted">{r.comment}</div>}
              </div>
              <div className="muted tiny">{r.siteId ? siteName(r.siteId) : ''} · {formatDateTime(r.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
