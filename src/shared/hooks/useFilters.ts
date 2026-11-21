import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export type Filters = Record<string, string>;
export type FilterState = ReturnType<typeof useFilters>;
const KEYS = ['q', 'status', 'kind', 'operatorId', 'employeeId', 'siteId', 'from', 'to', 'severity', 'sort', 'page'];

/** URL is the source of truth: refresh, Back/Forward and shareable links work. */
export function useFilters(defaults: Filters = {}, prefix = '') {
  const [params, setParams] = useSearchParams();
  const values: Filters = Object.fromEntries(KEYS.map((k) => [k, params.get(prefix + k) ?? defaults[k] ?? '']));
  const key = JSON.stringify(defaults);
  /** Update several keys at once (react-router does not chain functional updates). */
  const patch = useCallback((changes: Filters) => {
    const defs: Filters = JSON.parse(key);
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [k, value] of Object.entries(changes)) {
        if (value) next.set(prefix + k, value);
        else if (defs[k]) next.set(prefix + k, '');
        else next.delete(prefix + k);
      }
      if (!('page' in changes)) next.delete(prefix + 'page');
      return next;
    }, { replace: true });
  }, [setParams, prefix, key]);
  const set = useCallback((k: string, value: string) => patch({ [k]: value }), [patch]);
  const clear = () => setParams((previous) => {
    const next = new URLSearchParams(previous);
    KEYS.forEach((k) => {
      if (defaults[k]) next.set(prefix + k, ''); else next.delete(prefix + k);
    });
    return next;
  }, { replace: true });
  return { values, set, patch, clear };
}

/** Date controls use local calendar days; send an inclusive start/exclusive end with a zone. */
export function filterQuery(values: Filters, pageSize = 50) {
  const p = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (!v || k === 'page') return;
    if (k === 'from' || k === 'to') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
      const d = new Date(`${v}T00:00:00`);
      if (Number.isNaN(d.getTime())) return;
      if (k === 'to') d.setDate(d.getDate() + 1);
      p.set(k, d.toISOString());
    } else p.set(k, v);
  });
  const page = Math.max(1, Number.parseInt(values.page, 10) || 1);
  p.set('limit', String(pageSize));
  p.set('offset', String((page - 1) * pageSize));
  return p.toString();
}
