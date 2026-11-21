import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/shared/components/ui/Badge';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS, HANDOFF_STATUS_LABELS } from '@/shared/constants/labels';
import { cancelHandoff, empName, fileComplaint, operatorName, rateVisit, requestReturn, siteName, useStore } from '@/store';
import { formatDateTime } from '@/shared/lib/format';
import type { ComplaintCategory, HandoffRequest, Visit } from '@common/types';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useFilters } from '@/shared/hooks/useFilters';

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'info' | 'default'> = {
  pending: 'warn',
  accepted: 'ok',
  rejected: 'bad',
  cancelled: 'default',
};

type Stage = { key: string; label: string; at?: string; done: boolean };

function stages(h: HandoffRequest | undefined, v: Visit | undefined): Stage[] {
  return [
    { key: 'req', label: 'أرسلت الطلب', at: h?.createdAt ?? v?.checkInAt, done: true },
    { key: 'recv', label: 'استُلمت السيارة', at: v?.checkInAt, done: !!v },
    { key: 'park', label: 'رُكنت بالموقف', at: v?.parkedAt, done: !!v?.parkedAt },
    { key: 'ret', label: 'طلبت الإرجاع', at: v?.returnRequestedAt, done: !!v?.returnRequestedAt },
    { key: 'ready', label: 'جاهزة عند المدخل', at: v?.readyAt, done: !!v?.readyAt },
    { key: 'out', label: 'سُلّمت لك', at: v?.checkOutAt, done: !!v?.checkOutAt },
  ];
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="stars" role="radiogroup" aria-label="التقييم">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} نجوم`}
          className={n <= value ? 'on' : ''}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function Feedback({ visit }: { visit: Visit }) {
  const rating = useStore((s) => s.ratings.find((r) => r.visitId === visit.id));
  const complaints = useStore((s) => s.complaints.filter((c) => c.visitId === visit.id));
  const [stars, setStars] = useState(rating?.stars ?? 0);
  const [comment, setComment] = useState(rating?.comment ?? '');
  const [showComplaint, setShowComplaint] = useState(false);
  const [cat, setCat] = useState<ComplaintCategory>('delay');
  const [desc, setDesc] = useState('');

  return (
    <div className="feedback-box">
      {visit.checkOutAt && (
        <div>
          <div className="muted tiny">{rating ? 'تقييمك' : 'قيّم الخدمة'}</div>
          <Stars value={stars} onChange={setStars} />
          <div className="row">
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="تعليق (اختياري)" style={{ flex: 1 }} />
            <button type="button" className="btn btn-sm btn-primary" disabled={!stars} onClick={() => void rateVisit(visit.id, stars, comment)}>
              {rating ? 'تحديث' : 'إرسال التقييم'}
            </button>
          </div>
        </div>
      )}
      {complaints.map((c) => (
        <div key={c.id} className="complaint-mini">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>شكوى: {COMPLAINT_CATEGORY_LABELS[c.category]}</strong>
            <Badge tone={c.status === 'resolved' ? 'ok' : c.status === 'rejected' ? 'bad' : 'warn'}>{COMPLAINT_STATUS_LABELS[c.status]}</Badge>
          </div>
          <div className="muted tiny">{c.description}</div>
          {c.govResponse && <div className="tiny">رد الهيئة: {c.govResponse}</div>}
        </div>
      ))}
      {showComplaint ? (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await fileComplaint({ visitId: visit.id, category: cat, description: desc });
            if (r) {
              setDesc('');
              setShowComplaint(false);
            }
          }}
        >
          <select value={cat} onChange={(e) => setCat(e.target.value as ComplaintCategory)} aria-label="نوع الشكوى">
            {Object.entries(COMPLAINT_CATEGORY_LABELS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="اشرح المشكلة" required minLength={5} />
          <div className="row">
            <button type="submit" className="btn btn-sm btn-danger">إرسال الشكوى للهيئة</button>
            <button type="button" className="btn btn-sm" onClick={() => setShowComplaint(false)}>إلغاء</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowComplaint(true)}>
          تقديم شكوى
        </button>
      )}
    </div>
  );
}

export default function StatusPage() {
  const driverAuth = useStore((s) => s.driverAuth);
  const handoffs = useStore((s) => s.handoffs);
  const visits = useStore((s) => s.visits);
  const filters = useFilters();

  if (!driverAuth?.verified) {
    return (
      <div className="phone-shell">
        <div className="card">
          <h2>طلباتي</h2>
          <p className="muted">سجّل الدخول برقم هاتفك لتتابع سيارتك مباشرة.</p>
          <Link to="/driver/auth" className="btn btn-primary">تسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  // Items = handoffs (with their visit) + walk-in visits linked by phone
  const linkedVisitIds = new Set(handoffs.map((h) => h.visitId).filter(Boolean));
  const walkIns = visits.filter((v) => !linkedVisitIds.has(v.id) && !v.handoffId);
  const all: { key: string; h?: HandoffRequest; v?: Visit; at: string }[] = [
    ...handoffs.map((h) => ({ key: h.id, h, v: h.visitId ? visits.find((x) => x.id === h.visitId) : undefined, at: h.createdAt })),
    ...walkIns.map((v) => ({ key: v.id, v, at: v.checkInAt })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const isDone = (i: (typeof all)[number]) => !!i.v?.checkOutAt || (!!i.h && i.h.status !== 'pending' && i.h.status !== 'accepted');
  const needle = filters.values.q.replace(/[\s-]/g, '');
  const items = all
    .filter((i) => !filters.values.status || (filters.values.status === 'done') === isDone(i))
    .filter((i) => !needle || (i.v?.plate || i.h?.plate || '').replace(/[\s-]/g, '').includes(needle));

  return (
    <div className="phone-shell">
      <div className="card">
        <h2>طلباتي</h2>
        <p className="muted" style={{ marginTop: 0 }}>الحالة تتحدّث مباشرة لما الموظف يستلم أو يجهّز سيارتك.</p>
        {all.length > 0 && (
          <div className="driver-filter">
            <div className="segmented" role="group" aria-label="تصفية الطلبات">
              {[['', 'الكل'], ['active', 'الحالية'], ['done', 'المكتملة']].map(([k, l]) => (
                <button key={k} type="button" className={filters.values.status === k ? 'active' : ''} onClick={() => filters.set('status', k)}>{l}</button>
              ))}
            </div>
            {all.length > 3 && <input type="search" value={filters.values.q} onChange={(e) => filters.set('q', e.target.value)} placeholder="ابحث برقم اللوحة" aria-label="بحث برقم اللوحة" />}
            <span className="muted tiny">{items.length} من {all.length}</span>
          </div>
        )}
        {!items.length && <EmptyState icon="car" title={all.length ? 'لا طلبات مطابقة' : 'لا طلبات بعد'} description={all.length ? 'غيّر التصفية لعرض طلباتك الأخرى.' : 'اختر موقفاً مرخّصاً من الخريطة واطلب التسليم.'} />}
        <div className="stack">
          {items.map(({ key, h, v }) => {
            const st = stages(h, v);
            const status = v?.checkOutAt ? 'تم التسليم' : v?.readyAt ? 'جاهزة' : v ? 'في الموقف' : h ? HANDOFF_STATUS_LABELS[h.status] : '';
            const tone = v?.readyAt && !v.checkOutAt ? 'ok' : v?.checkOutAt ? 'default' : h ? TONE[h.status] : 'info';
            const showTrack = !!v || h?.status === 'pending';
            return (
              <div key={key} className={`lot-card driver-visit ${v?.readyAt && !v.checkOutAt ? 'is-ready' : ''}`} style={{ cursor: 'default' }} data-testid="driver-visit">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong className="plate-cell">{h?.plate ?? v?.plate}</strong>
                  <Badge tone={tone}>{status}</Badge>
                </div>
                <div className="muted">{siteName((h?.siteId ?? v?.siteId)!)}</div>
                <div className="muted">{operatorName((h?.operatorId ?? v?.operatorId)!)}</div>
                {v && (
                  <div className="tiny" style={{ marginTop: 4 }}>
                    استلم: {empName(v.checkInBy)} · إيصال {v.receiptNo}
                    {v.checkOutBy && <> · سلّم: {empName(v.checkOutBy)}</>}
                  </div>
                )}
                {showTrack && (
                  <ol className="mini-track">
                    {st.map((s) => (
                      <li key={s.key} className={s.done ? 'done' : ''}>
                        <span>{s.label}</span>
                        {s.at && s.done && <small>{formatDateTime(s.at)}</small>}
                      </li>
                    ))}
                  </ol>
                )}
                <div className="row" style={{ marginTop: 8 }}>
                  {h?.status === 'pending' && (
                    <button type="button" className="btn btn-sm" onClick={() => void cancelHandoff(h.id)}>
                      إلغاء الطلب
                    </button>
                  )}
                  {v && !v.checkOutAt && !v.returnRequestedAt && (
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => void requestReturn(v.id)}>
                      اطلب سيارتك الآن
                    </button>
                  )}
                </div>
                {v && <Feedback visit={v} />}
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
