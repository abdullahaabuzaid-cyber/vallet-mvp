import { pool } from './pool.ts';

/** Idempotent schema: safe to run on every boot (create if not exists / add column if not exists). */
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
