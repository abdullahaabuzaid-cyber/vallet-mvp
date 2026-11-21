import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
import { useResource } from '@/shared/hooks/useResource';
import { formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { licensedLotsNear, useStore } from '@/store';
import { DEMO_AMMAN_PIN } from '@/shared/constants/demo';
export const BOOKING_STATUS: Record<string, string> = { booked: 'محجوز', arrived: 'وصل', cancelled: 'ملغى', no_show: 'لم يحضر' };
type B = { id: number; siteName: string; venue?: string; plate: string; arriveAt: string; status: string };
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
export default function BookingPage() {
  const auth = useStore((s) => s.driverAuth);
  const ops = useStore((s) => s.operators);
  const lots = licensedLotsNear(DEMO_AMMAN_PIN);
  const { data, reload } = useResource<{ items: B[] }>('/api/bookings/mine', { items: [] });
  const [siteId, setSiteId] = useState(''), [plate, setPlate] = useState(''), [venue, setVenue] = useState(''), [at, setAt] = useState(local(new Date(Date.now() + 2 * 3600_000)));
  if (!auth?.verified) return <div className="phone-shell"><div className="card"><h2>حجز مسبق</h2><p className="muted">سجّل الدخول برقم هاتفك لتحجز.</p><Link to="/driver/auth" className="btn btn-primary">تسجيل الدخول</Link></div></div>;
  async function book(e: React.FormEvent) {
    e.preventDefault();
    try { await api('/api/bookings', { siteId, plate, venue, arriveAt: new Date(at).toISOString() }); await reload(); toast('تم تأكيد الحجز وإبلاغ المشغّل', { tone: 'ok' }); setPlate(''); }
    catch (err) { toast((err as Error).message, { tone: 'bad' }); }
  }
  async function cancel(id: number) { try { await api(`/api/bookings/${id}/status`, { status: 'cancelled' }); await reload(); } catch (err) { toast((err as Error).message, { tone: 'bad' }); } }
  return <div className="phone-shell stack" key={ops.length}>
    <form className="card stack" onSubmit={book}>
      <h2>احجز فاليه لمناسبة أو مطعم</h2>
      <select aria-label="الموقف" value={siteId} onChange={(e) => setSiteId(e.target.value)} required><option value="">اختر الموقف المرخّص</option>{lots.map((l) => <option key={l.siteId} value={l.siteId}>{l.siteName} — {l.operatorName}</option>)}</select>
      <input aria-label="المكان / المناسبة" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="اسم المطعم أو المناسبة (اختياري)" />
      <input aria-label="موعد الوصول" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} required />
      <input aria-label="رقم اللوحة" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="12-34567" required />
      <button className="btn btn-primary" type="submit">تأكيد الحجز</button>
    </form>
    <div className="card"><h3>حجوزاتي</h3>{data.items.length ? data.items.map((b) => <div key={b.id} className="booking-row" data-testid="booking"><div><strong>{b.siteName}</strong>{b.venue && <span className="muted"> · {b.venue}</span>}<div className="muted tiny">{formatDateTime(b.arriveAt)} · {b.plate}</div></div><div className="row"><Badge tone={b.status === 'booked' ? 'info' : b.status === 'arrived' ? 'ok' : 'default'}>{BOOKING_STATUS[b.status]}</Badge>{b.status === 'booked' && <button type="button" className="btn btn-sm" onClick={() => void cancel(b.id)}>إلغاء</button>}</div></div>) : <EmptyState title="لا حجوزات" icon="clock" description="احجز مسبقاً وخلّي الفاليه جاهز لوصولك." />}</div>
  </div>;
}
