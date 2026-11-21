import { q } from '../../db/pool.ts';
import { fraudSignals } from '../ai/fraud.rules.ts';

/** Compute smart alerts from live data and persist them (status survives recompute). */
export async function refreshAlerts() {
  const found: { id: string; kind: string; severity: string; title: string; detail: string }[] = [];
  const open = await q(`select id, plate, receipt_no, check_in_at from visits where check_out_at is null and check_in_at < now() - interval '4 hours'`);
  for (const v of open) {
    const hours = Math.round((Date.now() - new Date(v.check_in_at).getTime()) / 3600_000);
    found.push({ id: `overstay-${v.id}`, kind: 'overstay', severity: hours >= 8 ? 'high' : 'medium', title: 'تجاوز مدة الوقوف', detail: `اللوحة ${v.plate} (${v.receipt_no}) منذ ${hours} ساعة بدون خروج` });
  }
  const exits = await q(`select id, plate from visits where check_out_at is not null and handoff_id is null and check_out_at > now() - interval '48 hours'`);
  for (const v of exits) {
    found.push({ id: `exit-${v.id}`, kind: 'exit_no_request', severity: 'medium', title: 'خروج بدون طلب مالك عبر التطبيق', detail: `اللوحة ${v.plate} خرجت عبر الموظف دون طلب تسليم مرتبط من السائق` });
  }
  const clusters = await q(`select round(lat::numeric,2) as la, round(lng::numeric,2) as ln, count(*)::int as n, min(area) as area
    from incidents where type='unlicensed' and lat is not null and lng is not null group by 1,2 having count(*) >= 2`);
  for (const c of clusters) {
    found.push({ id: `cluster-${c.la},${c.ln}`, kind: 'unlicensed_cluster', severity: 'high', title: 'تجمّع بلاغات فاليه غير مرخّص', detail: `${c.n} بلاغات قريبة في ${c.area || 'عمّان'}` });
  }
  const openComplaints = await q(`select operator_id, count(*)::int as n from complaints where status in ('open','investigating') and operator_id is not null group by 1 having count(*) >= 2`);
  for (const c of openComplaints) {
    found.push({ id: `complaints-${c.operator_id}`, kind: 'complaints', severity: 'medium', title: 'تكرار شكاوى على مشغّل', detail: `${c.n} شكاوى مفتوحة على المشغّل ${c.operator_id}` });
  }
  const full = await q(`select s.id, s.name, s.capacity, count(v.id)::int n from sites s join visits v on v.site_id=s.id and v.check_out_at is null group by s.id having count(v.id) >= s.capacity`);
  for (const s of full) {
    found.push({ id: `full-${s.id}`, kind: 'lot_full', severity: 'medium', title: 'موقف ممتلئ', detail: `${s.name}: ${s.n}/${s.capacity} سيارة` });
  }
  for (const s of await fraudSignals()) found.push({ id: s.id, kind: s.kind, severity: s.severity, title: s.title, detail: s.detail });
  for (const a of found) {
    await q(
      `insert into alerts (id, kind, severity, title, detail) values ($1,$2,$3,$4,$5)
       on conflict (id) do update set severity = excluded.severity, detail = excluded.detail, last_seen = now()`,
      [a.id, a.kind, a.severity, a.title, a.detail]
    );
  }
  const ids = found.map((a) => a.id);
  await q(`update alerts set status = 'resolved' where status = 'open' and not (id = any($1))`, [ids]);
}
