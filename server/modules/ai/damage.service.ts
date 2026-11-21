import path from 'node:path';
import { q, q1 } from '../../db/pool.ts';
import { env } from '../../config/env.ts';
import { bad } from '../../utils/http.ts';
import type { SessionUser } from '../auth/session.ts';
import { visitForUser } from '../visits/visits.service.ts';
import { publish } from '../realtime/sse.ts';
import { DAMAGE_THRESHOLD, damageProvider } from './damage.providers.ts';
const map = (r: any) => r && ({ provider: r.provider, demo: r.demo, score: Number(r.score), flagged: r.flagged, angles: r.angles, createdAt: r.created_at, label: r.demo ? damageProvider().label : r.provider });
export async function getDamage(id: string, u: SessionUser) {
  await visitForUser(id, u);
  return { assessment: map(await q1(`select * from damage_assessments where visit_id=$1`, [id])), threshold: DAMAGE_THRESHOLD };
}
/** Compare pickup vs handoff evidence per angle; stores the latest result and notifies when flagged. */
export async function assessVisit(id: string) {
  const rows = await q(`select stage, angle, storage_key from condition_photos where visit_id=$1`, [id]);
  const by = (s: string) => Object.fromEntries(rows.filter((r) => r.stage === s).map((r) => [r.angle, path.join(env.uploadDir, r.storage_key)]));
  const pick = by('pickup'), hand = by('handoff');
  const pairs = Object.keys(pick).filter((a) => hand[a]).map((angle) => ({ angle, pickup: pick[angle], handoff: hand[angle] }));
  if (pairs.length < 1) return null;
  const provider = damageProvider();
  const angles = await provider.assess(pairs);
  const score = Math.max(...angles.map((a) => a.score)), flagged = score >= DAMAGE_THRESHOLD;
  const r = await q1(`insert into damage_assessments(visit_id,provider,demo,score,flagged,angles) values($1,$2,$3,$4,$5,$6)
    on conflict(visit_id) do update set provider=excluded.provider, demo=excluded.demo, score=excluded.score, flagged=excluded.flagged, angles=excluded.angles, created_at=now() returning *`,
    [id, provider.name, provider.demo, score, flagged, JSON.stringify(angles)]);
  if (flagged) {
    const v = await q1(`select operator_id, owner_phone, plate from visits where id=$1`, [id]);
    publish({ operatorId: v.operator_id, gov: true, driverPhone: v.owner_phone }, { type: 'damage_flag', title: 'احتمال ضرر — تحقق تجريبي', body: `${v.plate}: فرق ملحوظ بين صور الاستلام والتسليم` });
  }
  return map(r);
}
export async function runDamage(id: string, u: SessionUser) {
  await visitForUser(id, u);
  const r = await assessVisit(id);
  if (!r) throw bad('يلزم صورة واحدة على الأقل لنفس الزاوية عند الاستلام والتسليم');
  return { assessment: r, threshold: DAMAGE_THRESHOLD };
}
