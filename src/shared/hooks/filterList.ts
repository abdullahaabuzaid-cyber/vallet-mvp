import type { Filters } from './useFilters';

export type FilterRow = {
  text: string;
  status?: string;
  kind?: string;
  date?: string;
  operatorId?: string;
  employeeId?: string;
  siteId?: string;
  severity?: string;
  amount?: number;
};

const MATCH_KEYS = ['status', 'kind', 'operatorId', 'employeeId', 'siteId', 'severity'] as const;

/** Small, bounded lists are filtered locally; growing lists use useServerList. */
export function filterList<T>(rows: T[], values: Filters, describe: (row: T) => FilterRow): T[] {
  const compact = (s: string) => s.toLocaleLowerCase('ar').replace(/[\s\u064B-\u065F-]/g, '');
  const q = compact(values.q);
  const records = rows.map((row) => ({ row, d: describe(row) })).filter(({ d }) => {
    if (q && !compact(d.text).includes(q)) return false;
    for (const key of MATCH_KEYS) {
      if (values[key] && d[key] !== values[key]) return false;
    }
    if (d.date) {
      const day = new Date(d.date).toLocaleDateString('en-CA');
      if (values.from && day < values.from) return false;
      if (values.to && day > values.to) return false;
    } else if (values.from || values.to) return false;
    return true;
  });
  records.sort((a, b) => {
    if (values.sort === 'name' || values.sort === 'plate') return a.d.text.localeCompare(b.d.text, 'ar');
    if (values.sort === 'amount_desc') return (b.d.amount ?? 0) - (a.d.amount ?? 0);
    const diff = (Date.parse(b.d.date ?? '') || 0) - (Date.parse(a.d.date ?? '') || 0);
    return values.sort === 'oldest' ? -diff : diff;
  });
  return records.map(({ row }) => row);
}
