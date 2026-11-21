import { q, q1 } from '../../db/pool.ts';
import { bad, str } from '../../utils/http.ts';
import { ammanParts } from '../../utils/amman.ts';
import type { SessionUser } from '../auth/session.ts';
const map = (r: any) => ({ id: r.id, siteId: r.site_id, name: r.name, days: r.days, startHour: r.start_hour, endHour: r.end_hour, fee: Number(r.fee), active: r.active });
const inWindow = (h: number, s: number, e: number) => (s <= e ? h >= s && h < e : h >= s || h < e);
/** Price for a lot at a time: site-specific rules beat operator-wide ones; then the highest fee wins. */
export async function quote(siteId: string, at = new Date()) {
  const site = await q1(`select operator_id from sites where id=$1`, [siteId]);
  if (!site) throw bad('الموقف غير موجود', 404);
  const { weekday, hour } = ammanParts(at);
  const rules = (await q(`select * from pricing_rules where operator_id=$1 and active and (site_id is null or site_id=$2)`, [site.operator_id, siteId]))
    .filter((r) => r.days.includes(String(weekday)) && inWindow(hour, r.start_hour, r.end_hour))
    .sort((a, b) => Number(!!b.site_id) - Number(!!a.site_id) || Number(b.fee) - Number(a.fee));
  return rules[0] ? { fee: Number(rules[0].fee), rule: rules[0].name } : { fee: null, rule: null };
}
export async function listRules(u: SessionUser) {
  return (await q(`select * from pricing_rules where operator_id=$1 order by site_id nulls first, start_hour`, [u.operatorId])).map(map);
}
export async function createRule(u: SessionUser, b: any) {
  const name = str(b?.name, 60), siteId = str(b?.siteId, 40) || null, days = [...new Set(str(b?.days, 7).replace(/[^0-6]/g, ''))].sort().join('');
  const s = Number(b?.startHour), e = Number(b?.endHour), fee = Number(b?.fee);
  if (!name || !days) throw bad('أدخل اسم القاعدة والأيام');
  if (![s, e].every((x) => Number.isInteger(x) && x >= 0 && x <= 24) || s === e) throw bad('ساعات غير صالحة');
  if (!(fee >= 0 && fee <= 100)) throw bad('السعر من 0 إلى 100 د.أ');
  if (siteId && !(await q1(`select 1 from sites where id=$1 and operator_id=$2`, [siteId, u.operatorId]))) throw bad('الموقف غير تابع لك', 403);
  return map(await q1(`insert into pricing_rules(operator_id,site_id,name,days,start_hour,end_hour,fee) values($1,$2,$3,$4,$5,$6,$7) returning *`, [u.operatorId, siteId, name, days, s, e, fee]));
}
export async function setRule(u: SessionUser, id: number, active: boolean | 'delete') {
  const r = active === 'delete'
    ? await q1(`delete from pricing_rules where id=$1 and operator_id=$2 returning *`, [id, u.operatorId])
    : await q1(`update pricing_rules set active=$3 where id=$1 and operator_id=$2 returning *`, [id, u.operatorId, active]);
  if (!r) throw bad('القاعدة غير موجودة', 404);
  return map(r);
}
