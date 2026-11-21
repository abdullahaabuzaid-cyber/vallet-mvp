import { FilterBar, Pager, type FilterField } from '@/shared/components/ui/filters';
import { dateField, searchField } from '@/shared/components/ui/filters/fields';
import { filterQuery, useFilters } from '@/shared/hooks/useFilters';
import { useServerList } from '@/shared/hooks/useServerList';
import { useFilterFields } from '@/shared/hooks/useFilterFields';
import { ListState } from '@/shared/components/ui/ListState';
import { formatDateTime, formatJod } from '@/shared/lib/format';
import { operatorName, useStore } from '@/store';
export type Fine = { id: number; offender?: string; operator_id?: string; plate?: string; amount: number; note: string; created_at: string; inspector: string; invoice?: string; invoice_status?: string };
const PAGE = 50;
/** Field fines list (gov: all; inspector: own) with photo evidence. */
export function FineTable({ items }: { items: Fine[] }) {
  return <div className="table-wrap"><table className="table"><thead><tr><th>الدليل</th><th>المخالف</th><th>اللوحة</th><th>المبلغ</th><th>المفتش</th><th>الفاتورة</th><th>الوقت</th></tr></thead>
    <tbody>{items.map((f) => <tr key={f.id} data-testid="field-fine"><td><a href={`/api/field-fines/${f.id}/file`} target="_blank" rel="noreferrer"><img className="car-thumb" src={`/api/field-fines/${f.id}/file`} alt="دليل المخالفة" /></a></td>
      <td>{f.operator_id ? operatorName(f.operator_id) : f.offender}<div className="muted tiny">{f.note}</div></td><td className="plate-cell">{f.plate || '—'}</td><td>{formatJod(f.amount)}</td><td>{f.inspector}</td><td>{f.invoice}<div className="muted tiny">{f.invoice_status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'}</div></td><td>{formatDateTime(f.created_at)}</td></tr>)}</tbody></table></div>;
}
export default function FieldFinesPage() {
  const filters = useFilters();
  const version = useStore((s) => s.syncedAt);
  const list = useServerList<Fine>('/api/field-fines', filterQuery(filters.values, PAGE), version);
  const fields: FilterField[] = [searchField('المخالف، اللوحة، المفتش أو رقم الفاتورة'), ...useFilterFields({ operators: true }), dateField,
    { type: 'sort', options: [{ value: 'newest', label: 'الأحدث' }, { value: 'oldest', label: 'الأقدم' }, { value: 'amount_desc', label: 'الأعلى مبلغاً' }] }];
  return <><FilterBar fields={fields} filters={filters} count={list.total} />
    <div className="card"><ListState loading={list.loading && !list.items.length} error={list.error} count={list.items.length}><FineTable items={list.items} /><Pager filters={filters} total={list.total} pageSize={PAGE} /></ListState></div></>;
}
