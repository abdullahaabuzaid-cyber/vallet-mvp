import type { Request } from 'express';
import { q1, tx } from '../../db/pool.ts';
import { bad, str } from '../../utils/http.ts';
import { normalizePhone } from '../../utils/phone.ts';
import type { SessionUser } from '../auth/session.ts';

/** Load a visit the user may see: gov any, operator/staff their own, driver their car. 404/403 otherwise. */
export async function visitForUser(id: string, u: SessionUser) {
  const v = await q1(`select * from visits where id = $1`, [id]);
  if (!v) throw bad('الزيارة غير موجودة', 404);
  if (u.role === 'gov') return v;
  if ((u.role === 'operator' || u.role === 'staff') && v.operator_id === u.operatorId) return v;
  if (u.role === 'driver') {
    const h = v.handoff_id ? await q1(`select driver_user_id from handoffs where id=$1`, [v.handoff_id]) : null;
    if (v.owner_phone === u.phone || h?.driver_user_id === u.id) return v;
  }
  throw bad('غير مصرّح', 403);
}

/** Visit for a staff/operator action on `/visits/:id/...`. */
export async function staffVisit(req: Request) {
  const v = await visitForUser(String(req.params.id), req.user!);
  if (req.user!.role === 'driver') throw bad('غير مصرّح', 403);
  return v;
}

async function currentEmployee(u: SessionUser) {
  if (!u.employeeId) throw bad('الحساب غير مرتبط بموظف', 403);
  const e = await q1(`select * from employees where id = $1`, [u.employeeId]);
  if (!e) throw bad('الموظف غير موجود', 404);
  return e;
}

/** Staff receives a car at the lot (walk-in or from a handoff). Returns the visit row. */
export async function checkIn(u: SessionUser, b: any) {
  const emp = await currentEmployee(u);
  if (!emp.active || emp.review_status !== 'approved') throw bad('حسابك غير مفعّل بعد — بانتظار اعتماد الهيئة', 403);
  const op = await q1(`select status from operators where id=$1`, [emp.operator_id]);
  if (op?.status !== 'approved') throw bad('ترخيص المشغّل غير ساري — لا يمكن استلام سيارات', 403);
  const plate = str(b?.plate, 20);
  if (!plate) throw bad('أدخل رقم اللوحة');
  const siteId = emp.site_id || (await q1(`select id from sites where operator_id=$1 order by id limit 1`, [emp.operator_id]))?.id;
  if (!siteId) throw bad('لا يوجد موقف مرتبط');
  b = b || {};
  const photo = typeof b.photoThumb === 'string' && b.photoThumb.startsWith('data:image/') && b.photoThumb.length < 400_000 ? b.photoThumb : null;
  return tx(async (c) => {
    const seq = (await c.query(`select nextval('visit_seq') as n`)).rows[0].n;
    return (await c.query(
      `insert into visits (id, receipt_no, plate, operator_id, site_id, check_in_by, check_in_at, parked_at, notes, car_make, car_model, car_color, owner_phone, photo_thumb, handoff_id)
       values ($1,$2,$3,$4,$5,$6, now(), now(), $7,$8,$9,$10,$11,$12,$13) returning *`,
      [`v-${seq}`, `V-${seq}`, plate, emp.operator_id, siteId, emp.id, str(b.notes) || null, str(b.carMake, 40) || null, str(b.carModel, 40) || null,
        str(b.carColor, 30) || null, normalizePhone(str(b.ownerPhone, 20)) || null, photo, str(b.handoffId, 40) || null]
    )).rows[0];
  });
}
