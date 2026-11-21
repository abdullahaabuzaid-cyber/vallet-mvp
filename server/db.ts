import pg from 'pg';
import bcrypt from 'bcryptjs';
import { SEED } from '../src/data/seed.ts';

const url = process.env.DATABASE_URL || 'postgres://vallet@localhost:5433/vallet';
export const pool = new pg.Pool({
  connectionString: url,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export async function q<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool.query(text, params as any[]);
  return r.rows as T[];
}
export async function q1<T = any>(text: string, params: unknown[] = []): Promise<T | undefined> {
  return (await q<T>(text, params))[0];
}

export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

const SCHEMA = `
create table if not exists authorities (
  id text primary key, name text not null, city text, created_at timestamptz default now()
);
create table if not exists operators (
  id text primary key, name text not null, license_no text, status text not null default 'pending',
  license_expiry text, reject_reason text, submitted_at timestamptz default now(), area text,
  auto_accept boolean not null default false, authority_id text, created_at timestamptz default now()
);
create table if not exists sites (
  id text primary key, operator_id text not null references operators(id) on delete cascade,
  name text not null, area text, lat double precision not null, lng double precision not null, capacity int not null default 10
);
create table if not exists employees (
  id text primary key, operator_id text not null references operators(id) on delete cascade,
  name text not null, national_id text, phone text, site_id text, active boolean not null default false,
  review_status text not null default 'pending', reject_reason text, created_at timestamptz default now()
);
create table if not exists documents (
  id serial primary key, owner_type text not null, owner_id text not null, doc_key text not null, name text not null,
  status text not null default 'missing', note text, file_name text, storage_key text, mime text, size int,
  uploaded_at timestamptz, reviewed_at timestamptz, reviewed_by text,
  unique (owner_type, owner_id, doc_key)
);
create table if not exists users (
  id serial primary key, role text not null, username text unique, phone text unique, password_hash text,
  name text, operator_id text, employee_id text, authority_id text, created_at timestamptz default now(), last_login_at timestamptz
);
create table if not exists otp_codes (
  id serial primary key, phone text not null, code_hash text not null, expires_at timestamptz not null,
  attempts int not null default 0, used boolean not null default false, created_at timestamptz default now()
);
create table if not exists handoffs (
  id text primary key, plate text not null, site_id text not null, operator_id text not null, status text not null,
  created_at timestamptz not null default now(), accepted_at timestamptz, assigned_employee_id text, visit_id text,
  owner_phone text, driver_user_id int
);
create table if not exists visits (
  id text primary key, receipt_no text not null, plate text not null, operator_id text not null, site_id text not null,
  check_in_by text, check_out_by text, check_in_at timestamptz not null, check_out_at timestamptz, notes text, handoff_id text,
  car_make text, car_model text, car_color text, owner_phone text, photo_thumb text, parked_at timestamptz,
  return_requested_at timestamptz, ready_at timestamptz
);
create table if not exists incidents (
  id text primary key, type text not null, visit_id text, operator_id text, description text not null, status text not null default 'open',
  created_at timestamptz not null default now(), created_by text, plate text, lat double precision, lng double precision, area text
);
create table if not exists alerts (
  id text primary key, kind text not null, severity text not null, title text not null, detail text,
  status text not null default 'open', first_seen timestamptz default now(), last_seen timestamptz default now(),
  acked_at timestamptz, acked_by text
);
create table if not exists complaints (
  id serial primary key, driver_user_id int, driver_phone text, visit_id text, operator_id text, site_id text,
  category text not null, description text not null, status text not null default 'open', gov_response text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists ratings (
  id serial primary key, driver_user_id int, driver_phone text, visit_id text unique, operator_id text, site_id text,
  stars int not null check (stars between 1 and 5), comment text, created_at timestamptz default now()
);
create table if not exists invoices (
  id serial primary key, number text unique not null, operator_id text, payer_name text, kind text not null, description text,
  amount numeric(12,3) not null, status text not null default 'unpaid', issued_at timestamptz default now(), due_at timestamptz,
  paid_at timestamptz, incident_id text, payment_ref text
);
create table if not exists payments (
  id serial primary key, invoice_id int references invoices(id), ref text unique not null, amount numeric(12,3) not null,
  status text not null default 'pending', card_last4 text, test_mode boolean not null default true,
  created_at timestamptz default now(), completed_at timestamptz, failure_reason text
);
create sequence if not exists visit_seq start 240891;
create sequence if not exists handoff_seq start 100;
create sequence if not exists incident_seq start 311;
create sequence if not exists invoice_seq start 1001;
create sequence if not exists entity_seq start 1000;
alter table visits add column if not exists ready_at timestamptz;
`;

export async function migrate() {
  await pool.query(SCHEMA);
}

export const DEMO_PASSWORDS = {
  gov: 'Gov@2026',
  operator: 'Operator@2026',
  staff: 'Staff@2026',
};

export const DEMO_ACCOUNTS = [
  { role: 'gov', username: 'admin', password: DEMO_PASSWORDS.gov, label: 'هيئة تنظيم الفاليه (مدير)' },
  { role: 'operator', username: 'elite', password: DEMO_PASSWORDS.operator, label: 'فاليه النخبة — مرخّص', operatorId: 'op-1' },
  { role: 'operator', username: 'saffni', password: DEMO_PASSWORDS.operator, label: 'صفّني — مرخّص', operatorId: 'op-5' },
  { role: 'operator', username: 'fastline', password: DEMO_PASSWORDS.operator, label: 'الصف السريع — قيد المراجعة', operatorId: 'op-2' },
  { role: 'operator', username: 'parkingplus', password: DEMO_PASSWORDS.operator, label: 'باركينغ بلس — موقوف', operatorId: 'op-3' },
  { role: 'staff', username: 'ahmad', password: DEMO_PASSWORDS.staff, label: 'أحمد سالم — موظف فاليه النخبة', employeeId: 'emp-1' },
  { role: 'staff', username: 'khaled', password: DEMO_PASSWORDS.staff, label: 'خالد يوسف — موظف فاليه النخبة', employeeId: 'emp-2' },
  { role: 'staff', username: 'omar', password: DEMO_PASSWORDS.staff, label: 'عمر ناصر — موظف صفّني', employeeId: 'emp-6' },
] as const;

export const DEMO_DRIVERS = [
  { phone: '0791234501', label: 'سائق — سيارته داخل الموقف وطلب إرجاعها' },
  { phone: '0771112233', label: 'سائق — سيارة مُسلّمة (جرّب التقييم والشكوى)' },
];

export async function isSeeded() {
  const r = await q1<{ n: string }>('select count(*)::text as n from operators');
  return Number(r?.n || 0) > 0;
}

export async function seed(force = false) {
  if (!force && (await isSeeded())) return false;
  await tx(async (c) => {
    if (force) {
      await c.query(`truncate authorities, operators, sites, employees, documents, users, otp_codes, handoffs, visits,
        incidents, alerts, complaints, ratings, payments, invoices restart identity cascade`);
      await c.query(`alter sequence visit_seq restart with 240891; alter sequence handoff_seq restart with 100;
        alter sequence incident_seq restart with 311; alter sequence invoice_seq restart with 1001; alter sequence entity_seq restart with 1000;`);
    }
    // timestamps in SEED are relative to module load; shift so they are relative to "now"
    await c.query(`insert into authorities (id, name, city) values ('auth-amman', 'هيئة تنظيم خدمات الفاليه', 'عمّان')`);
    for (const o of SEED.operators) {
      await c.query(
        `insert into operators (id, name, license_no, status, license_expiry, reject_reason, submitted_at, area, auto_accept, authority_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'auth-amman')`,
        [o.id, o.name, o.licenseNo ?? null, o.status, o.licenseExpiry ?? null, o.rejectReason ?? null, o.submittedAt, o.area, o.autoAcceptHandoffs]
      );
      for (const s of o.sites) {
        await c.query(`insert into sites (id, operator_id, name, area, lat, lng, capacity) values ($1,$2,$3,$4,$5,$6,$7)`, [
          s.id, o.id, s.name, s.area, s.lat, s.lng, s.capacity,
        ]);
      }
      for (const d of o.docs) {
        await c.query(
          `insert into documents (owner_type, owner_id, doc_key, name, status, note, file_name, uploaded_at) values ('operator',$1,$2,$3,$4,$5,$6,$7)`,
          [o.id, d.id, d.name, d.status, d.note ?? null, d.fileName ?? null, d.uploadedAt ?? (d.fileName ? o.submittedAt : null)]
        );
      }
    }
    for (const e of SEED.employees) {
      await c.query(
        `insert into employees (id, operator_id, name, national_id, phone, site_id, active, review_status, reject_reason) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [e.id, e.operatorId, e.name, e.nationalId, e.phone, e.siteId ?? null, e.active, e.reviewStatus, e.rejectReason ?? null]
      );
      for (const d of e.docs) {
        await c.query(
          `insert into documents (owner_type, owner_id, doc_key, name, status, note, file_name, uploaded_at) values ('employee',$1,$2,$3,$4,$5,$6,$7)`,
          [e.id, d.id, d.name, d.status, d.note ?? null, d.fileName ?? null, d.uploadedAt ?? null]
        );
      }
    }
    for (const h of SEED.handoffs) {
      await c.query(
        `insert into handoffs (id, plate, site_id, operator_id, status, created_at, accepted_at, assigned_employee_id, visit_id, owner_phone)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [h.id, h.plate, h.siteId, h.operatorId, h.status, h.createdAt, h.acceptedAt ?? null, h.assignedEmployeeId ?? null, h.visitId ?? null, h.ownerPhone ?? null]
      );
    }
    for (const v of SEED.visits) {
      await c.query(
        `insert into visits (id, receipt_no, plate, operator_id, site_id, check_in_by, check_out_by, check_in_at, check_out_at, notes, handoff_id,
          car_make, car_model, car_color, owner_phone, photo_thumb, parked_at, return_requested_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [v.id, v.receiptNo, v.plate, v.operatorId, v.siteId, v.checkInBy, v.checkOutBy ?? null, v.checkInAt, v.checkOutAt ?? null, v.notes ?? null,
          v.handoffId ?? null, v.carMake ?? null, v.carModel ?? null, v.carColor ?? null, v.ownerPhone ?? null, v.photoThumb ?? null,
          v.parkedAt ?? null, v.returnRequestedAt ?? null]
      );
    }
    for (const i of SEED.incidents) {
      await c.query(
        `insert into incidents (id, type, visit_id, operator_id, description, status, created_at, created_by, plate, lat, lng, area)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [i.id, i.type, i.visitId ?? null, i.operatorId ?? null, i.description, i.status, i.createdAt, i.createdBy, i.plate ?? null, i.lat ?? null, i.lng ?? null, i.area ?? null]
      );
    }

    // Users
    const hash = (p: string) => bcrypt.hashSync(p, 10);
    for (const a of DEMO_ACCOUNTS) {
      const opId = 'operatorId' in a ? a.operatorId : null;
      const empId = 'employeeId' in a ? a.employeeId : null;
      const empOp = empId ? SEED.employees.find((e: { id: string; operatorId: string }) => e.id === empId)?.operatorId ?? null : null;
      const name = a.role === 'gov' ? 'مدير الهيئة' : a.label.split(' — ')[0];
      await c.query(
        `insert into users (role, username, password_hash, name, operator_id, employee_id, authority_id) values ($1,$2,$3,$4,$5,$6,$7)`,
        [a.role, a.username, hash(a.password), name, opId ?? empOp, empId, a.role === 'gov' ? 'auth-amman' : null]
      );
    }
    for (const d of DEMO_DRIVERS) {
      await c.query(`insert into users (role, phone, name) values ('driver',$1,'سائق')`, [d.phone]);
    }

    // Invoices & payments (illustrative amounts, JOD)
    const days = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();
    const inv = async (operatorId: string | null, payer: string | null, kind: string, desc: string, amount: number, status: string, issued: string, paid?: string, incidentId?: string) => {
      const n = await c.query(`select nextval('invoice_seq') as n`);
      const number = `INV-${new Date(issued).getFullYear()}-${n.rows[0].n}`;
      const r = await c.query(
        `insert into invoices (number, operator_id, payer_name, kind, description, amount, status, issued_at, due_at, paid_at, incident_id, payment_ref)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id`,
        [number, operatorId, payer, kind, desc, amount, status, issued, new Date(new Date(issued).getTime() + 30 * 86400_000).toISOString(),
          paid ?? null, incidentId ?? null, paid ? `TEST-${n.rows[0].n}` : null]
      );
      if (paid) {
        await c.query(`insert into payments (invoice_id, ref, amount, status, card_last4, created_at, completed_at) values ($1,$2,$3,'succeeded','4242',$4,$4)`, [
          r.rows[0].id, `TEST-${n.rows[0].n}`, amount, paid,
        ]);
      }
    };
    await inv('op-1', null, 'license_fee', 'رسوم ترخيص سنوية — فاليه النخبة', 500, 'paid', days(60), days(58));
    await inv('op-5', null, 'license_fee', 'رسوم ترخيص سنوية — صفّني', 500, 'paid', days(40), days(39));
    await inv('op-3', null, 'fine', 'مخالفة: تأمين مسؤولية منتهي', 1000, 'unpaid', days(12));
    await inv(null, 'فاليه غير مرخّص — الدوار الثالث', 'fine', 'مخالفة تشغيل فاليه بدون ترخيص + إغلاق', 1500, 'paid', days(1), days(0.5), 'inc-2');
    await inv('op-1', null, 'visit_fee', 'رسوم رقابة على الزيارات — الشهر الماضي', 240.5, 'paid', days(20), days(18));
    await inv('op-5', null, 'visit_fee', 'رسوم رقابة على الزيارات — الشهر الماضي', 96.25, 'unpaid', days(20));
    await inv('op-1', null, 'visit_fee', 'رسوم رقابة على الزيارات — هذا الشهر', 118.75, 'unpaid', days(2));

    // Ratings / complaints
    await c.query(`insert into ratings (driver_phone, visit_id, operator_id, site_id, stars, comment, created_at) values
      ('0784445566','v7','op-1','site-2',5,'خدمة سريعة ومرتبة',now() - interval '2 hours'),
      ('0793332211','v6','op-1','site-1',4,'ممتاز بس تأخروا شوي',now() - interval '1.5 hours'),
      ('0798889900','v10','op-5','site-8',3,null,now() - interval '45 hours')`);
    await c.query(`insert into complaints (driver_phone, visit_id, operator_id, site_id, category, description, status, gov_response, created_at, updated_at) values
      ('0773030303','v12','op-1','site-2','delay','انتظرت 20 دقيقة لتسليم السيارة','investigating','تم التواصل مع المشغّل للتحقق',now() - interval '3 hours',now() - interval '2 hours'),
      ('0798889900','v10','op-5','site-8','damage','خدش جديد على الصدام الخلفي بعد الاستلام','open',null,now() - interval '40 hours',now() - interval '40 hours')`);
  });
  return true;
}
