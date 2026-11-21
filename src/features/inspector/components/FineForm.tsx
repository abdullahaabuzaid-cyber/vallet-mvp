import { useState } from 'react';
import { api, apiForm } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
import { refresh, useStore } from '@/store';
/** On-the-spot fine: photo + GPS + plate (vehicle stub lookup) + licensed operator or unlicensed offender. */
export function FineForm({ reportId, onDone }: { reportId?: number; onDone: () => void }) {
  const operators = useStore((s) => s.operators);
  const [f, setF] = useState({ operatorId: '', offender: '', plate: '', amount: '1000', note: '' });
  const [file, setFile] = useState<File>(), [gps, setGps] = useState<{ lat: number; lng: number } | null>(null), [vehicle, setVehicle] = useState(''), [busy, setBusy] = useState(false);
  const locate = () => navigator.geolocation.getCurrentPosition((p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }), () => toast('تعذّر تحديد الموقع', { tone: 'bad' }));
  async function lookup() { try { const v = await api(`/api/integrations/vehicle?plate=${encodeURIComponent(f.plate)}`); setVehicle(`${v.make} ${v.year} · ترخيص ${v.registration === 'valid' ? 'ساري' : 'منتهي'}${v.source === 'stub' ? ' (تجريبي)' : ''}`); } catch (e) { setVehicle((e as Error).message); } }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!file) return; setBusy(true);
    const fd = new FormData(); fd.set('file', file); Object.entries(f).forEach(([k, v]) => fd.set(k, v));
    if (gps) { fd.set('lat', String(gps.lat)); fd.set('lng', String(gps.lng)); }
    if (reportId) fd.set('reportId', String(reportId));
    try { const r = await apiForm('/api/inspector/fines', fd); toast(`صدرت المخالفة ${r.invoiceNumber}`, { tone: 'ok' }); setF({ ...f, note: '', plate: '' }); setFile(undefined); await refresh(); onDone(); }
    catch (err) { toast((err as Error).message, { tone: 'bad' }); } finally { setBusy(false); }
  }
  return <form className="card stack" onSubmit={submit} data-testid="fine-form">
    <h3>مخالفة فورية</h3>
    <div className="field"><label>صورة المخالفة</label><input type="file" accept="image/*" capture="environment" required onChange={(e) => setFile(e.target.files?.[0])} /></div>
    <button type="button" className="btn" onClick={locate}>{gps ? `📍 ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : 'تحديد موقعي GPS'}</button>
    <div className="field"><label>المشغّل</label><select value={f.operatorId} onChange={(e) => setF({ ...f, operatorId: e.target.value })}><option value="">فاليه غير مرخّص</option>{operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
    {!f.operatorId && <div className="field"><label>اسم/وصف المخالف</label><input value={f.offender} onChange={(e) => setF({ ...f, offender: e.target.value })} placeholder="فاليه غير مرخّص — شارع الوكالات" required /></div>}
    <div className="field"><label>لوحة مركبة (اختياري)</label><div className="row"><input value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} placeholder="12-34567" dir="ltr" style={{ flex: 1 }} /><button type="button" className="btn btn-sm" disabled={!f.plate} onClick={() => void lookup()}>استعلام</button></div>{vehicle && <small className="muted">{vehicle}</small>}</div>
    <div className="grid-2"><div className="field"><label>المبلغ (د.أ)</label><input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div><div /></div>
    <div className="field"><label>وصف المخالفة</label><textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} required minLength={5} placeholder="تشغيل فاليه بدون ترخيص واستخدام الرصيف" /></div>
    <button className="btn btn-primary btn-big" type="submit" disabled={busy || !file}>إصدار المخالفة</button>
  </form>;
}
