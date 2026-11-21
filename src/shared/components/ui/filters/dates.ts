/** Local calendar day as YYYY-MM-DD. */
export function dayKey(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

export const DATE_PRESETS = [
  { id: 'today', label: 'اليوم', from: () => dayKey(), to: () => dayKey() },
  { id: '7d', label: '7 أيام', from: () => daysAgo(6), to: () => dayKey() },
  { id: '30d', label: '30 يوماً', from: () => daysAgo(29), to: () => dayKey() },
] as const;

/** Human label for a from/to pair (preset name or the dates). */
export function rangeLabel(from: string, to: string) {
  const preset = DATE_PRESETS.find((p) => p.from() === from && p.to() === to);
  if (preset) return preset.label;
  if (from && to) return from === to ? from : `${from} ← ${to}`;
  return from ? `من ${from}` : `حتى ${to}`;
}
