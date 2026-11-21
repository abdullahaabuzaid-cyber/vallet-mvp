import express, { type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, q, q1, tx, migrate, seed, DEMO_ACCOUNTS, DEMO_DRIVERS } from './db.ts';
import {
  attachUser, requireRole, signSession, setSessionCookie, clearSessionCookie, normalizePhone, isJordanMobile, hashOtp,
  type SessionUser,
} from './auth.ts';
import { makeSmsProvider } from './sms.ts';
import { sseHandler, publish } from './realtime.ts';
import { buildState, mapVisit, mapHandoff, mapInvoice } from './state.ts';
import { parseRange, reportData, reportXlsx, reportPdf, invoicePdf } from './reports.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(here, '..', 'dist');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(here, '..', '.data', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const sms = makeSmsProvider();
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(attachUser);

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const bad = (msg: string, status = 400) => new HttpError(status, msg);
const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const nextId = async (prefix: string, seq = 'entity_seq') => `${prefix}${(await q1(`select nextval('${seq}') as n`))!.n}`;

function notifyOperator(operatorId: string, ev: Record<string, unknown>) {
  publish({ operatorId, gov: true }, ev as any);
}

// ---------- health / meta ----------
app.get('/health', async (_req, res) => {
  try {
    await pool.query('select 1');
    res.type('text').send('ok');
  } catch {
    res.status(503).type('text').send('db down');
  }
});

app.get('/api/demo-accounts', (_req, res) => {
  res.json({
    accounts: DEMO_ACCOUNTS.map((a) => ({ role: a.role, username: a.username, password: a.password, label: a.label })),
    drivers: DEMO_DRIVERS,
    smsDevMode: sms.devMode,
  });
});

app.get('/api/state', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await buildState(req.user));
});

app.get('/api/events', sseHandler);

// ---------- auth ----------
const loginAttempts = new Map<string, { n: number; until: number }>();
app.post('/api/auth/login', async (req, res) => {
  const username = str(req.body?.username, 64).toLowerCase();
  const password = String(req.body?.password || '');
  const key = `${req.ip}:${username}`;
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
  setSessionCookie(res, signSession({ id: u.id, role: u.role } as SessionUser));
  res.json({ ok: true, role: u.role });
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => res.json({ user: req.user ?? null }));

app.post('/api/auth/otp/request', async (req, res) => {
  const phone = normalizePhone(str(req.body?.phone, 20));
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
  res.json({ ok: true, phone, provider: sms.name, devMode: sms.devMode, ...(sms.devMode ? { devCode: code } : {}) });
});

app.post('/api/auth/otp/verify', async (req, res) => {
  const phone = normalizePhone(str(req.body?.phone, 20));
  const code = str(req.body?.code, 10);
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
  setSessionCookie(res, signSession({ id: u.id, role: 'driver' } as SessionUser));
  res.json({ ok: true });
});

// ---------- driver ----------
async function siteWithOperator(siteId: string) {
  return q1(`select s.*, o.status as op_status, o.auto_accept, o.name as op_name from sites s join operators o on o.id = s.operator_id where s.id = $1`, [siteId]);
}

async function acceptHandoffTx(c: any, handoffId: string, employeeId: string) {
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
  const h2 = (await c.query(
    `update handoffs set status='accepted', accepted_at = now(), assigned_employee_id = $2, visit_id = $3 where id = $1 returning *`,
    [h.id, emp.id, v.id]
  )).rows[0];
  return { visit: v, handoff: h2, employee: emp };
}

function notifyHandoffAccepted(h: any, v: any, empName: string) {
  publish({ driverPhone: h.owner_phone, driverUserId: h.driver_user_id }, {
    type: 'handoff_accepted', title: 'تم استلام سيارتك', body: `${empName} استلم السيارة ${h.plate} — إيصال ${v.receipt_no}`, link: '/driver/status',
  });
  notifyOperator(h.operator_id, { type: 'handoff_accepted', title: 'تم قبول طلب تسليم', body: `${h.plate} — ${v.receipt_no}` });
}

app.post('/api/handoffs', requireRole('driver'), async (req, res) => {
  const siteId = str(req.body?.siteId, 40);
  const plate = str(req.body?.plate, 20);
  if (!plate) throw bad('أدخل رقم اللوحة');
  const site = await siteWithOperator(siteId);
  if (!site) throw bad('الموقف غير موجود', 404);
  if (site.op_status !== 'approved') throw bad('هذا الموقف غير مرخّص حالياً');
  const id = await nextId('h-', 'handoff_seq');
  const h = await q1(
    `insert into handoffs (id, plate, site_id, operator_id, status, owner_phone, driver_user_id) values ($1,$2,$3,$4,'pending',$5,$6) returning *`,
    [id, plate, siteId, site.operator_id, req.user!.phone, req.user!.id]
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
  res.json({ handoff: mapHandoff(result) });
});

app.post('/api/handoffs/:id/cancel', requireRole('driver'), async (req, res) => {
  const h = await q1(`update handoffs set status='cancelled' where id=$1 and status='pending' and (driver_user_id=$2 or owner_phone=$3) returning *`, [
    req.params.id, req.user!.id, req.user!.phone,
  ]);
  if (!h) throw bad('لا يمكن إلغاء هذا الطلب');
  notifyOperator(h.operator_id, { type: 'handoff_cancelled', title: 'ألغى السائق طلب التسليم', body: h.plate });
  res.json({ handoff: mapHandoff(h) });
});

async function visitForUser(id: string, u: SessionUser) {
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

app.post('/api/visits/:id/request-return', requireRole('driver', 'staff', 'operator'), async (req, res) => {
  const v = await visitForUser(String(req.params.id), req.user!);
  if (v.check_out_at) throw bad('السيارة سُلّمت مسبقاً');
  const r = await q1(`update visits set return_requested_at = coalesce(return_requested_at, now()) where id=$1 returning *`, [v.id]);
  notifyOperator(v.operator_id, { type: 'return_requested', title: 'طلب إرجاع سيارة', body: `${v.plate} — ${v.receipt_no}`, link: '/staff/cars' });
  res.json({ visit: mapVisit(r) });
});

app.post('/api/ratings', requireRole('driver'), async (req, res) => {
  const v = await visitForUser(str(req.body?.visitId, 40), req.user!);
  const stars = Math.round(Number(req.body?.stars));
  if (!(stars >= 1 && stars <= 5)) throw bad('اختر تقييماً من 1 إلى 5');
  if (!v.check_out_at) throw bad('يمكن التقييم بعد استلام السيارة');
  const r = await q1(
    `insert into ratings (driver_user_id, driver_phone, visit_id, operator_id, site_id, stars, comment) values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (visit_id) do update set stars = excluded.stars, comment = excluded.comment, created_at = now() returning *`,
    [req.user!.id, req.user!.phone, v.id, v.operator_id, v.site_id, stars, str(req.body?.comment, 500) || null]
  );
  notifyOperator(v.operator_id, { type: 'rating', title: 'تقييم جديد', body: `${stars}/5 — ${v.plate}` });
  res.json({ rating: r });
});

const COMPLAINT_CATEGORIES = ['damage', 'delay', 'lost_item', 'behavior', 'overcharge', 'unlicensed', 'other'];
app.post('/api/complaints', requireRole('driver'), async (req, res) => {
  const category = str(req.body?.category, 30);
  const description = str(req.body?.description, 2000);
  if (!COMPLAINT_CATEGORIES.includes(category)) throw bad('اختر نوع الشكوى');
  if (description.length < 5) throw bad('اكتب تفاصيل الشكوى');
  let operatorId: string | null = null;
  let siteId: string | null = str(req.body?.siteId, 40) || null;
  let visitId: string | null = null;
  if (req.body?.visitId) {
    const v = await visitForUser(str(req.body.visitId, 40), req.user!);
    visitId = v.id; operatorId = v.operator_id; siteId = v.site_id;
  } else if (siteId) {
    const s = await q1(`select operator_id from sites where id=$1`, [siteId]);
    operatorId = s?.operator_id ?? null;
  }
  const c = await q1(
    `insert into complaints (driver_user_id, driver_phone, visit_id, operator_id, site_id, category, description) values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [req.user!.id, req.user!.phone, visitId, operatorId, siteId, category, description]
  );
  publish({ gov: true, operatorId }, { type: 'complaint_new', title: 'شكوى جديدة', body: description.slice(0, 80), link: '/gov/complaints' });
  res.json({ complaint: c });
});

// ---------- staff ----------
async function currentEmployee(u: SessionUser) {
  if (!u.employeeId) throw bad('الحساب غير مرتبط بموظف', 403);
  const e = await q1(`select * from employees where id = $1`, [u.employeeId]);
  if (!e) throw bad('الموظف غير موجود', 404);
  return e;
}

app.post('/api/visits/checkin', requireRole('staff'), async (req, res) => {
  const emp = await currentEmployee(req.user!);
  if (!emp.active || emp.review_status !== 'approved') throw bad('حسابك غير مفعّل بعد — بانتظار اعتماد الهيئة', 403);
  const op = await q1(`select status from operators where id=$1`, [emp.operator_id]);
  if (op?.status !== 'approved') throw bad('ترخيص المشغّل غير ساري — لا يمكن استلام سيارات', 403);
  const plate = str(req.body?.plate, 20);
  if (!plate) throw bad('أدخل رقم اللوحة');
  const siteId = emp.site_id || (await q1(`select id from sites where operator_id=$1 order by id limit 1`, [emp.operator_id]))?.id;
  if (!siteId) throw bad('لا يوجد موقف مرتبط');
  const b = req.body || {};
  const photo = typeof b.photoThumb === 'string' && b.photoThumb.startsWith('data:image/') && b.photoThumb.length < 400_000 ? b.photoThumb : null;
  const v = await tx(async (c) => {
    const seq = (await c.query(`select nextval('visit_seq') as n`)).rows[0].n;
    return (await c.query(
      `insert into visits (id, receipt_no, plate, operator_id, site_id, check_in_by, check_in_at, parked_at, notes, car_make, car_model, car_color, owner_phone, photo_thumb, handoff_id)
       values ($1,$2,$3,$4,$5,$6, now(), now(), $7,$8,$9,$10,$11,$12,$13) returning *`,
      [`v-${seq}`, `V-${seq}`, plate, emp.operator_id, siteId, emp.id, str(b.notes) || null, str(b.carMake, 40) || null, str(b.carModel, 40) || null,
        str(b.carColor, 30) || null, normalizePhone(str(b.ownerPhone, 20)) || null, photo, str(b.handoffId, 40) || null]
    )).rows[0];
  });
  notifyOperator(emp.operator_id, { type: 'visit_in', title: 'دخول سيارة', body: `${v.plate} — ${v.receipt_no}` });
  if (v.owner_phone) publish({ driverPhone: v.owner_phone }, { type: 'visit_in', title: 'تم استلام سيارتك', body: `${v.plate} — إيصال ${v.receipt_no}`, link: '/driver/status' });
  res.json({ visit: mapVisit(v) });
});

async function staffVisit(req: Request) {
  const v = await visitForUser(String(req.params.id), req.user!);
  if (req.user!.role === 'driver') throw bad('غير مصرّح', 403);
  return v;
}

app.post('/api/visits/:id/checkout', requireRole('staff', 'operator'), async (req, res) => {
  const v = await staffVisit(req);
  if (v.check_out_at) throw bad('تم تسجيل الخروج مسبقاً');
  const by = req.user!.employeeId || v.check_in_by;
  const r = await q1(`update visits set check_out_at = now(), check_out_by = $2 where id=$1 returning *`, [v.id, by]);
  notifyOperator(v.operator_id, { type: 'visit_out', title: 'خروج سيارة', body: `${v.plate} — ${v.receipt_no}` });
  publish({ driverPhone: v.owner_phone }, { type: 'visit_out', title: 'تم تسليم سيارتك', body: `${v.plate} — قيّم الخدمة الآن`, link: '/driver/status' });
  res.json({ visit: mapVisit(r) });
});

app.post('/api/visits/:id/parked', requireRole('staff', 'operator'), async (req, res) => {
  const v = await staffVisit(req);
  const r = await q1(`update visits set parked_at = coalesce(parked_at, now()) where id=$1 returning *`, [v.id]);
  publish({ driverPhone: v.owner_phone, operatorId: v.operator_id }, { type: 'visit_parked', title: 'رُكنت سيارتك', body: v.plate });
  res.json({ visit: mapVisit(r) });
});

app.post('/api/visits/:id/ready', requireRole('staff', 'operator'), async (req, res) => {
  const v = await staffVisit(req);
  if (v.check_out_at) throw bad('تم تسليم السيارة مسبقاً');
  const r = await q1(`update visits set ready_at = now(), return_requested_at = coalesce(return_requested_at, now()) where id=$1 returning *`, [v.id]);
  publish({ driverPhone: v.owner_phone }, { type: 'visit_ready', title: 'سيارتك جاهزة 🚗', body: `${v.plate} بانتظارك عند المدخل`, link: '/driver/status' });
  notifyOperator(v.operator_id, { type: 'visit_ready', title: 'سيارة جاهزة للتسليم', body: v.plate });
  res.json({ visit: mapVisit(r) });
});

const INCIDENT_TYPES = ['damage', 'lost_keys', 'delay', 'unlicensed', 'other'];
app.post('/api/incidents', requireRole('staff', 'gov', 'operator'), async (req, res) => {
  const type = str(req.body?.type, 20);
  const description = str(req.body?.description, 2000);
  if (!INCIDENT_TYPES.includes(type)) throw bad('نوع البلاغ غير صالح');
  if (!description) throw bad('اكتب وصف البلاغ');
  const u = req.user!;
  const operatorId = u.role === 'gov' ? str(req.body?.operatorId, 40) || null : u.operatorId;
  const lat = Number.isFinite(Number(req.body?.lat)) && req.body?.lat !== null && req.body?.lat !== undefined ? Number(req.body.lat) : null;
  const lng = Number.isFinite(Number(req.body?.lng)) && req.body?.lng !== null && req.body?.lng !== undefined ? Number(req.body.lng) : null;
  const id = await nextId('inc-', 'incident_seq');
  const i = await q1(
    `insert into incidents (id, type, visit_id, operator_id, description, status, created_by, plate, lat, lng, area) values ($1,$2,$3,$4,$5,'open',$6,$7,$8,$9,$10) returning *`,
    [id, type, str(req.body?.visitId, 40) || null, operatorId, description, u.role === 'gov' ? 'gov' : u.employeeId || `user-${u.id}`,
      str(req.body?.plate, 20) || null, lat, lng, str(req.body?.area, 80) || null]
  );
  publish({ gov: true, operatorId }, { type: 'incident_new', title: 'بلاغ جديد', body: description.slice(0, 80), link: '/gov/incidents' });
  res.json({ incident: i });
});

// ---------- operator ----------
app.post('/api/handoffs/:id/accept', requireRole('operator', 'staff'), async (req, res) => {
  const h0 = await q1(`select * from handoffs where id=$1`, [req.params.id]);
  if (!h0 || h0.operator_id !== req.user!.operatorId) throw bad('الطلب غير موجود', 404);
  const employeeId = req.user!.role === 'staff' ? req.user!.employeeId! : str(req.body?.employeeId, 40);
  const r = await tx((c) => acceptHandoffTx(c, h0.id, employeeId));
  notifyHandoffAccepted(r.handoff, r.visit, r.employee.name);
  res.json({ visit: mapVisit(r.visit), handoff: mapHandoff(r.handoff) });
});

app.post('/api/handoffs/:id/reject', requireRole('operator'), async (req, res) => {
  const h = await q1(`update handoffs set status='rejected' where id=$1 and operator_id=$2 and status='pending' returning *`, [req.params.id, req.user!.operatorId]);
  if (!h) throw bad('لا يمكن رفض هذا الطلب');
  publish({ driverPhone: h.owner_phone, driverUserId: h.driver_user_id }, { type: 'handoff_rejected', title: 'تم رفض طلب التسليم', body: `${h.plate} — جرّب موقفاً آخر`, link: '/driver/status' });
  notifyOperator(h.operator_id, { type: 'handoff_rejected' });
  res.json({ handoff: mapHandoff(h) });
});

app.post('/api/operator/auto-accept', requireRole('operator'), async (req, res) => {
  await q(`update operators set auto_accept = $2 where id = $1`, [req.user!.operatorId, !!req.body?.enabled]);
  notifyOperator(req.user!.operatorId!, { type: 'operator_updated' });
  res.json({ ok: true });
});

const STAFF_DOCS = [
  ['nid', 'الهوية'], ['license', 'رخصة قيادة سارية'], ['clearance', 'شهادة عدم محكومية'],
];
const OPERATOR_DOCS = [
  ['nid', 'الهوية الوطنية'], ['cr', 'السجل التجاري'], ['deed', 'سند الملكية / عقد الإيجار'], ['ins', 'تأمين المسؤولية'], ['clearance', 'شهادة عدم محكومية'],
];

function validUsername(u: string) {
  return /^[a-z0-9._-]{3,32}$/.test(u);
}
function validPassword(p: string) {
  return typeof p === 'string' && p.length >= 8;
}

app.post('/api/employees', requireRole('operator'), async (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 80);
  const nationalId = str(b.nationalId, 20);
  const phone = normalizePhone(str(b.phone, 20));
  const username = str(b.username, 32).toLowerCase();
  const password = String(b.password || '');
  if (!name || !nationalId || !phone) throw bad('أكمل الاسم والرقم الوطني والهاتف');
  if (!validUsername(username)) throw bad('اسم المستخدم: 3-32 حرفاً إنجليزياً/أرقام');
  if (!validPassword(password)) throw bad('كلمة المرور 8 أحرف على الأقل');
  if (await q1(`select 1 from users where lower(username)=$1`, [username])) throw bad('اسم المستخدم مستخدم مسبقاً');
  const opId = req.user!.operatorId!;
  const siteId = str(b.siteId, 40) || null;
  if (siteId && !(await q1(`select 1 from sites where id=$1 and operator_id=$2`, [siteId, opId]))) throw bad('الموقف غير تابع لك');
  const id = await nextId('emp-');
  const hash = await bcrypt.hash(password, 10);
  await tx(async (c) => {
    await c.query(`insert into employees (id, operator_id, name, national_id, phone, site_id, active, review_status) values ($1,$2,$3,$4,$5,$6,false,'pending')`, [
      id, opId, name, nationalId, phone, siteId,
    ]);
    for (const [k, n] of STAFF_DOCS) {
      await c.query(`insert into documents (owner_type, owner_id, doc_key, name, status) values ('employee',$1,$2,$3,'missing')`, [id, k, n]);
    }
    await c.query(`insert into users (role, username, password_hash, name, operator_id, employee_id) values ('staff',$1,$2,$3,$4,$5)`, [username, hash, name, opId, id]);
  });
  publish({ gov: true, operatorId: opId }, { type: 'employee_new', title: 'طلب تسجيل موظف', body: name, link: '/gov/licenses' });
  res.json({ employee: { id } });
});

app.post('/api/employees/:id/toggle', requireRole('operator'), async (req, res) => {
  const e = await q1(`select * from employees where id=$1 and operator_id=$2`, [req.params.id, req.user!.operatorId]);
  if (!e) throw bad('الموظف غير موجود', 404);
  if (!e.active && e.review_status !== 'approved') throw bad('لا يمكن تفعيل موظف قبل اعتماد الهيئة');
  await q(`update employees set active = not active where id=$1`, [e.id]);
  notifyOperator(e.operator_id, { type: 'employee_updated' });
  res.json({ ok: true });
});

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, _file, cb) => cb(null, crypto.randomBytes(16).toString('hex')),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIME.includes(file.mimetype)),
});

app.post('/api/documents/upload', requireRole('operator'), upload.single('file'), async (req, res) => {
  const f = req.file;
  if (!f) throw bad('ارفع ملف PDF أو صورة (حتى 10MB)');
  const ownerType = str(req.body?.ownerType, 20);
  const ownerId = str(req.body?.ownerId, 40);
  const docKey = str(req.body?.docKey, 20);
  const opId = req.user!.operatorId!;
  const ok = ownerType === 'operator' ? ownerId === opId : ownerType === 'employee' && !!(await q1(`select 1 from employees where id=$1 and operator_id=$2`, [ownerId, opId]));
  if (!ok) {
    fs.rmSync(f.path, { force: true });
    throw bad('غير مصرّح', 403);
  }
  const defs = ownerType === 'operator' ? OPERATOR_DOCS : STAFF_DOCS;
  const def = defs.find(([k]) => k === docKey);
  if (!def) throw bad('نوع المستند غير صالح');
  const old = await q1(`select storage_key from documents where owner_type=$1 and owner_id=$2 and doc_key=$3`, [ownerType, ownerId, docKey]);
  const fileName = Buffer.from(f.originalname, 'latin1').toString('utf8').slice(0, 120);
  await q(
    `insert into documents (owner_type, owner_id, doc_key, name, status, file_name, storage_key, mime, size, uploaded_at)
     values ($1,$2,$3,$4,'uploaded',$5,$6,$7,$8, now())
     on conflict (owner_type, owner_id, doc_key) do update set status='uploaded', note=null, file_name=excluded.file_name,
       storage_key=excluded.storage_key, mime=excluded.mime, size=excluded.size, uploaded_at=now(), reviewed_at=null, reviewed_by=null`,
    [ownerType, ownerId, docKey, def[1], fileName, f.filename, f.mimetype, f.size]
  );
  if (old?.storage_key) fs.rmSync(path.join(UPLOAD_DIR, old.storage_key), { force: true });
  if (ownerType === 'employee') await q(`update employees set review_status='pending' where id=$1 and review_status <> 'approved'`, [ownerId]);
  publish({ gov: true, operatorId: opId }, { type: 'document_uploaded', title: 'مستند جديد للمراجعة', body: `${def[1]} — ${fileName}`, link: '/gov/licenses' });
  res.json({ ok: true });
});

app.get('/api/documents/:dbId/file', requireRole('gov', 'operator'), async (req, res) => {
  const d = await q1(`select * from documents where id=$1`, [Number(req.params.dbId)]);
  if (!d || !d.storage_key) throw bad('لا يوجد ملف مرفوع لهذا المستند', 404);
  if (req.user!.role === 'operator') {
    const mine = d.owner_type === 'operator' ? d.owner_id === req.user!.operatorId
      : !!(await q1(`select 1 from employees where id=$1 and operator_id=$2`, [d.owner_id, req.user!.operatorId]));
    if (!mine) throw bad('غير مصرّح', 403);
  }
  const p = path.join(UPLOAD_DIR, d.storage_key);
  if (!fs.existsSync(p)) throw bad('الملف غير موجود على الخادم', 404);
  res.setHeader('Content-Type', d.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(d.file_name || 'document')}`);
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(p).pipe(res);
});

app.post('/api/operator/submit', requireRole('operator'), async (req, res) => {
  const opId = req.user!.operatorId!;
  const missing = await q1(`select count(*)::int as n from documents where owner_type='operator' and owner_id=$1 and status in ('missing','rejected')`, [opId]);
  if (missing.n > 0) throw bad('ارفع كل المستندات المطلوبة قبل الإرسال');
  const op = await q1(`update operators set status = case when status='approved' then status else 'pending' end, submitted_at = now(), reject_reason = null where id=$1 returning *`, [opId]);
  publish({ gov: true, operatorId: opId }, { type: 'operator_submitted', title: 'طلب ترخيص للمراجعة', body: op.name, link: '/gov/licenses' });
  res.json({ ok: true });
});

// ---------- payments (mock gateway, test mode) ----------
async function invoiceForUser(id: number, u: SessionUser) {
  const inv = await q1(`select * from invoices where id=$1`, [id]);
  if (!inv) throw bad('الفاتورة غير موجودة', 404);
  if (u.role === 'gov' || (u.role === 'operator' && inv.operator_id === u.operatorId)) return inv;
  throw bad('غير مصرّح', 403);
}

app.post('/api/invoices/:id/checkout', requireRole('operator', 'gov'), async (req, res) => {
  const inv = await invoiceForUser(Number(req.params.id), req.user!);
  if (inv.status === 'paid') throw bad('الفاتورة مدفوعة مسبقاً');
  const ref = `TEST-PAY-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  await q(`insert into payments (invoice_id, ref, amount, status) values ($1,$2,$3,'pending')`, [inv.id, ref, inv.amount]);
  res.json({ ref, amount: Number(inv.amount), currency: 'JOD', testMode: true, invoice: mapInvoice(inv) });
});

app.post('/api/payments/:ref/confirm', requireRole('operator', 'gov'), async (req, res) => {
  const p = await q1(`select * from payments where ref=$1`, [req.params.ref]);
  if (!p) throw bad('عملية الدفع غير موجودة', 404);
  const inv = await invoiceForUser(p.invoice_id, req.user!);
  if (p.status !== 'pending') throw bad('تمت معالجة هذه العملية');
  const card = String(req.body?.cardNumber || '').replace(/\D/g, '');
  const exp = str(req.body?.expiry, 7);
  const cvc = str(req.body?.cvc, 4);
  if (card.length < 12 || !/^\d{2}\/\d{2}$/.test(exp) || !/^\d{3,4}$/.test(cvc)) throw bad('بيانات البطاقة غير مكتملة');
  // Mock gateway rules: 4000 0000 0000 0002 → declined, anything else valid → approved
  if (card === '4000000000000002') {
    await q(`update payments set status='failed', failure_reason='card_declined', completed_at=now(), card_last4=$2 where id=$1`, [p.id, card.slice(-4)]);
    throw bad('تم رفض البطاقة (بطاقة اختبار للرفض)', 402);
  }
  await tx(async (c) => {
    await c.query(`update payments set status='succeeded', completed_at=now(), card_last4=$2 where id=$1`, [p.id, card.slice(-4)]);
    await c.query(`update invoices set status='paid', paid_at=now(), payment_ref=$2 where id=$1`, [inv.id, p.ref]);
  });
  publish({ gov: true, operatorId: inv.operator_id }, { type: 'invoice_paid', title: 'تم دفع فاتورة', body: `${inv.number} — ${Number(inv.amount).toFixed(3)} د.أ` });
  res.json({ ok: true, ref: p.ref });
});

app.get('/api/invoices/:id/pdf', requireRole('operator', 'gov'), async (req, res) => {
  const inv = await invoiceForUser(Number(req.params.id), req.user!);
  const op = inv.operator_id ? await q1(`select name from operators where id=$1`, [inv.operator_id]) : null;
  const pay = await q1(`select * from payments where invoice_id=$1 and status='succeeded' order by id desc limit 1`, [inv.id]);
  const buf = await invoicePdf(inv, op?.name ?? null, pay ?? null);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${inv.number}.pdf"`);
  res.send(buf);
});

// ---------- gov ----------
const gov = express.Router();
gov.use(requireRole('gov'));

gov.post('/operators', async (req, res) => {
  const b = req.body || {};
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
    for (const [k, n] of OPERATOR_DOCS) {
      await c.query(`insert into documents (owner_type, owner_id, doc_key, name, status) values ('operator',$1,$2,$3,'missing')`, [opId, k, n]);
    }
    await c.query(`insert into users (role, username, password_hash, name, operator_id) values ('operator',$1,$2,$3,$4)`, [username, hash, name, opId]);
  });
  publish({ gov: true }, { type: 'operator_created' });
  res.json({ operator: { id: opId } });
});

async function issueInvoice(operatorId: string | null, payerName: string | null, kind: string, description: string, amount: number, incidentId?: string | null) {
  const n = (await q1(`select nextval('invoice_seq') as n`))!.n;
  const number = `INV-${new Date().getFullYear()}-${n}`;
  const inv = await q1(
    `insert into invoices (number, operator_id, payer_name, kind, description, amount, status, due_at, incident_id) values ($1,$2,$3,$4,$5,$6,'unpaid', now() + interval '30 days', $7) returning *`,
    [number, operatorId, payerName, kind, description, amount, incidentId ?? null]
  );
  if (operatorId) notifyOperator(operatorId, { type: 'invoice_new', title: 'فاتورة جديدة', body: `${description} — ${amount.toFixed(3)} د.أ`, link: '/operator/payments' });
  return inv;
}

const LICENSE_FEE = Number(process.env.LICENSE_FEE_JOD || 500);
gov.post('/operators/:id/approve', async (req, res) => {
  const year = new Date().getFullYear();
  const op = await q1(`select * from operators where id=$1`, [req.params.id]);
  if (!op) throw bad('المشغّل غير موجود', 404);
  const licenseNo = op.license_no || `LIC-AMM-${year}-${String(crypto.randomInt(100, 1000))}`;
  await tx(async (c) => {
    await c.query(`update operators set status='approved', license_no=$2, license_expiry=$3, reject_reason=null where id=$1`, [op.id, licenseNo, `${year + 1}-12-31`]);
    await c.query(`update documents set status='accepted', note=null, reviewed_at=now(), reviewed_by=$2 where owner_type='operator' and owner_id=$1 and status <> 'missing'`, [op.id, `user-${req.user!.id}`]);
  });
  if (op.status !== 'approved') await issueInvoice(op.id, null, 'license_fee', `رسوم ترخيص سنوية — ${op.name}`, LICENSE_FEE);
  publish({ public: true }, { type: 'lots_changed' });
  notifyOperator(op.id, { type: 'license_approved', title: 'تم اعتماد الترخيص', body: licenseNo, link: '/operator/license' });
  res.json({ ok: true, licenseNo });
});

gov.post('/operators/:id/reject', async (req, res) => {
  const reason = str(req.body?.reason, 300) || 'مستندات غير مكتملة';
  const op = await q1(`update operators set status='rejected', reject_reason=$2 where id=$1 returning *`, [req.params.id, reason]);
  if (!op) throw bad('المشغّل غير موجود', 404);
  publish({ public: true }, { type: 'lots_changed' });
  notifyOperator(op.id, { type: 'license_rejected', title: 'تم رفض طلب الترخيص', body: reason, link: '/operator/license' });
  res.json({ ok: true });
});

gov.post('/operators/:id/status', async (req, res) => {
  const status = str(req.body?.status, 20);
  if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) throw bad('حالة غير صالحة');
  const op = await q1(`update operators set status=$2 where id=$1 returning *`, [req.params.id, status]);
  if (!op) throw bad('المشغّل غير موجود', 404);
  publish({ public: true }, { type: 'lots_changed' });
  notifyOperator(op.id, { type: 'operator_status', title: 'تغيّرت حالة الترخيص', body: status });
  res.json({ ok: true });
});

gov.post('/employees/:id/approve', async (req, res) => {
  const e = await q1(`update employees set review_status='approved', active=true, reject_reason=null where id=$1 returning *`, [req.params.id]);
  if (!e) throw bad('الموظف غير موجود', 404);
  await q(`update documents set status='accepted', reviewed_at=now() where owner_type='employee' and owner_id=$1 and status in ('uploaded','accepted','expiring')`, [e.id]);
  notifyOperator(e.operator_id, { type: 'employee_approved', title: 'تم اعتماد موظف', body: e.name });
  res.json({ ok: true });
});

gov.post('/employees/:id/reject', async (req, res) => {
  const reason = str(req.body?.reason, 300) || 'مستندات غير مكتملة';
  const e = await q1(`update employees set review_status='rejected', active=false, reject_reason=$2 where id=$1 returning *`, [req.params.id, reason]);
  if (!e) throw bad('الموظف غير موجود', 404);
  notifyOperator(e.operator_id, { type: 'employee_rejected', title: 'تم رفض موظف', body: `${e.name}: ${reason}` });
  res.json({ ok: true });
});

gov.post('/documents/:dbId/review', async (req, res) => {
  const status = str(req.body?.status, 20);
  if (!['accepted', 'rejected'].includes(status)) throw bad('حالة غير صالحة');
  const d = await q1(`update documents set status=$2, note=$3, reviewed_at=now(), reviewed_by=$4 where id=$1 returning *`, [
    Number(req.params.dbId), status, status === 'rejected' ? str(req.body?.note, 200) || 'مرفوض' : null, `user-${req.user!.id}`,
  ]);
  if (!d) throw bad('المستند غير موجود', 404);
  const opId = d.owner_type === 'operator' ? d.owner_id : (await q1(`select operator_id from employees where id=$1`, [d.owner_id]))?.operator_id;
  notifyOperator(opId, { type: 'document_reviewed', title: status === 'accepted' ? 'تم قبول مستند' : 'تم رفض مستند', body: d.name });
  res.json({ ok: true });
});

const FINE_DEFAULT = Number(process.env.FINE_DEFAULT_JOD || 1000);
gov.post('/incidents/:id/status', async (req, res) => {
  const status = str(req.body?.status, 20);
  if (!['open', 'investigating', 'closed', 'fined'].includes(status)) throw bad('حالة غير صالحة');
  const prev = await q1(`select * from incidents where id=$1`, [req.params.id]);
  if (!prev) throw bad('البلاغ غير موجود', 404);
  const i = await q1(`update incidents set status=$2 where id=$1 returning *`, [prev.id, status]);
  if (status === 'fined' && prev.status !== 'fined') {
    const amount = Math.max(1, Number(req.body?.fineAmount) || FINE_DEFAULT);
    const payer = i.operator_id ? null : `فاليه غير مرخّص — ${i.area || 'عمّان'}`;
    await issueInvoice(i.operator_id, payer, 'fine', `مخالفة: ${i.description.slice(0, 80)}`, amount, i.id);
  }
  publish({ gov: true, operatorId: i.operator_id }, { type: 'incident_updated' });
  res.json({ ok: true });
});

gov.post('/fines', async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!(amount > 0)) throw bad('أدخل مبلغ الغرامة');
  const operatorId = str(req.body?.operatorId, 40) || null;
  const payer = str(req.body?.payerName, 120) || null;
  if (!operatorId && !payer) throw bad('حدّد المشغّل أو اسم المخالف');
  const inv = await issueInvoice(operatorId, payer, 'fine', str(req.body?.description, 200) || 'غرامة مخالفة', amount);
  publish({ gov: true }, { type: 'invoice_new' });
  res.json({ invoice: mapInvoice(inv) });
});

gov.post('/complaints/:id', async (req, res) => {
  const status = str(req.body?.status, 20);
  if (!['open', 'investigating', 'resolved', 'rejected'].includes(status)) throw bad('حالة غير صالحة');
  const c = await q1(`update complaints set status=$2, gov_response=coalesce(nullif($3,''), gov_response), updated_at=now() where id=$1 returning *`, [
    Number(req.params.id), status, str(req.body?.response, 1000),
  ]);
  if (!c) throw bad('الشكوى غير موجودة', 404);
  publish({ driverPhone: c.driver_phone, driverUserId: c.driver_user_id, gov: true, operatorId: c.operator_id }, {
    type: 'complaint_updated', title: 'تحديث على شكواك', body: c.gov_response || status, link: '/driver/status',
  });
  res.json({ ok: true });
});

gov.post('/alerts/:id/ack', async (req, res) => {
  await q(`update alerts set status='acknowledged', acked_at=now(), acked_by=$2 where id=$1`, [req.params.id, `user-${req.user!.id}`]);
  res.json({ ok: true });
});

gov.get('/reports', async (req, res) => {
  res.json(await reportData(parseRange(req.query.from, req.query.to)));
});
gov.get('/reports/export.xlsx', async (req, res) => {
  const buf = await reportXlsx(parseRange(req.query.from, req.query.to));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="vallet-report-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  res.send(buf);
});
gov.get('/reports/export.pdf', async (req, res) => {
  const buf = await reportPdf(parseRange(req.query.from, req.query.to));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="vallet-report-${new Date().toISOString().slice(0, 10)}.pdf"`);
  res.send(buf);
});

gov.post('/reset-demo', async (_req, res) => {
  await seed(true);
  publish({ public: true }, { type: 'reset' });
  res.json({ ok: true });
});

app.use('/api/gov', gov);

app.use('/api', (_req, res) => res.status(404).json({ error: 'غير موجود' }));

// ---------- static SPA ----------
const BUILD_ID = process.env.RAILWAY_DEPLOYMENT_ID || String(Date.now());
if (fs.existsSync(DIST)) {
  app.get('/sw.js', (_req, res) => {
    const src = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8').replace('__BUILD__', BUILD_ID);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Service-Worker-Allowed', '/');
    res.send(src);
  });
  app.get('/manifest.webmanifest', (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST, 'manifest.webmanifest'));
  });
  app.use(
    express.static(DIST, {
      index: false,
      setHeaders: (res, p) => {
        if (p.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else res.setHeader('Cache-Control', 'no-cache');
      },
    })
  );
  app.get(/.*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

app.use((err: any, _req: Request, res: Response, _next: unknown) => {
  const status = err instanceof HttpError ? err.status : err?.status || (err?.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error('[api]', err);
  res.status(status).json({ error: status >= 500 ? 'خطأ في الخادم' : err.message || 'خطأ' });
});

const PORT = Number(process.env.PORT || 8080);
(async () => {
  await migrate();
  const seeded = await seed(false);
  if (seeded) console.log('[db] seeded demo data');
  app.listen(PORT, '0.0.0.0', () => console.log(`[vallet] listening on :${PORT} (sms=${sms.name})`));
})().catch((e) => {
  console.error('fatal', e);
  process.exit(1);
});
