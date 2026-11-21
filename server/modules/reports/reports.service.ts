import { q } from '../../db/pool.ts';
import { bad } from '../../utils/http.ts';

export type Range = { from: string; to: string };

export function parseRange(fromRaw?: unknown, toRaw?: unknown): Range {
  const to = toRaw ? new Date(String(toRaw)) : new Date();
  const from = fromRaw ? new Date(String(fromRaw)) : new Date(to.getTime() - 90 * 86400_000);
  if (isNaN(+from) || isNaN(+to)) throw bad('نطاق تاريخ غير صالح');
  // make "to" inclusive of the whole day
  const toEnd = new Date(to);
  if (toRaw && String(toRaw).length <= 10) toEnd.setUTCHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: toEnd.toISOString() };
}

export async function reportData(r: Range) {
  const p = [r.from, r.to];
  const revenueByKind = await q(
    `select kind, status, count(*)::int as n, coalesce(sum(amount),0)::float as total
     from invoices where issued_at between $1 and $2 group by kind, status order by kind, status`, p);
  const monthly = await q(
    `select to_char(date_trunc('month', paid_at), 'YYYY-MM') as month, kind, sum(amount)::float as total
     from invoices where status='paid' and paid_at between $1 and $2 group by 1,2 order by 1`, p);
  const violationsByType = await q(
    `select type, status, count(*)::int as n from incidents where created_at between $1 and $2 group by type, status order by type`, p);
  const fines = await q(
    `select i.number, coalesce(o.name, i.payer_name, '—') as payer, i.description, i.amount::float as amount, i.status, i.issued_at
     from invoices i left join operators o on o.id = i.operator_id where i.kind='fine' and i.issued_at between $1 and $2 order by i.issued_at desc`, p);
  const operators = await q(
    `select o.id, o.name, o.status, o.license_no,
       (select count(*)::int from visits v where v.operator_id=o.id and v.check_in_at between $1 and $2) as visits,
       (select count(*)::int from visits v where v.operator_id=o.id and v.check_out_at between $1 and $2) as delivered,
       (select round(avg(extract(epoch from (v.check_out_at - v.check_in_at))/60)::numeric,0)::float from visits v
          where v.operator_id=o.id and v.check_out_at between $1 and $2) as avg_minutes,
       (select count(*)::int from handoffs h where h.operator_id=o.id and h.created_at between $1 and $2) as handoffs,
       (select count(*)::int from handoffs h where h.operator_id=o.id and h.status='accepted' and h.created_at between $1 and $2) as handoffs_accepted,
       (select round(extract(epoch from avg(h.accepted_at - h.created_at))::numeric/60,1)::float from handoffs h
          where h.operator_id=o.id and h.accepted_at is not null and h.created_at between $1 and $2) as avg_accept_min,
       (select round(avg(stars)::numeric,1)::float from ratings r where r.operator_id=o.id) as rating,
       (select count(*)::int from ratings r where r.operator_id=o.id) as rating_count,
       (select count(*)::int from complaints c where c.operator_id=o.id and c.created_at between $1 and $2) as complaints,
       (select count(*)::int from incidents i where i.operator_id=o.id and i.created_at between $1 and $2) as incidents,
       (select coalesce(sum(amount),0)::float from invoices i where i.operator_id=o.id and i.status='paid' and i.paid_at between $1 and $2) as paid,
       (select coalesce(sum(amount),0)::float from invoices i where i.operator_id=o.id and i.status='unpaid') as outstanding
     from operators o order by o.name`, p);
  const complaints = await q(
    `select status, count(*)::int as n from complaints where created_at between $1 and $2 group by status`, p);

  const sum = (rows: any[], pred: (x: any) => boolean) => rows.filter(pred).reduce((a, x) => a + Number(x.total), 0);
  const totals = {
    collected: sum(revenueByKind, (x) => x.status === 'paid'),
    outstanding: sum(revenueByKind, (x) => x.status === 'unpaid'),
    licenseFees: sum(revenueByKind, (x) => x.kind === 'license_fee' && x.status === 'paid'),
    fines: sum(revenueByKind, (x) => x.kind === 'fine' && x.status === 'paid'),
    visitFees: sum(revenueByKind, (x) => x.kind === 'visit_fee' && x.status === 'paid'),
    violations: violationsByType.reduce((a, x) => a + x.n, 0),
    unlicensed: violationsByType.filter((x) => x.type === 'unlicensed').reduce((a, x) => a + x.n, 0),
    visits: operators.reduce((a, o) => a + o.visits, 0),
    complaints: complaints.reduce((a, x) => a + x.n, 0),
  };
  return { range: r, totals, revenueByKind, monthly, violationsByType, fines, operators, complaints, generatedAt: new Date().toISOString() };
}
