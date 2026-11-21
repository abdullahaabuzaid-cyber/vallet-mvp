import type { Complaint } from '@common/types';
import { Badge } from '@/shared/components/ui/Badge';
import { FilterBar, Pager, type FilterField } from '@/shared/components/ui/filters';
import { dateField, kindField, searchField, sortField, statusField } from '@/shared/components/ui/filters/fields';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ListState } from '@/shared/components/ui/ListState';
import { StatCard } from '@/shared/components/ui/StatCard';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '@/shared/constants/labels';
import { formatDateTime } from '@/shared/lib/format';
import { filterList } from '@/shared/hooks/filterList';
import { filterQuery, useFilters } from '@/shared/hooks/useFilters';
import { useFilterFields } from '@/shared/hooks/useFilterFields';
import { useServerList } from '@/shared/hooks/useServerList';
import { siteName, useStore } from '@/store';

const PAGE = 30;
const STARS = { 5: '★★★★★', 4: '★★★★', 3: '★★★', 2: '★★', 1: '★' };

/** Operator view of complaints about them (server-filtered) and driver ratings (local filters, prefix `r`). */
export default function FeedbackPage() {
  const ratings = useStore((s) => s.ratings);
  const complaints = useStore((s) => s.complaints);
  const lots = useFilterFields({ lots: true });
  const filters = useFilters();
  const list = useServerList<Complaint>('/api/complaints', filterQuery(filters.values, PAGE), complaints);
  const fields: FilterField[] = [searchField('نص الشكوى، رقمها أو اللوحة'), statusField({ active: 'المفتوحة', ...COMPLAINT_STATUS_LABELS }), kindField(COMPLAINT_CATEGORY_LABELS, 'التصنيف'), ...lots, sortField, dateField];
  const rFilters = useFilters({}, 'r');
  const rFields: FilterField[] = [searchField('نص التعليق'), { type: 'select', key: 'kind', label: 'التقييم', options: Object.entries(STARS).reverse().map(([value, label]) => ({ value, label })) }, ...lots, sortField];
  const rList = filterList(ratings, rFilters.values, (r) => ({ text: r.comment || '', kind: String(r.stars), siteId: r.siteId, date: r.createdAt }));
  const avg = ratings.length ? ratings.reduce((a, r) => a + r.stars, 0) / ratings.length : 0;
  return (
    <div className="reg-page">
      <div className="stat-grid">
        <StatCard label="متوسط التقييم" value={avg ? `★ ${avg.toFixed(1)}` : '—'} icon="spark" tone="violet" />
        <StatCard label="تقييمات" value={ratings.length} icon="users" />
        <StatCard label="شكاوى مفتوحة" value={complaints.filter((c) => c.status === 'open' || c.status === 'investigating').length} icon="message" tone="amber" />
      </div>
      <div className="card">
        <div className="section-head"><div><h2>الشكاوى عليك</h2><p>الهيئة تتابع الشكاوى وترد على السائق. للاطلاع فقط.</p></div></div>
        <FilterBar fields={fields} filters={filters} count={list.items.length} total={list.total} loading={list.loading} />
        <ListState loading={list.loading && !list.items.length} error={list.error} count={list.items.length}>
          <div className="stack">
            {list.items.map((c) => (
              <div key={c.id} className="complaint-card">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>#{c.id} · {COMPLAINT_CATEGORY_LABELS[c.category]}</strong>
                  <Badge tone={c.status === 'resolved' ? 'ok' : c.status === 'rejected' ? 'info' : 'warn'}>{COMPLAINT_STATUS_LABELS[c.status]}</Badge>
                </div>
                <div>{c.description}</div>
                <div className="muted tiny">{c.siteId ? siteName(c.siteId) : ''} · {formatDateTime(c.createdAt)}</div>
                {c.govResponse && <div className="tiny">رد الهيئة: {c.govResponse}</div>}
              </div>
            ))}
          </div>
        </ListState>
        <Pager filters={filters} total={list.total} pageSize={PAGE} />
      </div>
      <div className="card">
        <div className="section-head"><h2>تقييمات السائقين</h2></div>
        <FilterBar fields={rFields} filters={rFilters} count={rList.length} total={ratings.length} />
        {!rList.length && <EmptyState />}
        <div className="stack">
          {rList.map((r) => (
            <div key={r.id} className="rating-row">
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
