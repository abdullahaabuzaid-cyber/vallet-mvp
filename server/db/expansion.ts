import { pool } from './pool.ts';
/** Additive VAL-3 migrations only: never truncate or replace existing rows. */
export const EXPANSION_TABLES = 'condition_photos, condition_reviews, public_reports';
export async function migrateExpansion() {
  await pool.query(`
    alter table visits add column if not exists arrival_eta timestamptz;
    alter table visits add column if not exists preparing_at timestamptz;
    alter table visits add column if not exists condition_status text;
    create table if not exists condition_photos (
      id serial primary key, visit_id text not null references visits(id) on delete cascade,
      stage text not null check(stage in ('pickup','handoff')), angle text not null,
      storage_key text not null, mime text not null, size int not null, created_by int,
      captured_at timestamptz not null default now(), unique(visit_id,stage,angle)
    );
    create table if not exists condition_reviews (
      id serial primary key, visit_id text unique references visits(id) on delete cascade,
      user_id int, decision text not null, note text, complaint_id int, created_at timestamptz default now()
    );
    create table if not exists public_reports (
      id serial primary key, note text not null, lat double precision not null, lng double precision not null,
      storage_key text not null, mime text not null, status text not null default 'new',
      assigned_to text, inspection_note text, invoice_id int, closed_at timestamptz,
      created_at timestamptz default now(), reporter_id int
    );
  `);
}
