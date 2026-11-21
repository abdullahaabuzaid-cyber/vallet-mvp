import bcrypt from 'bcryptjs';
import { OPERATOR_DOC_DEFS } from '../../../common/constants/documents.ts';
import { nextId, q1, tx } from '../../db/pool.ts';
import { bad, str } from '../../utils/http.ts';
import { validPassword, validUsername } from '../../utils/validation.ts';

/** Gov creates an operator account with its first lot (pending licence, empty document checklist). */
export async function createOperator(b: any) {
  const name = str(b.name, 80);
  const area = str(b.area, 80) || 'عمّان';
  const username = str(b.username, 32).toLowerCase();
  const password = String(b.password || '');
  const site = b.site || {};
  const lat = Number(site.lat), lng = Number(site.lng);
  if (!name) throw bad('اسم المشغّل مطلوب');
  if (!validUsername(username)) throw bad('اسم المستخدم: 3-32 حرفاً إنجليزياً/أرقام');
  if (!validPassword(password)) throw bad('كلمة المرور 8 أحرف على الأقل');
  if (!str(site.name, 80) || !Number.isFinite(lat) || !Number.isFinite(lng)) throw bad('أدخل اسم الموقف وإحداثياته');
  if (lat < 31.7 || lat > 32.2 || lng < 35.7 || lng > 36.2) throw bad('الإحداثيات خارج حدود عمّان');
  if (await q1(`select 1 from users where lower(username)=$1`, [username])) throw bad('اسم المستخدم مستخدم مسبقاً');
  const opId = await nextId('op-');
  const siteId = await nextId('site-');
  const hash = await bcrypt.hash(password, 10);
  await tx(async (c) => {
    await c.query(`insert into operators (id, name, status, area, authority_id) values ($1,$2,'pending',$3,'auth-amman')`, [opId, name, area]);
    await c.query(`insert into sites (id, operator_id, name, area, lat, lng, capacity) values ($1,$2,$3,$4,$5,$6,$7)`, [
      siteId, opId, str(site.name, 80), str(site.area, 80) || area, lat, lng, Math.max(1, Math.min(500, Number(site.capacity) || 10)),
    ]);
    for (const d of OPERATOR_DOC_DEFS) {
      await c.query(`insert into documents (owner_type, owner_id, doc_key, name, status) values ('operator',$1,$2,$3,'missing')`, [opId, d.id, d.name]);
    }
    await c.query(`insert into users (role, username, password_hash, name, operator_id) values ('operator',$1,$2,$3,$4)`, [username, hash, name, opId]);
  });
  return opId;
}
