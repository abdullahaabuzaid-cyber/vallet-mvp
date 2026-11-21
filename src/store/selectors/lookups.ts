import { getState } from '../core';

/** Name lookups by id (fall back to the id itself). */
export function empName(id: string) {
  return getState().employees.find((e) => e.id === id)?.name ?? id;
}

export function operatorName(id: string) {
  return getState().operators.find((o) => o.id === id)?.name ?? id;
}

export function siteById(id: string) {
  for (const op of getState().operators) {
    const s = op.sites.find((x) => x.id === id);
    if (s) return { site: s, operator: op };
  }
  return undefined;
}

export function siteName(id: string) {
  const found = siteById(id);
  return found ? `${found.site.name} — ${found.site.area}` : id;
}
