import { ConditionPanel } from '@/shared/components/visits/ConditionPanel';
import { useState } from 'react';
import type { Complaint, ComplaintStatus } from '@common/types';
import { Badge } from '@/shared/components/ui/Badge';
import { FilterBar, Pager } from '@/shared/components/ui/filters';
import { dateField, kindField, searchField, sortField, statusField } from '@/shared/components/ui/filters/fields';
import { ListState } from '@/shared/components/ui/ListState';
import { StatCard } from '@/shared/components/ui/StatCard';
import { filterQuery, useFilters } from '@/shared/hooks/useFilters';
import { useFilterFields } from '@/shared/hooks/useFilterFields';
import { useServerList } from '@/shared/hooks/useServerList';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '@/shared/constants/labels';
import { formatDateTime } from '@/shared/lib/format';
import { operatorName, siteName, updateComplaint, useStore } from '@/store';

const TONE: Record<ComplaintStatus, 'ok' | 'warn' | 'bad' | 'info'> = {
  open: 'bad',
  investigating: 'warn',
  resolved: 'ok',
  rejected: 'info',
};

const PAGE = 50;

export default function ComplaintsPage() {
  const complaints = useStore((s) => s.complaints);
  const ratings = useStore((s) => s.ratings);
  const visits = useStore((s) => s.visits);
  const filters = useFilters({ status: 'active' });
  const list = useServerList<Complaint>('/api/complaints', filterQuery(filters.values, PAGE), complaints);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const fields = [
    searchField('رقم الشكوى، النص، هاتف السائق أو اللوحة'),
    statusField({ active: 'المفتوحة (جديدة + متابعة)', ...COMPLAINT_STATUS_LABELS }),
    kindField(COMPLAINT_CATEGORY_LABELS, 'التصنيف'),
    ...useFilterFields({ operators: true, lots: true }),
    sortField,
    dateField,
  ];
  const avg = ratings.length ? ratings.reduce((a, r) => a + r.stars, 0) / ratings.length : 0;

  return (
    <div className="reg-page">
      <div className="stat-grid">
        <StatCard label="شكاوى جديدة" value={complaints.filter((c) => c.status === 'open').length} icon="message" tone="amber" />
        <StatCard label="قيد المتابعة" value={complaints.filter((c) => c.status === 'investigating').length} icon="clock" />
        <StatCard label="تمت المعالجة" value={complaints.filter((c) => c.status === 'resolved').length} icon="check" tone="teal" />
        <StatCard label={`متوسط التقييم (${ratings.length})`} value={avg ? `★ ${avg.toFixed(1)}` : '—'} icon="spark" tone="violet" />
      </div>
      <FilterBar fields={fields} filters={filters} count={list.items.length} total={list.total} loading={list.loading} />
      <div className="card">
        <div className="section-head"><h2>طابور الشكاوى</h2></div>
        <ListState loading={list.loading && !list.items.length} error={list.error} count={list.items.length}>
        <div className="stack" style={{ marginTop: 12 }}>
          {list.items.map((c) => {
            const v = c.visitId ? visits.find((x) => x.id === c.visitId) : undefined;
            return (
              <div key={c.id} className="complaint-card" data-testid="complaint">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>#{c.id} · {COMPLAINT_CATEGORY_LABELS[c.category]}</strong>
                  <Badge tone={TONE[c.status]}>{COMPLAINT_STATUS_LABELS[c.status]}</Badge>
                </div>
                <p style={{ margin: '6px 0' }}>{c.description}{c.visitId&&<details><summary>أدلة حالة السيارة</summary><ConditionPanel visitId={c.visitId}/></details>}</p>
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
        </ListState>
        <Pager filters={filters} total={list.total} pageSize={PAGE} />
      </div>
    </div>
  );
}
