import { q } from '../../db/pool.ts';
import { ammanParts } from '../../utils/amman.ts';
import type { SessionUser } from '../auth/session.ts';
/** Typical Amman valet curve (share of a day's arrivals per hour), used when history is thin. */
const BASE = [0,0,0,0,0,0,0.5,1,2,3,4,5,6,6,5,4,4,5,7,9,10,9,6,3].map((x) => x / 99);
const CARS_PER_STAFF_HOUR = 6, WEEKS = 8;
/**
 * Demand forecast for the next 24h by Amman weekday/hour: historical average over 8 weeks blended
 * with a baseline curve. The blend weight grows with data volume (w = visits/400, capped at 1).
 */
export async function forecast(u: SessionUser, siteId?: string, operatorId?: string) {
  const op = u.role === 'operator' ? u.operatorId : operatorId || null;
  const rows = await q(`select extract(dow from check_in_at at time zone 'Asia/Amman')::int d, extract(hour from check_in_at at time zone 'Asia/Amman')::int h, count(*)::int n
    from visits where check_in_at > now() - interval '${WEEKS} weeks' and ($1::text is null or operator_id=$1) and ($2::text is null or site_id=$2) group by 1,2`, [op, siteId || null]);
  const cap = await q(`select coalesce(sum(capacity),0)::int c from sites where ($1::text is null or operator_id=$1) and ($2::text is null or id=$2)`, [op, siteId || null]);
  const total = rows.reduce((s, r) => s + r.n, 0), w = Math.min(1, total / 400);
  const dailyBase = Math.max(10, cap[0].c * 1.2);
  const hist = (d: number, h: number) => (rows.find((r) => r.d === d && r.h === h)?.n ?? 0) / WEEKS;
  const hours = Array.from({ length: 24 }, (_, i) => {
    const at = new Date(Math.ceil(Date.now() / 3600_000) * 3600_000 + i * 3600_000), { weekday, hour } = ammanParts(at);
    const weekend = weekday === 4 || weekday === 5 ? 1.3 : 1;
    const expected = Math.round((w * hist(weekday, hour) + (1 - w) * BASE[hour] * dailyBase * weekend) * 10) / 10;
    return { at: at.toISOString(), hour, expected, staff: Math.max(1, Math.ceil(expected / CARS_PER_STAFF_HOUR)) };
  });
  const peak = hours.reduce((a, b) => (b.expected > a.expected ? b : a), hours[0]);
  return { hours, peak, historyVisits: total, weight: Math.round(w * 100) / 100, dataQuality: w < 0.5 ? 'sparse' : 'ok',
    method: `متوسط تاريخي لآخر ${WEEKS} أسابيع حسب اليوم والساعة، ممزوج بمنحنى أساسي (وزن التاريخ ${Math.round(w * 100)}%). سيارة/موظف/ساعة = ${CARS_PER_STAFF_HOUR}.` };
}
