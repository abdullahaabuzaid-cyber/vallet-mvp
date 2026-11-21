import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../config/env.ts';
import { q, q1, nextId } from '../../db/pool.ts';
import { bad, str } from '../../utils/http.ts';
import { type ListParams, orderBy, paged, Where } from '../../utils/listQuery.ts';
import { issueInvoice } from '../payments/invoices.service.ts';
import { publish } from '../realtime/sse.ts';
import type { SessionUser } from '../auth/session.ts';
export async function inspectors() {
  return q(`select id, username, name from users where role='inspector' order by name`);
}
export async function myTasks(u: SessionUser) {
  return q(`select id, note, lat, lng, status, inspection_note, created_at from public_reports where assigned_to=$1 order by (status='assigned') desc, created_at desc limit 100`, [u.username]);
}
export async function verifyTask(u: SessionUser, id: number, note: string) {
  if (note.length < 3) throw bad('اكتب نتيجة المعاينة');
  const r = await q1(`update public_reports set status='verified', inspection_note=$3 where id=$1 and assigned_to=$2 and status='assigned' returning id, status`, [id, u.username, note]);
  if (!r) throw bad('المهمة غير مسندة لك أو مغلقة');
  publish({ gov: true }, { type: 'report_verified', title: 'تحقق المفتش من بلاغ', body: `#${id} — ${note.slice(0, 60)}`, link: '/gov/public-reports' });
  return r;
}
/** On-the-spot fine with photo: creates an incident (fined) + an unpaid invoice. */
export async function issueFieldFine(u: SessionUser, b: any, f?: Express.Multer.File) {
  try {
    if (!f?.mimetype.startsWith('image/')) throw bad('أرفق صورة المخالفة');
    const operatorId = str(b?.operatorId, 40) || null, offender = str(b?.offender, 120), plate = str(b?.plate, 20), note = str(b?.note, 1000);
    const amount = Number(b?.amount || env.fineDefaultJod), lat = b?.lat ? Number(b.lat) : null, lng = b?.lng ? Number(b.lng) : null;
    if (!(amount >= 1 && amount <= 5000)) throw bad('قيمة المخالفة من 1 إلى 5000 د.أ');
    if (!operatorId && !offender) throw bad('حدّد المشغّل المرخّص أو اسم المخالف');
    if (operatorId && !(await q1(`select 1 from operators where id=$1`, [operatorId]))) throw bad('المشغّل غير موجود');
    if (note.length < 5) throw bad('اكتب وصف المخالفة');
    const reportId = b?.reportId ? Number(b.reportId) : null;
    const incId = await nextId('inc-', 'incident_seq');
    await q(`insert into incidents (id,type,operator_id,description,status,created_by,plate,lat,lng,area) values ($1,$2,$3,$4,'fined',$5,$6,$7,$8,$9)`,
      [incId, operatorId ? 'other' : 'unlicensed', operatorId, `مخالفة ميدانية: ${note}`, `مفتش: ${u.name}`, plate || null, lat, lng, str(b?.area, 80) || null]);
    const inv = await issueInvoice(operatorId, operatorId ? null : offender, 'fine', `مخالفة ميدانية — ${note.slice(0, 80)}`, amount, incId);
    const r = await q1(`insert into field_fines(inspector_id,incident_id,invoice_id,operator_id,offender,plate,amount,note,lat,lng,storage_key,mime,report_id)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`, [u.id, incId, inv.id, operatorId, offender || null, plate || null, amount, note, lat, lng, f.filename, f.mimetype, reportId]);
    publish({ gov: true }, { type: 'field_fine', title: 'مخالفة ميدانية جديدة', body: `${amount.toFixed(3)} د.أ — ${offender || operatorId}`, link: '/gov/incidents' });
    return { id: r.id, incidentId: incId, invoiceNumber: inv.number };
  } catch (e) { if (f) fs.rmSync(f.path, { force: true }); throw e; }
}
export async function listFines(u: SessionUser, p: ListParams) {
  const w = new Where();
  if (u.role === 'inspector') w.add('f.inspector_id = ?', u.id);
  if (p.operatorId === 'none') w.add('f.operator_id is null'); else if (p.operatorId) w.add('f.operator_id = ?', p.operatorId);
  w.range('f.created_at', p.from, p.to).search(p.q, ['f.offender', 'f.note', 'u.name', 'i.number'], ['f.plate']);
  const rows = await q(`select f.id, f.offender, f.operator_id, f.plate, f.amount::float amount, f.note, f.created_at, u.name inspector, i.number invoice, i.status invoice_status,
      count(*) over() total_count from field_fines f join users u on u.id=f.inspector_id left join invoices i on i.id=f.invoice_id ${w.sql}
    order by ${orderBy(p.sort, { newest: 'f.created_at desc', oldest: 'f.created_at asc', amount_desc: 'f.amount desc' })} limit ${w.next(p.limit)} offset ${w.next(p.offset)}`, w.params);
  return paged(rows, (r) => r);
}
export async function fineFile(u: SessionUser, id: number) {
  const f = await q1(`select * from field_fines where id=$1`, [id]);
  if (!f || (u.role === 'inspector' && f.inspector_id !== u.id)) throw bad('غير موجود', 404);
  return { path: path.join(env.uploadDir, f.storage_key), mime: f.mime };
}
