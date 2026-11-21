import { useState } from 'react';
import { Badge } from '@/shared/components/ui/Badge';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '@/shared/constants/labels';
import { formatDateTime } from '@/shared/lib/format';
import { operatorName, siteName, updateComplaint, useStore } from '@/store';
import type { ComplaintStatus } from '@common/types';

const TONE: Record<ComplaintStatus, 'ok' | 'warn' | 'bad' | 'info'> = {
  open: 'bad',
  investigating: 'warn',
  resolved: 'ok',
  rejected: 'info',
};

export default function ComplaintsPage() {
  const complaints = useStore((s) => s.complaints);
  const ratings = useStore((s) => s.ratings);
  const visits = useStore((s) => s.visits);
  const [filter, setFilter] = useState<'active' | ComplaintStatus | 'all'>('active');
  const [responses, setResponses] = useState<Record<number, string>>({});

  const list = complaints.filter((c) =>
    filter === 'all' ? true : filter === 'active' ? c.status === 'open' || c.status === 'investigating' : c.status === filter
  );
  const avg = ratings.length ? ratings.reduce((a, r) => a + r.stars, 0) / ratings.length : 0;

  return (
    <div className="reg-page">
      <div className="tiles">
        <div className="tile"><div className="n">{complaints.filter((c) => c.status === 'open').length}</div><div className="l">شكاوى جديدة</div></div>
        <div className="tile"><div className="n">{complaints.filter((c) => c.status === 'investigating').length}</div><div className="l">قيد المتابعة</div></div>
        <div className="tile"><div className="n">{complaints.filter((c) => c.status === 'resolved').length}</div><div className="l">تمت المعالجة</div></div>
        <div className="tile"><div className="n">{avg ? avg.toFixed(1) : '—'}</div><div className="l">متوسط التقييم ({ratings.length})</div></div>
      </div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>طابور الشكاوى</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="تصفية">
            <option value="active">المفتوحة</option>
            <option value="all">الكل</option>
            {Object.entries(COMPLAINT_STATUS_LABELS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
        {!list.length && <div className="empty">لا شكاوى</div>}
        <div className="stack" style={{ marginTop: 12 }}>
          {list.map((c) => {
            const v = c.visitId ? visits.find((x) => x.id === c.visitId) : undefined;
            return (
              <div key={c.id} className="complaint-card" data-testid="complaint">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>#{c.id} · {COMPLAINT_CATEGORY_LABELS[c.category]}</strong>
                  <Badge tone={TONE[c.status]}>{COMPLAINT_STATUS_LABELS[c.status]}</Badge>
                </div>
                <p style={{ margin: '6px 0' }}>{c.description}</p>
                <div className="muted tiny">
                  {c.operatorId ? operatorName(c.operatorId) : '—'}
                  {c.siteId && <> · {siteName(c.siteId)}</>}
                  {v && <> · {v.plate} ({v.receiptNo})</>}
                  {c.driverPhone && <> · <span dir="ltr">{c.driverPhone}</span></>}
                  {' · '}
                  {formatDateTime(c.createdAt)}
                </div>
                {c.govResponse && <div className="tiny" style={{ marginTop: 4 }}>رد الهيئة: {c.govResponse}</div>}
                {(c.status === 'open' || c.status === 'investigating') && (
                  <div className="row" style={{ marginTop: 8 }}>
                    <input
                      style={{ flex: 1, minWidth: 180 }}
                      placeholder="رد الهيئة للسائق"
                      value={responses[c.id] ?? ''}
                      onChange={(e) => setResponses((p) => ({ ...p, [c.id]: e.target.value }))}
                    />
                    {c.status === 'open' && (
                      <button type="button" className="btn btn-sm" onClick={() => void updateComplaint(c.id, 'investigating', responses[c.id])}>
                        متابعة
                      </button>
                    )}
                    <button type="button" className="btn btn-sm btn-success" onClick={() => void updateComplaint(c.id, 'resolved', responses[c.id])}>
                      تمت المعالجة
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => void updateComplaint(c.id, 'rejected', responses[c.id])}>
                      رفض
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
