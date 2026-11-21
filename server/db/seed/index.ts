import bcrypt from 'bcryptjs';
import { q1, tx } from '../pool.ts';
import { DEMO_ACCOUNTS, DEMO_DRIVERS } from './demoAccounts.ts';
import { DEMO_DATA } from './demoData.ts';
import { seedBillingAndFeedback } from './billing.ts';
import { EXPANSION_TABLES } from '../expansion.ts';

export async function isSeeded() {
  const r = await q1<{ n: string }>('select count(*)::text as n from operators');
  return Number(r?.n || 0) > 0;
}

export async function seed(force = false) {
  if (!force && (await isSeeded())) return false;
  await tx(async (c) => {
    if (force) {
      await c.query(`truncate authorities, operators, sites, employees, documents, users, otp_codes, handoffs, visits,
        incidents, alerts, complaints, ratings, payments, invoices, ${EXPANSION_TABLES} restart identity cascade`);
      await c.query(`alter sequence visit_seq restart with 240891; alter sequence handoff_seq restart with 100;
        alter sequence incident_seq restart with 311; alter sequence invoice_seq restart with 1001; alter sequence entity_seq restart with 1000;`);
    }
    // DEMO_DATA timestamps are relative to server boot
    await c.query(`insert into authorities (id, name, city) values ('auth-amman', 'هيئة تنظيم خدمات الفاليه', 'عمّان')`);
    for (const o of DEMO_DATA.operators) {
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
    for (const e of DEMO_DATA.employees) {
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
    for (const h of DEMO_DATA.handoffs) {
      await c.query(
        `insert into handoffs (id, plate, site_id, operator_id, status, created_at, accepted_at, assigned_employee_id, visit_id, owner_phone)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [h.id, h.plate, h.siteId, h.operatorId, h.status, h.createdAt, h.acceptedAt ?? null, h.assignedEmployeeId ?? null, h.visitId ?? null, h.ownerPhone ?? null]
      );
    }
    for (const v of DEMO_DATA.visits) {
      await c.query(
        `insert into visits (id, receipt_no, plate, operator_id, site_id, check_in_by, check_out_by, check_in_at, check_out_at, notes, handoff_id,
          car_make, car_model, car_color, owner_phone, photo_thumb, parked_at, return_requested_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [v.id, v.receiptNo, v.plate, v.operatorId, v.siteId, v.checkInBy, v.checkOutBy ?? null, v.checkInAt, v.checkOutAt ?? null, v.notes ?? null,
          v.handoffId ?? null, v.carMake ?? null, v.carModel ?? null, v.carColor ?? null, v.ownerPhone ?? null, v.photoThumb ?? null,
          v.parkedAt ?? null, v.returnRequestedAt ?? null]
      );
    }
    for (const i of DEMO_DATA.incidents) {
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
      const empOp = empId ? DEMO_DATA.employees.find((e: { id: string; operatorId: string }) => e.id === empId)?.operatorId ?? null : null;
      const name = a.role === 'gov' ? 'مدير الهيئة' : a.label.split(' — ')[0];
      await c.query(
        `insert into users (role, username, password_hash, name, operator_id, employee_id, authority_id) values ($1,$2,$3,$4,$5,$6,$7)`,
        [a.role, a.username, hash(a.password), name, opId ?? empOp, empId, a.role === 'gov' ? 'auth-amman' : null]
      );
    }
    for (const d of DEMO_DRIVERS) {
      await c.query(`insert into users (role, phone, name) values ('driver',$1,'سائق')`, [d.phone]);
    }

    await seedBillingAndFeedback(c);
  });
  return true;
}
