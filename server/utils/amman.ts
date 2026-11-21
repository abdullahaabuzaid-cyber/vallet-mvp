/** Local weekday (0=Sun) and hour in Amman for a timestamp. */
export function ammanParts(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Amman', weekday: 'short', hour: 'numeric', hourCycle: 'h23' });
  const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  return { weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday), hour: Number(parts.hour) };
}
/** [start, end) of a YYYY-MM month in Amman (UTC+3, no DST). */
export function ammanMonth(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return null;
  const [y, m] = period.split('-').map(Number);
  return { from: new Date(Date.UTC(y, m - 1, 1, -3)), to: new Date(Date.UTC(y, m, 1, -3)) };
}
