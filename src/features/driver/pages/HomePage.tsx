import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LotsMap } from '@/shared/components/map/LotsMap';
import { Badge } from '@/shared/components/ui/Badge';
import { createHandoff, licensedLotsNear, useStore } from '@/store';
import { HandoffSheet } from '../components/HandoffSheet';
import { HandoffStatusCard } from '../components/HandoffStatusCard';
import { LotList } from '../components/LotList';
import { useGeolocation } from '../hooks/useGeolocation';

export default function HomePage() {
  const handoffs = useStore((s) => s.handoffs);
  const driverAuth = useStore((s) => s.driverAuth);
  const geo = useGeolocation();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [plate, setPlate] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const lots = useMemo(() => {
    if (geo.status === 'loading') return [];
    return licensedLotsNear({ lat: geo.lat, lng: geo.lng });
  }, [geo]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return lots;
    return lots.filter(
      (l) =>
        l.siteName.includes(q) ||
        l.area.includes(q) ||
        l.operatorName.includes(q) ||
        (l.licenseNo ?? '').includes(q)
    );
  }, [lots, query]);

  const pending = handoffs.find((h) => h.status === 'pending');
  const activeAccepted = handoffs.find((h) => h.status === 'accepted');
  const watching = submittedId
    ? handoffs.find((h) => h.id === submittedId)
    : pending || activeAccepted;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverAuth?.verified) return;
    if (!selectedSiteId || !plate.trim()) return;
    const h = await createHandoff(selectedSiteId, plate);
    if (!h) return;
    setSubmittedId(h.id);
    setPlate('');
    setSelectedSiteId(null);
  }

  function startNew() {
    setSubmittedId('__new__');
  }

  function selectLot(siteId: string) {
    setSelectedSiteId(siteId);
  }

  if (watching && submittedId !== '__new__') {
    return <HandoffStatusCard handoffId={watching.id} onNew={startNew} />;
  }

  const selected = lots.find((l) => l.siteId === selectedSiteId);

  return (
    <div className="driver-landing">
      <section className="driver-hero">
        <div className="driver-hero-glow" aria-hidden />
        <p className="driver-kicker">أهلاً بك في عمّان</p>
        <h1>وين بدك تسلّم سيارتك؟</h1>
        <p className="driver-hero-sub">
          مواقف فاليه مرخّصة فقط — تتبّع مين استلم ومتى، بإشراف الهيئة.
        </p>
        <label className="driver-search">
          <span className="driver-search-icon" aria-hidden>
            📍
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منطقة أو موقف أو مشغّل…"
            aria-label="بحث عن موقف"
          />
          {geo.status === 'loading' ? (
            <span className="driver-search-meta">تحديد الموقع…</span>
          ) : (
            <span className={`driver-search-meta ${geo.source === 'gps' ? 'ok' : ''}`}>
              {geo.source === 'gps' ? 'GPS' : 'تجريبي'}
            </span>
          )}
        </label>
      </section>

      {geo.status !== 'loading' && (
        <section className="driver-map-card">
          <div className="driver-map-label">
            <span>خريطة المواقف المعتمدة</span>
            <Badge tone="ok">{filtered.length} مرخّص</Badge>
          </div>
          <LotsMap
            mode="driver"
            lots={filtered}
            user={{ lat: geo.lat, lng: geo.lng }}
            selectedSiteId={selectedSiteId}
            onRequestHandoff={selectLot}
          />
        </section>
      )}

      <section className="driver-sheet">
        <div className="sheet-handle" aria-hidden />
        <div className="sheet-head">
          <h2>أقرب المواقف</h2>
          <Link to="/driver/status" className="sheet-link">
            طلباتي
          </Link>
        </div>

        {geo.status === 'loading' && <div className="empty">جاري تحميل المواقف القريبة…</div>}
        {geo.status !== 'loading' && !filtered.length && (
          <div className="empty">لا مواقف مطابقة حالياً</div>
        )}

        <LotList lots={filtered} selectedSiteId={selectedSiteId} onSelect={selectLot} />

        <HandoffSheet
          verified={!!driverAuth?.verified}
          selected={selected}
          plate={plate}
          onPlateChange={setPlate}
          onCancel={() => setSelectedSiteId(null)}
          onSubmit={submit}
        />
      </section>
    </div>
  );
}
