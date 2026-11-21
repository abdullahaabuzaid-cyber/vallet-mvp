import { useMemo } from 'react';
import { HeatLayer, type HeatCell } from '@/shared/components/map/HeatLayer';
import { useResource } from '@/shared/hooks/useResource';
import { filterQuery } from '@/shared/hooks/useFilters';
import { FilterBar, type FilterField } from '@/shared/components/ui/filters';
import { dateField, searchField, statusField } from '@/shared/components/ui/filters/fields';
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
    { type: 'select', key: 'severity', label: 'خريطة حرارية', options: [{ value: 'demand', label: 'الطلب (زيارات + حجوزات)' }, { value: 'violations', label: 'المخالفات والبلاغات' }], allLabel: 'بدون' },
    dateField,
  ];
  const shown = filterList(lots, filters.values, (l) => ({ text: `${l.siteName} ${l.area} ${l.operatorName}`, status: l.status, operatorId: l.operatorId }));
  const layer = filters.values.severity;
  const heat = useResource<{ max: number; cells: HeatCell[] }>(`/api/gov/heatmap?layer=${layer || 'demand'}&${filterQuery({ ...filters.values, q: '', status: '', operatorId: '' }, 500)}`, { max: 1, cells: [] });
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
        <LotsMap mode="gov" lots={shown} unlicensed={pins}>{layer && <HeatLayer cells={heat.data.cells} max={heat.data.max} label={layer === 'violations' ? 'مخالفات/بلاغات' : 'طلب'} />}</LotsMap>
        {layer && <div className="heat-legend" data-testid="heat-legend"><span>منخفض</span><i /><span>مرتفع</span><span>· {heat.data.cells.length} منطقة</span></div>}
      </div>
    </>
  );
}
