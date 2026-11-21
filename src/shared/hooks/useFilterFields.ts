import { useStore } from '@/store';
import type { FilterField } from '@/shared/components/ui/filters';

/** Role-scoped operator / staff / lot choices for a filter bar. */
export function useFilterFields({ operators: withOperators = false, staff = false, lots = false }: { operators?: boolean; staff?: boolean; lots?: boolean } = {}): FilterField[] {
  const operators = useStore((s) => s.operators);
  const employees = useStore((s) => s.employees);
  const fields: FilterField[] = [];
  if (withOperators) fields.push({ type: 'select', key: 'operatorId', label: 'المشغّل', options: operators.map((o) => ({ value: o.id, label: o.name })) });
  if (staff) fields.push({ type: 'select', key: 'employeeId', label: 'الموظف', options: employees.map((e) => ({ value: e.id, label: e.name })) });
  if (lots) fields.push({ type: 'select', key: 'siteId', label: 'الموقف', options: operators.flatMap((o) => o.sites.map((s) => ({ value: s.id, label: s.name }))) });
  return fields;
}
