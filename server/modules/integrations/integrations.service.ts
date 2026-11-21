import crypto from 'node:crypto';
import { env } from '../../config/env.ts';
import { q1 } from '../../db/pool.ts';
import { bad } from '../../utils/http.ts';
/**
 * Government integrations (vehicle licensing, municipality permits). Config-driven:
 * set VEHICLE_REGISTRY_URL / MUNICIPALITY_API_URL (+ _TOKEN) for live HTTP; otherwise a deterministic STUB answers.
 * Stub data is fake and always labelled `source: 'stub'`.
 */
const cfg = env.integrations;
const seedOf = (s: string) => crypto.createHash('sha1').update(s).digest()[0];
async function live(url: string, token: string, path: string) {
  const r = await fetch(`${url.replace(/\/$/, '')}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw bad(`خدمة الربط أعادت ${r.status}`, 502);
  return { source: 'live', ...(await r.json()) };
}
export function integrationsStatus() {
  return [
    { key: 'vehicle', name: 'ترخيص المركبات (إدارة الترخيص)', mode: cfg.vehicleUrl ? 'live' : 'stub', env: 'VEHICLE_REGISTRY_URL' },
    { key: 'municipality', name: 'أمانة عمّان — تصاريح المواقف', mode: cfg.municipalityUrl ? 'live' : 'stub', env: 'MUNICIPALITY_API_URL' },
  ];
}
export async function vehicleLookup(plateIn: string) {
  const plate = plateIn.replace(/\s/g, '');
  if (!/^\d{1,2}-?\d{3,6}$/.test(plate)) throw bad('صيغة اللوحة غير صحيحة (مثال 12-34567)');
  if (cfg.vehicleUrl) return live(cfg.vehicleUrl, cfg.vehicleToken, `/vehicles/${encodeURIComponent(plate)}`);
  const n = seedOf(plate), makes = ['تويوتا', 'هيونداي', 'كيا', 'مرسيدس', 'نيسان', 'فورد'];
  return { source: 'stub', plate, make: makes[n % makes.length], year: 2012 + (n % 13), registration: n % 7 === 0 ? 'expired' : 'valid', insurance: n % 5 === 0 ? 'expired' : 'valid', note: 'بيانات تجريبية — ليست من سجل الترخيص الحقيقي' };
}
export async function municipalityPermit(siteId: string) {
  const s = await q1(`select s.id, s.name, s.area, o.license_no from sites s join operators o on o.id = s.operator_id where s.id = $1`, [siteId]);
  if (!s) throw bad('الموقف غير موجود', 404);
  if (cfg.municipalityUrl) return live(cfg.municipalityUrl, cfg.municipalityToken, `/permits?site=${encodeURIComponent(siteId)}`);
  const n = seedOf(siteId);
  return { source: 'stub', siteId, site: s.name, permitNo: `AMM-${1000 + n}`, zone: s.area || 'عمّان', status: n % 6 === 0 ? 'expired' : 'valid', note: 'بيانات تجريبية — ليست من أنظمة الأمانة' };
}
