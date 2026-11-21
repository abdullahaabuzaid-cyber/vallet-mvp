import { useState } from 'react';
import { api } from '@/shared/lib/api';
import { useResource } from '@/shared/hooks/useResource';
import { useStore } from '@/store';
type Status = { key: string; name: string; mode: 'stub' | 'live'; env: string };
/** Gov integrations: live/stub status + test lookups (vehicle licensing, municipality permits). */
export default function IntegrationsPage() {
  const { data } = useResource<{ items: Status[] }>('/api/integrations/status', { items: [] });
  const sites = useStore((s) => s.operators.flatMap((o) => o.sites));
  const [plate, setPlate] = useState('12-34567'), [siteId, setSiteId] = useState('');
  const [vehicle, setVehicle] = useState<any>(null), [permit, setPermit] = useState<any>(null), [err, setErr] = useState('');
  const run = async (fn: () => Promise<any>, set: (v: any) => void) => { setErr(''); try { set(await fn()); } catch (e) { setErr((e as Error).message); } };
  const Badge = ({ src }: { src: string }) => src === 'live' ? <span className="live-badge">مباشر</span> : <span className="stub-badge">STUB · بيانات تجريبية</span>;
  return <>
    <div className="integration-grid">{data.items.map((i) => <div key={i.key} className="card stack" data-testid="integration"><div className="row" style={{ justifyContent: 'space-between' }}><strong>{i.name}</strong><Badge src={i.mode} /></div>
      <p className="muted tiny">{i.mode === 'stub' ? `يعمل بمزوّد تجريبي. للربط الحقيقي اضبط ${i.env} و ${i.env.replace('_URL', '_TOKEN')} عند توفر واجهة رسمية.` : 'متصل بالخدمة الرسمية.'}</p></div>)}</div>
    {err && <p role="alert">{err}</p>}
    <div className="grid-2">
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); void run(() => api(`/api/integrations/vehicle?plate=${encodeURIComponent(plate)}`), setVehicle); }}>
        <h3>استعلام مركبة</h3><input aria-label="رقم اللوحة" value={plate} onChange={(e) => setPlate(e.target.value)} dir="ltr" /><button className="btn btn-primary" type="submit">استعلام</button>
        {vehicle && <div className="lookup-result" data-testid="vehicle-result"><Badge src={vehicle.source} /><div>{vehicle.make} · {vehicle.year}</div><div>الترخيص: {vehicle.registration === 'valid' ? 'ساري' : 'منتهي'} · التأمين: {vehicle.insurance === 'valid' ? 'ساري' : 'منتهي'}</div><small className="muted">{vehicle.note}</small></div>}
      </form>
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); void run(() => api(`/api/integrations/municipality?siteId=${siteId}`), setPermit); }}>
        <h3>تصريح الأمانة لموقف</h3><select aria-label="الموقف" value={siteId} onChange={(e) => setSiteId(e.target.value)} required><option value="">اختر</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button className="btn btn-primary" type="submit">تحقق</button>
        {permit && <div className="lookup-result"><Badge src={permit.source} /><div>{permit.site} · {permit.permitNo}</div><div>الحالة: {permit.status === 'valid' ? 'ساري' : 'منتهي'} · {permit.zone}</div><small className="muted">{permit.note}</small></div>}
      </form>
    </div>
  </>;
}
