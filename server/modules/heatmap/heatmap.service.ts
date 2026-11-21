import { q } from '../../db/pool.ts';
type Cell = { lat: number; lng: number; weight: number };
/** Grid (~300m) heat cells for demand (visits + bookings) or violations (incidents, public reports, complaints). */
export async function heatmap(layer: string, from?: Date, to?: Date) {
  const f = from ?? new Date(Date.now() - 90 * 86400_000), t = to ?? new Date(Date.now() + 60_000);
  const sql = layer === 'violations'
    ? `select lat, lng from incidents where lat is not null and created_at >= $1 and created_at < $2
       union all select lat, lng from public_reports where created_at >= $1 and created_at < $2
       union all select s.lat, s.lng from complaints c join sites s on s.id=c.site_id where c.created_at >= $1 and c.created_at < $2`
    : `select s.lat, s.lng from visits v join sites s on s.id=v.site_id where v.check_in_at >= $1 and v.check_in_at < $2
       union all select s.lat, s.lng from bookings b join sites s on s.id=b.site_id where b.created_at >= $1 and b.created_at < $2`;
  const rows = await q(`select round(lat::numeric, 3)::float lat, round(lng::numeric, 3)::float lng, count(*)::int weight from (${sql}) x group by 1, 2 order by 3 desc limit 500`, [f, t]);
  const max = Math.max(1, ...rows.map((r: Cell) => r.weight));
  return { layer: layer === 'violations' ? 'violations' : 'demand', max, cells: rows as Cell[] };
}
