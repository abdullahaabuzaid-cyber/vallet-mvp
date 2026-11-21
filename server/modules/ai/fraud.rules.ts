import { q } from '../../db/pool.ts';
export type Signal = { id: string; kind: string; severity: string; title: string; detail: string; operatorId: string | null; visitId?: string | null };
const norm = (p: string) => (p || '').replace(/[^0-9A-Za-z\u0660-\u0669]/g, '').replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x660));
/** Rule-based fraud/anomaly signals. Deterministic and explainable; each rule says why it fired. */
export async function fraudSignals(operatorId?: string | null): Promise<Signal[]> {
  const op = operatorId || null, out: Signal[] = [];
  const short = await q(`select id, plate, operator_id, round(extract(epoch from check_out_at-check_in_at)/60)::int m from visits
    where check_out_at is not null and check_out_at > now() - interval '7 days' and check_out_at - check_in_at < interval '3 minutes' and ($1::text is null or operator_id=$1)`, [op]);
  for (const v of short) out.push({ id: `fraud-short-${v.id}`, kind: 'fraud_short', severity: 'medium', title: 'مدة زيارة قصيرة بشكل مريب', detail: `${v.plate}: ${v.m} دقيقة بين الدخول والخروج (أقل من 3 دقائق)`, operatorId: v.operator_id, visitId: v.id });
  const long = await q(`select id, plate, operator_id, round(extract(epoch from check_out_at-check_in_at)/3600)::int h from visits
    where check_out_at is not null and check_out_at > now() - interval '7 days' and check_out_at - check_in_at > interval '18 hours' and ($1::text is null or operator_id=$1)`, [op]);
  for (const v of long) out.push({ id: `fraud-long-${v.id}`, kind: 'fraud_long', severity: 'low', title: 'مدة زيارة طويلة جداً', detail: `${v.plate}: ${v.h} ساعة — تحقق من الرسوم والتسجيل`, operatorId: v.operator_id, visitId: v.id });
  const orphan = await q(`select h.id, h.plate, h.operator_id from handoffs h left join visits v on v.id=h.visit_id
    where h.status='accepted' and v.id is null and h.accepted_at > now() - interval '7 days' and ($1::text is null or h.operator_id=$1)`, [op]);
  for (const h of orphan) out.push({ id: `fraud-orphan-${h.id}`, kind: 'fraud_unlogged', severity: 'high', title: 'تسليم مقبول بدون زيارة مسجّلة', detail: `${h.plate}: طلب ${h.id} قُبل دون إيصال زيارة`, operatorId: h.operator_id });
  const offShift = await q(`select v.id, v.plate, v.operator_id, e.name from visits v join employees e on e.id=v.check_in_by
    where v.check_in_at > now() - interval '48 hours' and ($1::text is null or v.operator_id=$1)
      and exists (select 1 from shifts s where s.employee_id=v.check_in_by)
      and not exists (select 1 from shifts s where s.employee_id=v.check_in_by and v.check_in_at between s.starts_at - interval '15 minutes' and s.ends_at + interval '15 minutes')`, [op]);
  for (const v of offShift) out.push({ id: `fraud-shift-${v.id}`, kind: 'fraud_unlogged', severity: 'medium', title: 'استلام خارج الوردية', detail: `${v.plate}: سجّلها ${v.name} خارج ورديته المجدولة`, operatorId: v.operator_id, visitId: v.id });
  const ocr = await q(`select id, plate, ocr_plate, operator_id from visits where ocr_plate is not null and check_in_at > now() - interval '7 days' and ($1::text is null or operator_id=$1)`, [op]);
  for (const v of ocr.filter((x) => norm(x.ocr_plate) !== norm(x.plate)))
    out.push({ id: `fraud-ocr-${v.id}`, kind: 'fraud_ocr', severity: 'high', title: 'عدم تطابق قراءة اللوحة', detail: `قرأت الكاميرا ${v.ocr_plate} لكن سُجّلت ${v.plate}`, operatorId: v.operator_id, visitId: v.id });
  const dmg = await q(`select d.visit_id, d.score, v.plate, v.operator_id from damage_assessments d join visits v on v.id=d.visit_id where d.flagged and d.created_at > now() - interval '7 days' and ($1::text is null or v.operator_id=$1)`, [op]);
  for (const d of dmg) out.push({ id: `damage-${d.visit_id}`, kind: 'damage_flag', severity: 'medium', title: 'احتمال ضرر (فحص تجريبي)', detail: `${d.plate}: درجة الاختلاف ${Number(d.score).toFixed(2)} بين صور الاستلام والتسليم`, operatorId: d.operator_id, visitId: d.visit_id });
  return out;
}
