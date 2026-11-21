import { useState } from 'react';
import type { Visit } from '@common/types';
import { dayKey, FilterBar, Pager, type FilterField } from '@/shared/components/ui/filters';
import { searchField, statusField, VISIT_SORT, VISIT_STATUS, dateField } from '@/shared/components/ui/filters/fields';
import { ListState } from '@/shared/components/ui/ListState';
import { StatCard } from '@/shared/components/ui/StatCard';
import { CarLogList } from '@/shared/components/visits/CarLogList';
import { VisitDetailDrawer } from '@/shared/components/visits/VisitDetailDrawer';
import { filterQuery, useFilters } from '@/shared/hooks/useFilters';
import { useFilterFields } from '@/shared/hooks/useFilterFields';
import { useServerList } from '@/shared/hooks/useServerList';
import { useStore } from '@/store';

const PAGE = 50;

/** Operator car log: server-filtered visits (today by default), details drawer. */
export default function CarLogPage() {
  const opId = useStore((s) => s.currentOperatorId);
  const storeVisits = useStore((s) => s.visits);
  const mine = storeVisits.filter((v) => v.operatorId === opId);
  const today = dayKey();
  const filters = useFilters({ from: today, to: today });
  const list = useServerList<Visit>('/api/visits', filterQuery(filters.values, PAGE), storeVisits);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fields: FilterField[] = [
    searchField('ابحث باللوحة، الإيصال، الهاتف، السيارة أو الموظف'),
    statusField(VISIT_STATUS),
    ...useFilterFields({ staff: true, lots: true }),
    VISIT_SORT,
    dateField,
  ];
  const selected = selectedId ? list.items.find((v) => v.id === selectedId) ?? mine.find((v) => v.id === selectedId) : undefined;
  const todayCount = mine.filter((v) => dayKey(new Date(v.checkInAt)) === today).length;

  return (
    <div className="car-log">
      <div className="stat-grid">
        <StatCard label="داخل الموقف الآن" value={mine.filter((v) => !v.checkOutAt).length} icon="car" />
        <StatCard label="مطلوبة للإرجاع" value={mine.filter((v) => !v.checkOutAt && v.returnRequestedAt).length} icon="clock" tone="amber" />
        <StatCard label="دخلت اليوم" value={todayCount} icon="arrow" tone="teal" />
        <StatCard label="سُلّمت اليوم" value={mine.filter((v) => v.checkOutAt && dayKey(new Date(v.checkOutAt)) === today).length} icon="check" tone="violet" />
      </div>
      <FilterBar fields={fields} filters={filters} count={list.items.length} total={list.total} loading={list.loading} />
      <div className="card">
        <ListState loading={list.loading && !list.items.length} error={list.error} count={list.items.length}>
          <CarLogList visits={list.items} onSelect={setSelectedId} />
        </ListState>
        <Pager filters={filters} total={list.total} pageSize={PAGE} />
      </div>
      {selected && <VisitDetailDrawer visit={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
