import { useResource } from '@/shared/hooks/useResource';
type Lot = { siteId: string; name: string; capacity: number; occupied: number; pct: number; full: boolean; bookingsDue: number };
/** Live lot occupancy (refreshes with every realtime event). */
export function CapacityBoard({ title = 'سعة المواقف الآن' }: { title?: string }) {
  const { data } = useResource<{ items: Lot[] }>('/api/capacity', { items: [] });
  return <div className="card" data-testid="capacity-board">
    <div className="section-head"><div><h3>{title}</h3><p>عدّاد مباشر للسيارات داخل كل موقف مقابل السعة، مع الحجوزات القادمة خلال ساعة.</p></div></div>
    <div className="capacity-grid">{data.items.map((l) => <div key={l.siteId} className={`capacity-tile ${l.full ? 'is-full' : l.pct >= 90 ? 'is-near' : ''}`}>
      <div className="row" style={{ justifyContent: 'space-between' }}><strong>{l.name}</strong>{l.full ? <span className="badge badge-bad">ممتلئ</span> : l.pct >= 90 ? <span className="badge badge-warn">شبه ممتلئ</span> : null}</div>
      <div className="capacity-count"><b>{l.occupied}</b> / {l.capacity}</div>
      <div className="bar-track"><span className="bar-fill" style={{ width: `${Math.min(100, l.pct)}%` }} /></div>
      <small className="muted">{l.pct}% · حجوزات خلال ساعة: {l.bookingsDue}</small>
    </div>)}</div>
  </div>;
}
