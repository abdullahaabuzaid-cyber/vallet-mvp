import { q, q1 } from '../../db/pool.ts';
import { bad, str } from '../../utils/http.ts';
import { type ListParams, Where } from '../../utils/listQuery.ts';
import type { SessionUser } from '../auth/session.ts';
const map = (r: any) => ({ id: r.id, employeeId: r.employee_id, employeeName: r.employee_name, siteId: r.site_id, startsAt: r.starts_at, endsAt: r.ends_at });
export async function listShifts(u: SessionUser, p: ListParams) {
  const w = new Where().add('s.operator_id = ?', u.operatorId);
  if (u.role === 'staff') w.add('s.employee_id = ?', u.employeeId);
  else if (p.employeeId) w.add('s.employee_id = ?', p.employeeId);
  if (p.siteId) w.add('s.site_id = ?', p.siteId);
  w.range('s.starts_at', p.from, p.to);
  return (await q(`select s.*, e.name employee_name from shifts s join employees e on e.id=s.employee_id ${w.sql} order by s.starts_at limit 500`, w.params)).map(map);
}
export async function createShift(u: SessionUser, b: any) {
  const employeeId = str(b?.employeeId, 40), start = new Date(str(b?.startsAt, 40)), end = new Date(str(b?.endsAt, 40));
  const e = await q1(`select * from employees where id=$1 and operator_id=$2 and active`, [employeeId, u.operatorId]);
  if (!e) throw bad('اختر موظفاً فعّالاً');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start || end.getTime() - start.getTime() > 16 * 3600_000) throw bad('الوردية من 1 دقيقة حتى 16 ساعة');
  const siteId=str(b?.siteId,40)||e.site_id;
  if(siteId&&!(await q1(`select 1 from sites where id=$1 and operator_id=$2`,[siteId,u.operatorId]))) throw bad('الموقف غير تابع لك');
  if (await q1(`select 1 from shifts where employee_id=$1 and starts_at < $3 and ends_at > $2`, [employeeId, start, end])) throw bad('الوردية تتداخل مع وردية أخرى لنفس الموظف');
  return map(await q1(`insert into shifts(operator_id,employee_id,site_id,starts_at,ends_at) values($1,$2,$3,$4,$5) returning *, (select name from employees where id=$2) employee_name`, [u.operatorId, employeeId, siteId, start, end]));
}
export async function deleteShift(u: SessionUser, id: number) {
  if (!(await q1(`delete from shifts where id=$1 and operator_id=$2 returning id`, [id, u.operatorId]))) throw bad('الوردية غير موجودة', 404);
  return { ok: true };
}
/** Per-employee metrics over [from, to): throughput, return speed, ratings by name, tips, shift hours. */
export async function performance(u: SessionUser, p: ListParams) {
  const from = p.from ?? new Date(Date.now() - 30 * 86400_000), to = p.to ?? new Date(Date.now() + 60_000);
  const rows = await q(`select e.id, e.name,
      (select count(*)::int from visits v where v.check_in_by=e.id and v.check_in_at >= $2 and v.check_in_at < $3) cars_in,
      (select count(*)::int from visits v where v.check_out_by=e.id and v.check_out_at >= $2 and v.check_out_at < $3) cars_out,
      (select round(avg(extract(epoch from (v.ready_at - v.return_requested_at))/60)::numeric,1)::float from visits v
        where v.check_in_by=e.id and v.ready_at is not null and v.return_requested_at is not null and v.ready_at >= $2 and v.ready_at < $3) avg_ready_min,
      (select round(avg(r.stars)::numeric,2)::float from ratings r where r.employee_id=e.id and r.created_at >= $2 and r.created_at < $3) rating,
      (select count(*)::int from ratings r where r.employee_id=e.id and r.created_at >= $2 and r.created_at < $3) ratings,
      (select coalesce(sum(t.amount),0)::float from tips t where t.employee_id=e.id and t.created_at >= $2 and t.created_at < $3) tips,
      (select coalesce(sum(extract(epoch from (least(s.ends_at,$3) - greatest(s.starts_at,$2)))/3600),0)::float from shifts s
        where s.employee_id=e.id and s.starts_at < $3 and s.ends_at > $2) shift_hours
    from employees e where e.operator_id=$1 and e.review_status='approved' order by e.name`, [u.operatorId, from, to]);
  return rows.map((r) => ({ ...r, carsPerHour: r.shift_hours ? Math.round(((r.cars_in + r.cars_out) / r.shift_hours) * 10) / 10 : null }));
}
