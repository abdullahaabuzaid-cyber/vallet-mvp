import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { q, q1 } from '../../db/pool.ts';
import { bad } from '../../utils/http.ts';
import { isJordanMobile } from '../../utils/phone.ts';
import { sms } from '../sms/sms.service.ts';
import { hashOtp } from './session.ts';

// ---------- username / password (gov, operator, staff) ----------
const loginAttempts = new Map<string, { n: number; until: number }>();

/** Verifies credentials with a simple per ip+username lockout (8 tries / 10 min). */
export async function loginWithPassword(ip: string | undefined, username: string, password: string) {
  const key = `${ip}:${username}`;
  const att = loginAttempts.get(key);
  if (att && att.n >= 8 && att.until > Date.now()) throw bad('محاولات كثيرة، حاول بعد دقائق', 429);
  const u = await q1(`select * from users where lower(username) = $1 and role <> 'driver'`, [username]);
  if (!u || !u.password_hash || !(await bcrypt.compare(password, u.password_hash))) {
    const n = (att?.n || 0) + 1;
    loginAttempts.set(key, { n, until: Date.now() + 10 * 60_000 });
    throw bad('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
  }
  loginAttempts.delete(key);
  await q(`update users set last_login_at = now() where id = $1`, [u.id]);
  return u;
}

// ---------- driver phone + OTP ----------
export async function requestOtp(phone: string) {
  if (!isJordanMobile(phone)) throw bad('أدخل رقم هاتف أردني صالح (07XXXXXXXX)');
  const recent = await q1(`select created_at from otp_codes where phone = $1 and created_at > now() - interval '20 seconds' order by id desc limit 1`, [phone]);
  if (recent) throw bad('انتظر قليلاً قبل طلب رمز جديد', 429);
  const code = String(crypto.randomInt(100000, 1000000));
  await q(`insert into otp_codes (phone, code_hash, expires_at) values ($1,$2, now() + interval '5 minutes')`, [phone, hashOtp(phone, code)]);
  try {
    await sms.send(phone, `رمز الدخول إلى فاليت: ${code} (صالح 5 دقائق)`);
  } catch (e) {
    console.error('[sms] send failed', e);
    throw bad('تعذّر إرسال الرسالة، حاول لاحقاً', 502);
  }
  return { ok: true, phone, provider: sms.name, devMode: sms.devMode, ...(sms.devMode ? { devCode: code } : {}) };
}

/** Checks the latest OTP and returns the driver user (created on first login). */
export async function verifyOtp(phone: string, code: string) {
  const row = await q1(`select * from otp_codes where phone = $1 and used = false and expires_at > now() order by id desc limit 1`, [phone]);
  if (!row) throw bad('الرمز منتهي، اطلب رمزاً جديداً');
  if (row.attempts >= 5) throw bad('محاولات كثيرة، اطلب رمزاً جديداً', 429);
  if (row.code_hash !== hashOtp(phone, code)) {
    await q(`update otp_codes set attempts = attempts + 1 where id = $1`, [row.id]);
    throw bad('رمز غير صحيح');
  }
  await q(`update otp_codes set used = true where id = $1`, [row.id]);
  let u = await q1(`select * from users where phone = $1 and role = 'driver'`, [phone]);
  if (!u) u = await q1(`insert into users (role, phone, name) values ('driver', $1, 'سائق') returning *`, [phone]);
  await q(`update users set last_login_at = now() where id = $1`, [u.id]);
  return u;
}
