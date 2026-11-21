import { useState } from 'react';
import type { Visit } from '@common/types';
import { FilterBar, Pager, type FilterField } from '@/shared/components/ui/filters';
import { dateField, searchField, statusField, VISIT_SORT, VISIT_STATUS } from '@/shared/components/ui/filters/fields';
import { ListState } from '@/shared/components/ui/ListState';
import { CarLogList } from '@/shared/components/visits/CarLogList';
import { VisitDetailDrawer } from '@/shared/components/visits/VisitDetailDrawer';
import { filterQuery, useFilters } from '@/shared/hooks/useFilters';
import { useFilterFields } from '@/shared/hooks/useFilterFields';
import { useServerList } from '@/shared/hooks/useServerList';
import { useStore } from '@/store';

const PAGE = 50;

/** Gov audit of every visit across operators (server-side filters). */
export default function AuditPage() {
  const version = useStore((s) => s.visits);
  const filters = useFilters();
  const list = useServerList<Visit>('/api/visits', filterQuery(filters.values, PAGE), version);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fields: FilterField[] = [
    searchField('الإيصال، اللوحة، الموظف أو المشغّل'),
    statusField(VISIT_STATUS),
    ...useFilterFields({ operators: true, lots: true }),
    VISIT_SORT,
    dateField,
  ];
  const selected = list.items.find((v) => v.id === selectedId);
  return (
    <>
      <FilterBar fields={fields} filters={filters} count={list.items.length} total={list.total} loading={list.loading} />
      <div className="card">
        <ListState loading={list.loading && !list.items.length} error={list.error} count={list.items.length}>
          <CarLogList visits={list.items} onSelect={setSelectedId} showOperator />
        </ListState>
        <Pager filters={filters} total={list.total} pageSize={PAGE} />
      </div>
      {selected && <VisitDetailDrawer visit={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}
