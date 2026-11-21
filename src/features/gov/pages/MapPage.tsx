import { useMemo } from 'react';
import { FilterBar, type FilterField } from '@/shared/components/ui/filters';
import { searchField, statusField } from '@/shared/components/ui/filters/fields';
import { StatCard } from '@/shared/components/ui/StatCard';
import { LotsMap } from '@/shared/components/map/LotsMap';
import { LICENSE_STATUS_LABELS } from '@/shared/constants/labels';
import { filterList } from '@/shared/hooks/filterList';
import { useFilterFields } from '@/shared/hooks/useFilterFields';
import { useFilters } from '@/shared/hooks/useFilters';
import { allLotsForMap, unlicensedPins, useStore } from '@/store';

/** All lots in Amman by licence status, plus unlicensed-valet reports; filterable. */
export default function MapPage() {
  const operators = useStore((s) => s.operators);
  const incidents = useStore((s) => s.incidents);
  const lots = useMemo(() => allLotsForMap(), [operators]);
  const unlicensed = useMemo(() => unlicensedPins(), [incidents]);
  const filters = useFilters();
  const fields: FilterField[] = [
    searchField('اسم الموقف، المنطقة أو المشغّل'),
    statusField(LICENSE_STATUS_LABELS),
    ...useFilterFields({ operators: true }),
    { type: 'select', key: 'kind', label: 'بلاغات غير مرخّصة', options: [{ value: 'hide', label: 'إخفاء' }], allLabel: 'إظهار' },
  ];
  const shown = filterList(lots, filters.values, (l) => ({ text: `${l.siteName} ${l.area} ${l.operatorName}`, status: l.status, operatorId: l.operatorId }));
  const pins = filters.values.kind === 'hide' ? [] : unlicensed;
  const count = (st: string) => lots.filter((l) => l.status === st).length;
  return (
    <>
      <div className="stat-grid">
        <StatCard label="مواقع مرخّصة" value={count('approved')} icon="shield" tone="teal" />
        <StatCard label="قيد المراجعة" value={count('pending')} icon="clock" tone="amber" />
        <StatCard label="موقوفة" value={count('suspended')} icon="x" tone="violet" />
        <StatCard label="بلاغات غير مرخّصة" value={unlicensed.length} icon="pin" />
      </div>
      <FilterBar fields={fields} filters={filters} count={shown.length} total={lots.length} />
      <div className="card map-card" style={{ padding: 0, overflow: 'hidden' }}>
        <LotsMap mode="gov" lots={shown} unlicensed={pins} />
      </div>
    </>
  );
}
