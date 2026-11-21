import { useState } from 'react';
import { Badge } from '@/shared/components/ui/Badge';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '@/shared/constants/labels';
import { empName, fileComplaint, rateVisit, useStore } from '@/store';
import type { ComplaintCategory, Visit } from '@common/types';
import { ConditionPanel } from '@/shared/components/visits/ConditionPanel';
import { ArrivalButtons } from '@/shared/components/visits/ArrivalButtons';
import { TipBox } from './TipBox';

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

export function VisitFeedback({ visit }: { visit: Visit }) {
  const rating = useStore((s) => s.ratings.find((r) => r.visitId === visit.id));
  const complaints = useStore((s) => s.complaints.filter((c) => c.visitId === visit.id));
  const [stars, setStars] = useState(rating?.stars ?? 0);
  const [comment, setComment] = useState(rating?.comment ?? '');
  const [showComplaint, setShowComplaint] = useState(false);
  const [cat, setCat] = useState<ComplaintCategory>('delay');
  const [desc, setDesc] = useState('');

  return (
    <div className="feedback-box">
      {!visit.checkOutAt && <ArrivalButtons visit={visit}/>}
      <details><summary>صور حالة السيارة والتأكيد</summary><ConditionPanel visitId={visit.id} canReview={!!visit.readyAt||!!visit.checkOutAt}/></details>
      {visit.checkOutAt && (
        <div>
          <div className="muted tiny">{rating ? 'تقييمك' : 'قيّم خدمة'} <strong>{empName(visit.checkOutBy || visit.checkInBy)}</strong></div>
          <Stars value={stars} onChange={setStars} />
          <div className="row">
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="تعليق (اختياري)" style={{ flex: 1 }} />
            <button type="button" className="btn btn-sm btn-primary" disabled={!stars} onClick={() => void rateVisit(visit.id, stars, comment)}>
              {rating ? 'تحديث' : 'إرسال التقييم'}
            </button>
          </div>
        </div>
      )}
      {visit.checkOutAt && <TipBox visitId={visit.id} staffName={empName(visit.checkOutBy || visit.checkInBy)} />}
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
