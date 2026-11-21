import { q, q1 } from '../../db/pool.ts';
import { notifyOperator } from '../realtime/notify.ts';
import type { SessionUser } from '../auth/session.ts';
/** Live occupancy per lot (open visits vs capacity) + bookings due in the next hour. */
export async function capacityBoard(u: SessionUser) {
  const scoped = u.role === 'gov' ? '' : 'where s.operator_id = $1';
  const rows = await q(`select s.id, s.name, s.operator_id, s.capacity,
      (select count(*)::int from visits v where v.site_id=s.id and v.check_out_at is null) occupied,
      (select count(*)::int from bookings b where b.site_id=s.id and b.status='booked' and b.arrive_at between now() and now()+interval '1 hour') due
    from sites s ${scoped} order by s.id`, u.role === 'gov' ? [] : [u.operatorId]);
  return rows.map((r) => ({ siteId: r.id, name: r.name, operatorId: r.operator_id, capacity: r.capacity, occupied: r.occupied, bookingsDue: r.due,
    pct: r.capacity ? Math.round((r.occupied / r.capacity) * 100) : 0, full: r.occupied >= r.capacity }));
}
/** After a car enters: alert the operator (and gov) when a lot reaches 90% or is full. */
export async function checkCapacity(siteId: string) {
  const s = await q1(`select s.name, s.operator_id, s.capacity, (select count(*)::int from visits v where v.site_id=s.id and v.check_out_at is null) occupied from sites s where s.id=$1`, [siteId]);
  if (!s || !s.capacity) return;
  if (s.occupied >= s.capacity) notifyOperator(s.operator_id, { type: 'lot_full', title: 'الموقف ممتلئ', body: `${s.name}: ${s.occupied}/${s.capacity} — أوقف استقبال الطلبات أو حوّل لموقف آخر`, link: '/operator' });
  else if (s.occupied / s.capacity >= 0.9) notifyOperator(s.operator_id, { type: 'lot_near_full', title: 'الموقف شبه ممتلئ', body: `${s.name}: ${s.occupied}/${s.capacity}` });
}
