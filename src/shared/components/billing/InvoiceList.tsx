import type { Invoice } from '@common/types';
import { FilterBar, Pager } from '@/shared/components/ui/filters';
import { dateField, kindField, searchField, statusField } from '@/shared/components/ui/filters/fields';
import { ListState } from '@/shared/components/ui/ListState';
import { INVOICE_KIND_LABELS } from '@/shared/constants/labels';
import { filterQuery, useFilters } from '@/shared/hooks/useFilters';
import { useServerList } from '@/shared/hooks/useServerList';
import { useStore } from '@/store';
import { InvoiceTable } from './InvoiceTable';

const PAGE = 50;
const SORT = { type: 'sort' as const, options: [
  { value: 'newest', label: 'الأحدث أولاً' }, { value: 'oldest', label: 'الأقدم أولاً' },
  { value: 'amount_desc', label: 'المبلغ: الأعلى' }, { value: 'amount_asc', label: 'المبلغ: الأقل' },
] };

/** Filterable invoices (server-side) for gov and operator billing pages. */
export function InvoiceList({ gov, actions }: { gov?: boolean; actions?: React.ReactNode }) {
  const invoices = useStore((s) => s.invoices);
  const operators = useStore((s) => s.operators);
  const filters = useFilters();
  const list = useServerList<Invoice>('/api/invoices', filterQuery(filters.values, PAGE), invoices);
  const fields = [
    searchField(gov ? 'رقم الفاتورة، الجهة أو الوصف' : 'رقم الفاتورة أو الوصف'),
    statusField({ unpaid: 'غير مدفوعة', paid: 'مدفوعة' }),
    kindField(INVOICE_KIND_LABELS),
    ...(gov ? [{ type: 'select' as const, key: 'operatorId', label: 'الجهة', options: [{ value: 'none', label: 'جهة غير مسجّلة' }, ...operators.map((o) => ({ value: o.id, label: o.name }))] }] : []),
    SORT,
    { ...dateField, label: 'تاريخ الإصدار' },
  ];
  return (
    <>
      <FilterBar fields={fields} filters={filters} count={list.items.length} total={list.total} loading={list.loading}>{actions}</FilterBar>
      <ListState loading={list.loading && !list.items.length} error={list.error} count={list.items.length}>
        <InvoiceTable invoices={list.items} showPayer={gov} canPay />
      </ListState>
      <Pager filters={filters} total={list.total} pageSize={PAGE} />
    </>
  );
}
