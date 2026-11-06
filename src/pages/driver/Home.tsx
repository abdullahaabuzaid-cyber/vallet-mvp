import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEMO_AMMAN_PIN } from '../../data/seed';
import { Badge } from '../../components/Layout';
import { LotsMap } from '../../components/LotsMap';
import {
  createHandoff,
  formatDateTime,
  HANDOFF_STATUS_LABELS,
  licensedLotsNear,
  useStore,
} from '../../store/useStore';

type GeoState =
  | { status: 'loading' }
  | { status: 'ok'; lat: number; lng: number; source: 'gps' | 'demo' }
  | { status: 'error'; lat: number; lng: number; source: 'demo'; reason: string };

function demoRating(siteId: string) {
  let h = 0;
  for (let i = 0; i < siteId.length; i++) h = (h + siteId.charCodeAt(i) * 17) % 40;
  return (4.6 + h / 100).toFixed(1);
}

function formatDist(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

export default function DriverHome() {
  const handoffs = useStore((s) => s.handoffs);
  const [geo, setGeo] = useState<GeoState>({ status: 'loading' });
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [plate, setPlate] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo({
        status: 'error',
        lat: DEMO_AMMAN_PIN.lat,
        lng: DEMO_AMMAN_PIN.lng,
        source: 'demo',
        reason: 'المتصفح لا يدعم تحديد الموقع',
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          status: 'ok',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: 'gps',
        });
      },
      (err) => {
        setGeo({
          status: 'error',
          lat: DEMO_AMMAN_PIN.lat,
          lng: DEMO_AMMAN_PIN.lng,
          source: 'demo',
          reason: err.message || 'تم رفض إذن الموقع',
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }, []);

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

  const mapLots = useMemo(
    () =>
      filtered.map((l) => ({
        ...l,
        status: 'approved' as const,
      })),
    [filtered]
  );

  const pending = handoffs.find((h) => h.status === 'pending');
  const activeAccepted = handoffs.find((h) => h.status === 'accepted');
  const watching = submittedId
    ? handoffs.find((h) => h.id === submittedId)
    : pending || activeAccepted;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSiteId || !plate.trim()) return;
    const h = createHandoff(selectedSiteId, plate);
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
            lots={mapLots}
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

        <div className="lot-sheet-list">
          {filtered.map((lot, idx) => {
            const rating = demoRating(lot.siteId);
            const selectedCls = selectedSiteId === lot.siteId ? 'selected' : '';
            return (
              <article key={lot.siteId} className={`lot-sheet-card ${selectedCls}`}>
                <button type="button" className="lot-sheet-main" onClick={() => selectLot(lot.siteId)}>
                  <div className="lot-sheet-icon" aria-hidden>
                    {idx === 0 ? '🅿️' : '🚘'}
                  </div>
                  <div className="lot-sheet-body">
                    <div className="lot-sheet-top">
                      <strong>{lot.siteName}</strong>
                      <span className="lot-dist">{formatDist(lot.distanceKm)}</span>
                    </div>
                    <div className="lot-sheet-meta">
                      {lot.area} · {lot.operatorName}
                    </div>
                    <div className="lot-sheet-badges">
                      <span className="pill-licensed">✓ مرخّص</span>
                      <span className="pill-rating">★ {rating}</span>
                      {lot.licenseNo && <span className="pill-muted">{lot.licenseNo}</span>}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="btn btn-primary lot-cta"
                  onClick={() => selectLot(lot.siteId)}
                >
                  سلّم سيارتك
                </button>
              </article>
            );
          })}
        </div>

        {selected && (
          <div className="handoff-sheet card">
            <div className="handoff-sheet-head">
              <div>
                <div className="muted">تسليم إلى</div>
                <strong>
                  {selected.siteName} — {selected.area}
                </strong>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => setSelectedSiteId(null)}>
                إلغاء
              </button>
            </div>
            <form onSubmit={submit} className="stack">
              <div className="field">
                <label>رقم لوحة سيارتك</label>
                <input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="12-34567"
                  required
                  autoFocus
                  inputMode="text"
                />
              </div>
              <button className="btn btn-primary btn-big" type="submit">
                تأكيد التسليم
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

function HandoffStatusCard({ handoffId, onNew }: { handoffId: string; onNew: () => void }) {
  const handoff = useStore((s) => s.handoffs.find((h) => h.id === handoffId));
  const visit = useStore((s) =>
    handoff?.visitId ? s.visits.find((v) => v.id === handoff.visitId) : undefined
  );
  const op = useStore((s) =>
    handoff ? s.operators.find((o) => o.id === handoff.operatorId) : undefined
  );
  const site = useStore((s) => {
    if (!handoff) return undefined;
    const operator = s.operators.find((o) => o.id === handoff.operatorId);
    return operator?.sites.find((x) => x.id === handoff.siteId);
  });
  const staff = useStore((s) =>
    handoff?.assignedEmployeeId
      ? s.employees.find((e) => e.id === handoff.assignedEmployeeId)
      : undefined
  );

  if (!handoff) return null;

  const pending = handoff.status === 'pending';

  return (
    <div className="driver-landing">
      <section className="driver-hero compact">
        <p className="driver-kicker">تتبّع الزيارة</p>
        <h1>{HANDOFF_STATUS_LABELS[handoff.status]}</h1>
      </section>
      <section className="driver-sheet tracking">
        <div className="sheet-handle" aria-hidden />
        <div className="tracking-card">
          <div className={`tracking-pulse ${pending ? 'live' : 'done'}`} aria-hidden />
          <div className="tracking-plate">{handoff.plate}</div>
          <div className="muted">
            {site?.name} — {site?.area}
          </div>
          <div className="muted">طُلب: {formatDateTime(handoff.createdAt)}</div>

          {pending && (
            <p className="tracking-hint">
              بانتظار قبول المشغّل… من قائمة «دخول الجهات» افتح بوابة المشغّل لقبول الطلب في العرض التجريبي.
            </p>
          )}

          {handoff.status === 'accepted' && (
            <div className="tracking-details">
              <div>
                <span className="muted">الشركة</span>
                <strong>{op?.name}</strong>
              </div>
              <div>
                <span className="muted">استلم</span>
                <strong>{staff?.name ?? '—'}</strong>
              </div>
              <div>
                <span className="muted">وقت الاستلام</span>
                <strong>{handoff.acceptedAt ? formatDateTime(handoff.acceptedAt) : '—'}</strong>
              </div>
              {visit && (
                <div>
                  <span className="muted">إيصال</span>
                  <strong>{visit.receiptNo}</strong>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                {visit?.checkOutAt ? (
                  <Badge tone="ok">تم الخروج · {formatDateTime(visit.checkOutAt)}</Badge>
                ) : (
                  <Badge tone="info">السيارة لا تزال في الموقف</Badge>
                )}
              </div>
            </div>
          )}

          {(handoff.status === 'rejected' || handoff.status === 'cancelled') && (
            <p className="tracking-hint">يمكنك إرسال طلب جديد لموقف آخر.</p>
          )}

          <div className="row" style={{ marginTop: 16 }}>
            {handoff.status !== 'pending' && (
              <button className="btn btn-primary" type="button" onClick={onNew}>
                طلب جديد
              </button>
            )}
            <Link to="/driver/status" className="btn">
              كل الطلبات
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
