import zlib from 'node:zlib';
import { shots } from './shots.mjs';
/** Noisy RGB PNG — stands in for a handoff photo that differs from the pickup photo. */
function noisePng(size = 80) {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((size * 3 + 1) * size); for (let i = 0; i < raw.length; i++) raw[i] = i % (size * 3 + 1) === 0 ? 0 : Math.floor(Math.random() * 256);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
/** Phase 5: demo damage comparison, demand forecast + staffing, fraud rules, driver FAQ assistant. */
export async function phase5({ call, check, gov, op, staff, B, file, browser, prefix }) {
  const other = { name: 'handoff.png', mimeType: 'image/png', buffer: noisePng() };
  const mk = async (extra = {}) => (await call(staff, '/visits/checkin', { plate: '77-' + String(Date.now()).slice(-5), ...extra })).visit;
  const up = (v, stage, angle, f) => staff.request.post(B + `/api/visits/${v.id}/condition`, { multipart: { stage, angle, file: f } });
  const changed = await mk(), same = await mk();
  for (const angle of ['front', 'back', 'left', 'right']) {
    await up(changed, 'pickup', angle, file); await up(changed, 'handoff', angle, angle === 'front' ? other : file);
    await up(same, 'pickup', angle, file); await up(same, 'handoff', angle, file);
  }
  const d1 = (await call(op, `/visits/${changed.id}/damage`)).assessment, d2 = (await call(op, `/visits/${same.id}/damage`)).assessment;
  check('damage comparison runs automatically after handoff photos', !!d1 && !!d2 && d1.angles.length === 4);
  check('changed angle flagged, identical evidence not flagged', d1.flagged && d1.angles.find((a) => a.angle === 'front').score >= 0.35 && !d2.flagged);
  check('damage provider clearly labelled demo', d1.demo === true && d1.provider === 'heuristic' && /تجريبي/.test(d1.label));
  check('manual re-run by gov', (await call(gov, `/visits/${changed.id}/damage`, {})).assessment.flagged);
  const fc = await call(op, '/ai/forecast');
  check('24h demand forecast + staffing suggestion', fc.hours.length === 24 && fc.hours.every((h) => h.expected >= 0 && h.staff >= 1) && !!fc.method && ['sparse', 'ok'].includes(fc.dataQuality));
  check('forecast per site', (await call(op, '/ai/forecast?siteId=site-1')).hours.length === 24);
  check('forecast is not public', (await (await browser.newContext()).request.get(B + '/api/ai/forecast')).status() === 401);
  const ocr = await mk({ ocrPlate: '11-99999' });
  await call(staff, `/visits/${ocr.id}/checkout`, {});
  await call(staff, `/visits/${changed.id}/checkout`, {}); await call(staff, `/visits/${same.id}/checkout`, {});
  const fraud = (await call(op, '/ai/fraud')).items;
  check('OCR mismatch signal', fraud.some((s) => s.id === `fraud-ocr-${ocr.id}` && s.kind === 'fraud_ocr'));
  check('suspicious short duration signal', fraud.some((s) => s.id === `fraud-short-${ocr.id}`));
  check('damage flag surfaced as risk signal', fraud.some((s) => s.id === `damage-${changed.id}`));
  check('fraud list server filter by kind', (await call(op, '/ai/fraud?kind=fraud_ocr')).items.every((s) => s.kind === 'fraud_ocr'));
  const outsider = await browser.newContext(); await call(outsider, '/auth/login', { username: 'saffni', password: 'Operator@2026' });
  check('fraud signals operator-scoped', !(await call(outsider, '/ai/fraud')).items.some((s) => s.id === `fraud-ocr-${ocr.id}`));
  const gs = await call(gov, '/state');
  check('fraud rules become gov smart alerts', gs.alerts.some((a) => a.id === `fraud-ocr-${ocr.id}`) && gs.alerts.some((a) => a.id === `damage-${changed.id}`));
  const st = await call(op, '/ai/status');
  check('AI status declares providers', st.damage.demo === true && st.assistant.provider === 'faq');
  const anon = await browser.newContext();
  const a1 = await call(anon, '/assistant', { message: 'كيف أطلب سيارتي؟' });
  check('assistant answers request-car FAQ', a1.links.some((l) => l.to === '/driver/status') && a1.provider === 'faq');
  check('assistant damage FAQ', /أعترض/.test((await call(anon, '/assistant', { message: 'لاحظت خدش' })).reply));
  check('assistant fallback', /أستطيع المساعدة/.test((await call(anon, '/assistant', { message: 'xyz' })).reply));
  check('assistant rejects empty', (await anon.request.post(B + '/api/assistant', { data: { message: '' } })).status() === 400);
  await shots(browser, B, prefix, check, [
    { c: op, path: '/operator/insights', name: 'operator-insights' },
    { c: gov, path: '/gov/alerts', name: 'gov-fraud-alerts' },
    { c: staff, path: `/staff/condition?visit=${changed.id}`, name: 'staff-damage-check', mobile: true },
  ]);
  const p = await anon.newPage(); await p.setViewportSize({ width: 412, height: 915 });
  await p.goto(B + '/driver'); await p.getByRole('button', { name: 'مساعد السائق' }).click();
  await p.getByRole('button', { name: 'كيف أطلب سيارتي؟' }).click(); await p.getByText('أنا على بعد 5 دقائق').waitFor();
  await p.screenshot({ path: `shots/${prefix}-driver-help-chat.png` });
  check('driver chat widget answers in UI', await p.getByTestId('help-chat').isVisible());
  await p.close(); await outsider.close(); await anon.close();
}
