import bcrypt from 'bcryptjs';
import { STAFF_DOC_DEFS } from '../../../common/constants/documents.ts';
import { nextId, q1, tx } from '../../db/pool.ts';
import { bad, str } from '../../utils/http.ts';
import { normalizePhone } from '../../utils/phone.ts';
import { validPassword, validUsername } from '../../utils/validation.ts';

/** Operator registers a staff member: inactive + pending gov review, with empty document checklist and a login. */
export async function createEmployee(opId: string, b: any) {
  const name = str(b.name, 80);
  const nationalId = str(b.nationalId, 20);
  const phone = normalizePhone(str(b.phone, 20));
  const username = str(b.username, 32).toLowerCase();
  const password = String(b.password || '');
  if (!name || !nationalId || !phone) throw bad('أكمل الاسم والرقم الوطني والهاتف');
  if (!validUsername(username)) throw bad('اسم المستخدم: 3-32 حرفاً إنجليزياً/أرقام');
  if (!validPassword(password)) throw bad('كلمة المرور 8 أحرف على الأقل');
  if (await q1(`select 1 from users where lower(username)=$1`, [username])) throw bad('اسم المستخدم مستخدم مسبقاً');
  const siteId = str(b.siteId, 40) || null;
  if (siteId && !(await q1(`select 1 from sites where id=$1 and operator_id=$2`, [siteId, opId]))) throw bad('الموقف غير تابع لك');
  const id = await nextId('emp-');
  const hash = await bcrypt.hash(password, 10);
  await tx(async (c) => {
    await c.query(`insert into employees (id, operator_id, name, national_id, phone, site_id, active, review_status) values ($1,$2,$3,$4,$5,$6,false,'pending')`, [
      id, opId, name, nationalId, phone, siteId,
    ]);
    for (const d of STAFF_DOC_DEFS) {
      await c.query(`insert into documents (owner_type, owner_id, doc_key, name, status) values ('employee',$1,$2,$3,'missing')`, [id, d.id, d.name]);
    }
    await c.query(`insert into users (role, username, password_hash, name, operator_id, employee_id) values ('staff',$1,$2,$3,$4,$5)`, [username, hash, name, opId, id]);
  });
  return { id, name };
}
