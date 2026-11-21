import { q, q1 } from '../../db/pool.ts';
import { bad, str } from '../../utils/http.ts';
import { type ListParams, orderBy, paged, Where } from '../../utils/listQuery.ts';
import { notifyOperator } from '../realtime/notify.ts';
import { publish } from '../realtime/sse.ts';
import type { SessionUser } from '../auth/session.ts';
const STATUSES = ['booked', 'arrived', 'cancelled', 'no_show'];
const map = (b: any) => ({ id: b.id, siteId: b.site_id, operatorId: b.operator_id, venue: b.venue, plate: b.plate, arriveAt: b.arrive_at, status: b.status, phone: b.phone, createdAt: b.created_at, siteName: b.site_name });
export async function createBooking(u: SessionUser, b: any) {
  const siteId = str(b?.siteId, 40), plate = str(b?.plate, 20), venue = str(b?.venue, 120);
  const at = new Date(str(b?.arriveAt, 40));
  if (!plate) throw bad('أدخل رقم اللوحة');
  if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 10 * 60_000 || at.getTime() > Date.now() + 30 * 86400_000) throw bad('اختر موعداً بعد 10 دقائق على الأقل وخلال 30 يوماً');
  const s = await q1(`select s.*, o.status op_status from sites s join operators o on o.id=s.operator_id where s.id=$1`, [siteId]);
  if (!s || s.op_status !== 'approved') throw bad('الموقف غير مرخّص أو غير موجود');
  const busy = await q1(`select count(*)::int n from bookings where site_id=$1 and status='booked' and arrive_at between $2::timestamptz - interval '1 hour' and $2::timestamptz + interval '1 hour'`, [siteId, at]);
  if (busy!.n >= Math.max(1, Math.floor(s.capacity / 2))) throw bad('لا يوجد متسع للحجز بهذا الوقت — جرّب وقتاً آخر');
  const r = await q1(`insert into bookings(driver_id,phone,site_id,operator_id,venue,plate,arrive_at) values($1,$2,$3,$4,$5,$6,$7) returning *`, [u.id, u.phone, siteId, s.operator_id, venue || null, plate, at]);
  notifyOperator(s.operator_id, { type: 'booking_new', title: 'حجز مسبق جديد', body: `${plate} — ${at.toLocaleString('ar-JO', { timeZone: 'Asia/Amman' })}`, link: '/operator/bookings' });
  return map(r);
}
export async function myBookings(u: SessionUser) {
  return (await q(`select b.*, s.name site_name from bookings b join sites s on s.id=b.site_id where driver_id=$1 order by arrive_at desc limit 50`, [u.id])).map(map);
}
export async function listBookings(u: SessionUser, p: ListParams) {
  const w = new Where().scope('b.operator_id', u, p.operatorId);
  if (p.status) w.add('b.status = ?', p.status);
  if (p.siteId) w.add('b.site_id = ?', p.siteId);
  w.range('b.arrive_at', p.from, p.to).search(p.q, ['b.venue', 'b.phone', 's.name'], ['b.plate']);
  const rows = await q(`select b.*, s.name site_name, count(*) over() total_count from bookings b join sites s on s.id=b.site_id ${w.sql}
    order by ${orderBy(p.sort, { soonest: 'b.arrive_at asc', newest: 'b.created_at desc', oldest: 'b.created_at asc' })} limit ${w.next(p.limit)} offset ${w.next(p.offset)}`, w.params);
  return paged(rows, map);
}
export async function setBookingStatus(u: SessionUser, id: number, status: string) {
  if (!STATUSES.includes(status)) throw bad('حالة غير صالحة');
  const b = await q1(`select * from bookings where id=$1`, [id]);
  if (!b) throw bad('الحجز غير موجود', 404);
  const mine = u.role === 'driver' ? b.driver_id === u.id && status === 'cancelled' : b.operator_id === u.operatorId && status !== 'cancelled';
  if (!mine) throw bad('غير مصرّح', 403);
  if (b.status !== 'booked') throw bad('الحجز مغلق');
  const r = await q1(`update bookings set status=$2 where id=$1 returning *`, [id, status]);
  publish({ operatorId: b.operator_id, driverUserId: b.driver_id }, { type: 'booking_status' });
  return map(r);
}
