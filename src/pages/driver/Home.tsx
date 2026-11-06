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

type ViewMode = 'list' | 'map';

export default function DriverHome() {
  const handoffs = useStore((s) => s.handoffs);
  const [geo, setGeo] = useState<GeoState>({ status: 'loading' });
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [plate, setPlate] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('list');

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

  const mapLots = useMemo(
    () =>
      lots.map((l) => ({
        ...l,
        status: 'approved' as const,
      })),
    [lots]
  );

  const pending = handoffs.find((h) => h.status === 'pending');
  const watching = submittedId
    ? handoffs.find((h) => h.id === submittedId)
    : pending;

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

  function selectFromMap(siteId: string) {
    setSelectedSiteId(siteId);
    setView('list');
    // Keep map optional — switch to list so the handoff form is visible on mobile
  }

  if (watching && submittedId !== '__new__') {
    return <HandoffStatusCard handoffId={watching.id} onNew={startNew} />;
  }

  return (
    <div className="phone-shell">
      <div className="card">
        <h2>أهلاً بك سائق</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          اختر أقرب موقف فاليه مرخّص وسلّم سيارتك.
        </p>
        {geo.status === 'loading' && <div className="muted">جاري تحديد موقعك…</div>}
        {geo.status !== 'loading' && (
          <div className="row" style={{ marginBottom: 10 }}>
            <Badge tone={geo.source === 'gps' ? 'ok' : 'warn'}>
              {geo.source === 'gps' ? 'موقع GPS' : `موقع تجريبي: ${DEMO_AMMAN_PIN.label}`}
            </Badge>
            {geo.status === 'error' && <span className="muted">{geo.reason}</span>}
          </div>
        )}
        <div className="view-toggle" role="tablist" aria-label="عرض المواقف">
          <button
            type="button"
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
            قائمة
          </button>
          <button
            type="button"
            className={view === 'map' ? 'active' : ''}
            onClick={() => setView('map')}
          >
            خريطة المواقف المعتمدة
          </button>
        </div>
      </div>

      {view === 'map' && geo.status !== 'loading' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <LotsMap
            mode="driver"
            lots={mapLots}
            user={{ lat: geo.lat, lng: geo.lng }}
            selectedSiteId={selectedSiteId}
            onRequestHandoff={selectFromMap}
          />
        </div>
      )}

      {view === 'list' && (
        <div className="card">
          <h3>أقرب المواقف المرخّصة</h3>
          {geo.status === 'loading' && <div className="empty">…</div>}
          {geo.status !== 'loading' && !lots.length && (
            <div className="empty">لا مواقف مرخّصة قريبة حالياً</div>
          )}
          <div className="stack">
            {lots.map((lot) => (
              <button
                key={lot.siteId}
                type="button"
                className={`lot-card ${selectedSiteId === lot.siteId ? 'selected' : ''}`}
                onClick={() => setSelectedSiteId(lot.siteId)}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{lot.siteName}</strong>
                  <Badge tone="info">
                    {lot.distanceKm < 1
                      ? `${Math.round(lot.distanceKm * 1000)} م`
                      : `${lot.distanceKm.toFixed(1)} كم`}
                  </Badge>
                </div>
                <div className="muted">
                  {lot.area} · {lot.operatorName}
                </div>
                {lot.licenseNo && <div className="muted">ترخيص: {lot.licenseNo}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSiteId && (
        <div className="card">
          <h3>سيارتي راحت على هذا المكان</h3>
          <form onSubmit={submit} className="stack">
            <div className="field">
              <label>رقم اللوحة</label>
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="12-34567"
                required
                autoFocus
              />
            </div>
            <button className="btn btn-primary btn-big" type="submit">
              إرسال طلب التسليم
            </button>
          </form>
        </div>
      )}

      {handoffs.length > 0 && (
        <div className="card">
          <h3>طلباتي السابقة</h3>
          <Link to="/driver/status" className="btn" style={{ display: 'inline-block' }}>
            عرض كل الطلبات
          </Link>
        </div>
      )}
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

  return (
    <div className="phone-shell">
      <div className="card">
        <div className="receipt">
          <div className="muted">حالة طلب التسليم</div>
          <div className="code" style={{ fontSize: '1.2rem' }}>
            {HANDOFF_STATUS_LABELS[handoff.status]}
          </div>
          <div>
            اللوحة: <strong>{handoff.plate}</strong>
          </div>
          <div className="muted">
            المكان: {site?.name} — {site?.area}
          </div>
          <div className="muted">طُلب في: {formatDateTime(handoff.createdAt)}</div>
        </div>

        {handoff.status === 'pending' && (
          <p className="muted" style={{ textAlign: 'center', marginTop: 14 }}>
            بانتظار قبول المشغّل… بدّل الدور إلى «مشغّل» لقبول الطلب في العرض التجريبي.
          </p>
        )}

        {handoff.status === 'accepted' && (
          <div className="stack" style={{ marginTop: 14 }}>
            <div className="card" style={{ margin: 0, background: 'var(--success-soft)' }}>
              <div>
                <strong>الشركة:</strong> {op?.name}
              </div>
              <div>
                <strong>استلم السيارة:</strong> {staff?.name ?? '—'}
              </div>
              <div>
                <strong>وقت الاستلام:</strong>{' '}
                {handoff.acceptedAt ? formatDateTime(handoff.acceptedAt) : '—'}
              </div>
              {visit && (
                <div>
                  <strong>إيصال الزيارة:</strong> {visit.receiptNo}
                </div>
              )}
              {visit?.checkOutAt ? (
                <div style={{ marginTop: 8 }}>
                  <Badge tone="ok">تم الخروج</Badge>{' '}
                  <strong>{formatDateTime(visit.checkOutAt)}</strong>
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <Badge tone="info">السيارة لا تزال في الموقف</Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {(handoff.status === 'rejected' || handoff.status === 'cancelled') && (
          <p className="muted" style={{ textAlign: 'center', marginTop: 14 }}>
            يمكنك إرسال طلب جديد لموقف آخر.
          </p>
        )}

        <div className="row" style={{ marginTop: 14 }}>
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
    </div>
  );
}
