import fs from 'node:fs';
import { env } from '../../config/env.ts';
/** One angle pair: the same angle at pickup and at handoff. */
export type PhotoPair = { angle: string; pickup: string; handoff: string };
export type AngleScore = { angle: string; score: number; note: string };
export interface DamageProvider { name: string; demo: boolean; label: string; assess(pairs: PhotoPair[]): Promise<AngleScore[]> }

function fingerprint(file: string) {
  const buf = fs.readFileSync(file), hist = new Array(32).fill(0);
  const start = Math.min(buf.length - 1, 512), step = Math.max(1, Math.floor((buf.length - start) / 20000));
  let n = 0;
  for (let i = start; i < buf.length; i += step) { hist[buf[i] >> 3]++; n++; }
  return { size: buf.length, hist: hist.map((h) => h / Math.max(1, n)) };
}
/**
 * DEMO provider — no computer vision. Compares a cheap file fingerprint (size + sampled byte histogram)
 * of the pickup vs handoff photo for each angle. Big differences usually mean a different scene/framing,
 * which is worth a human look. It cannot see scratches; it only flags pairs for review.
 */
export const heuristicProvider: DamageProvider = {
  name: 'heuristic', demo: true, label: 'تجريبي — مقارنة بصمة الصور (ليس رؤية حاسوبية)',
  async assess(pairs) {
    return pairs.map((p) => {
      const a = fingerprint(p.pickup), b = fingerprint(p.handoff);
      const sizeTerm = Math.min(1, Math.abs(Math.log(b.size / a.size)) / 1.5);
      const histTerm = Math.min(1, a.hist.reduce((s, x, i) => s + Math.abs(x - b.hist[i]), 0) / 2 * 3);
      const score = Math.round((0.6 * sizeTerm + 0.4 * histTerm) * 1000) / 1000;
      return { angle: p.angle, score, note: score >= 0.35 ? 'اختلاف كبير بين صورتي الاستلام والتسليم — راجع يدوياً' : 'لا اختلاف لافت' };
    });
  },
};
/** Pluggable: a real vision provider (AI_VISION_PROVIDER + AI_VISION_KEY) would be registered here. None is configured. */
const providers: Record<string, DamageProvider> = { heuristic: heuristicProvider };
export function damageProvider(): DamageProvider {
  const p = providers[env.ai.visionProvider];
  return p && (!p.demo ? !!env.ai.visionKey : true) ? p : heuristicProvider;
}
export const DAMAGE_THRESHOLD = 0.35;
