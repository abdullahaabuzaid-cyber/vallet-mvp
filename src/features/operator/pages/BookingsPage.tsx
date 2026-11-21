import { FilterBar, Pager, type FilterField } from '@/shared/components/ui/filters';
import { dateField, searchField, statusField } from '@/shared/components/ui/filters/fields';
import { useFilters, filterQuery } from '@/shared/hooks/useFilters';
import { useServerList } from '@/shared/hooks/useServerList';
import { useFilterFields } from '@/shared/hooks/useFilterFields';
import { ListState } from '@/shared/components/ui/ListState';
import { Badge } from '@/shared/components/ui/Badge';
import { formatDateTime } from '@/shared/lib/format';
import { api } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
import { useStore } from '@/store';
import { BOOKING_STATUS } from '@/features/driver/pages/BookingPage';
type B = { id: number; siteName: string; venue?: string; plate: string; arriveAt: string; status: string; phone?: string };
const PAGE = 50;
export default function BookingsPage() {
  const filters = useFilters({ status: 'booked', sort: 'soonest' });
  const version = useStore((s) => s.syncedAt);
  const list = useServerList<B>('/api/bookings', filterQuery(filters.values, PAGE), version);
  const fields: FilterField[] = [searchField('اللوحة، الهاتف أو المكان'), statusField(BOOKING_STATUS), ...useFilterFields({ lots: true }), dateField,
    { type: 'sort', options: [{ value: 'soonest', label: 'الأقرب موعداً' }, { value: 'newest', label: 'الأحدث حجزاً' }] }];
  const set = async (id: number, status: string) => { try { await api(`/api/bookings/${id}/status`, { status }); toast('تم التحديث', { tone: 'ok' }); } catch (e) { toast((e as Error).message, { tone: 'bad' }); } };
  return <>
    <FilterBar fields={fields} filters={filters} count={list.total} />
    <div className="card"><ListState loading={list.loading && !list.items.length} error={list.error} count={list.items.length}>
      <div className="table-wrap"><table className="table"><thead><tr><th>الموعد</th><th>اللوحة</th><th>الموقف</th><th>المكان</th><th>الهاتف</th><th>الحالة</th><th></th></tr></thead>
        <tbody>{list.items.map((b) => <tr key={b.id} data-testid="booking-row"><td>{formatDateTime(b.arriveAt)}</td><td className="plate-cell">{b.plate}</td><td>{b.siteName}</td><td>{b.venue || '—'}</td><td dir="ltr">{b.phone || '—'}</td><td><Badge tone={b.status === 'booked' ? 'info' : b.status === 'arrived' ? 'ok' : 'default'}>{BOOKING_STATUS[b.status]}</Badge></td>
          <td className="row">{b.status === 'booked' && <><button className="btn btn-sm btn-success" type="button" onClick={() => void set(b.id, 'arrived')}>وصل</button><button className="btn btn-sm" type="button" onClick={() => void set(b.id, 'no_show')}>لم يحضر</button></>}</td></tr>)}</tbody></table></div>
      <Pager filters={filters} total={list.total} pageSize={PAGE} />
    </ListState></div>
  </>;
}
