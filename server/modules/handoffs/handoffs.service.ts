import { quote } from '../pricing/pricing.service.ts';
import { checkCapacity } from '../capacity/capacity.service.ts';
import { q1, tx, nextId, type DbClient } from '../../db/pool.ts';
import { bad } from '../../utils/http.ts';
import { notifyOperator } from '../realtime/notify.ts';
import { publish } from '../realtime/sse.ts';
import type { SessionUser } from '../auth/session.ts';

async function siteWithOperator(siteId: string) {
  return q1(`select s.*, o.status as op_status, o.auto_accept, o.name as op_name from sites s join operators o on o.id = s.operator_id where s.id = $1`, [siteId]);
}

/** Accept a pending handoff: creates the visit and assigns the employee (inside a transaction). */
export async function acceptHandoffTx(c: DbClient, handoffId: string, employeeId: string) {
  const h = (await c.query(`select * from handoffs where id = $1 for update`, [handoffId])).rows[0];
  if (!h) throw bad('الطلب غير موجود', 404);
  if (h.status !== 'pending') throw bad('الطلب لم يعد بانتظار القبول');
  const emp = (await c.query(`select * from employees where id = $1 and active = true`, [employeeId])).rows[0];
  if (!emp || emp.operator_id !== h.operator_id) throw bad('الموظف غير متاح');
  const seq = (await c.query(`select nextval('visit_seq') as n`)).rows[0].n;
  const v = (await c.query(
    `insert into visits (id, receipt_no, plate, operator_id, site_id, check_in_by, check_in_at, parked_at, notes, handoff_id, owner_phone)
     values ($1,$2,$3,$4,$5,$6, now(), now(), 'تسليم من السائق عبر التطبيق', $7, $8) returning *`,
    [`v-${seq}`, `V-${seq}`, h.plate, h.operator_id, h.site_id, emp.id, h.id, h.owner_phone]
  )).rows[0];
  const price=await quote(h.site_id);
  if(price.fee!==null){await c.query(`update visits set fee=$2 where id=$1`,[v.id,price.fee]);v.fee=price.fee;}
  const h2 = (await c.query(
    `update handoffs set status='accepted', accepted_at = now(), assigned_employee_id = $2, visit_id = $3 where id = $1 returning *`,
    [h.id, emp.id, v.id]
  )).rows[0];
  return { visit: v, handoff: h2, employee: emp };
}

export function notifyHandoffAccepted(h: any, v: any, empName: string) {
  void checkCapacity(v.site_id);
  publish({ driverPhone: h.owner_phone, driverUserId: h.driver_user_id }, {
    type: 'handoff_accepted', title: 'تم استلام سيارتك', body: `${empName} استلم السيارة ${h.plate} — إيصال ${v.receipt_no}`, link: '/driver/status',
  });
  notifyOperator(h.operator_id, { type: 'handoff_accepted', title: 'تم قبول طلب تسليم', body: `${h.plate} — ${v.receipt_no}` });
}

/** Driver asks a licensed lot to take the car; auto-accepted when the operator enabled it and there is room. */
export async function createHandoff(user: SessionUser, siteId: string, plate: string) {
  if (!plate) throw bad('أدخل رقم اللوحة');
  const site = await siteWithOperator(siteId);
  if (!site) throw bad('الموقف غير موجود', 404);
  if (site.op_status !== 'approved') throw bad('هذا الموقف غير مرخّص حالياً');
  const id = await nextId('h-', 'handoff_seq');
  const h = await q1(
    `insert into handoffs (id, plate, site_id, operator_id, status, owner_phone, driver_user_id) values ($1,$2,$3,$4,'pending',$5,$6) returning *`,
    [id, plate, siteId, site.operator_id, user.phone, user.id]
  );
  let result = h;
  if (site.auto_accept) {
    const occ = await q1(`select count(*)::int as n from visits where site_id = $1 and check_out_at is null`, [siteId]);
    if (occ.n < site.capacity) {
      const emp =
        (await q1(`select id, name from employees where operator_id=$1 and active and site_id=$2 order by id limit 1`, [site.operator_id, siteId])) ||
        (await q1(`select id, name from employees where operator_id=$1 and active and review_status='approved' order by id limit 1`, [site.operator_id]));
      if (emp) {
        const r = await tx((c) => acceptHandoffTx(c, h.id, emp.id));
        result = r.handoff;
        notifyHandoffAccepted(r.handoff, r.visit, emp.name);
      }
    }
  }
  if (result.status === 'pending') {
    notifyOperator(site.operator_id, { type: 'handoff_new', title: 'طلب تسليم جديد', body: `${plate} في ${site.name}`, link: '/operator/requests' });
  }
  return result;
}
