import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LicenseStatus } from '../types';
import { STATUS_LABELS } from '../store/useStore';

export type MapLot = {
  siteId: string;
  siteName: string;
  area: string;
  operatorId: string;
  operatorName: string;
  licenseNo?: string;
  status: LicenseStatus;
  lat: number;
  lng: number;
  distanceKm?: number;
};

export type UnlicensedPin = {
  id: string;
  area: string;
  description: string;
  lat: number;
  lng: number;
  statusLabel: string;
};

const STATUS_COLOR: Record<LicenseStatus, string> = {
  approved: '#0f8a4b',
  pending: '#b7791f',
  suspended: '#c62828',
  rejected: '#7a8b9c',
};

const UNLICENSED_COLOR = '#7c3aed';

function validCoord(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function pinIcon(color: string, label?: string) {
  const text = label
    ? `<span style="font-size:10px;font-weight:700;color:#fff;line-height:1">${label}</span>`
    : '';
  return L.divIcon({
    className: 'vallet-pin',
    html: `<div style="
      width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:${color};border:2px solid #fff;box-shadow:0 4px 12px rgba(11,31,58,.35);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center">${text}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

function FitBounds({
  lots,
  user,
  unlicensed,
}: {
  lots: MapLot[];
  user?: { lat: number; lng: number } | null;
  unlicensed?: UnlicensedPin[];
}) {
  const map = useMap();
  useEffect(() => {
    let alive = true;
    const run = () => {
      if (!alive) return;
      try {
        const container = map.getContainer();
        if (!container || !container.isConnected) return;
        const pts: [number, number][] = lots
          .filter((l) => validCoord(l.lat, l.lng))
          .map((l) => [l.lat, l.lng]);
        if (user && validCoord(user.lat, user.lng)) pts.push([user.lat, user.lng]);
        (unlicensed ?? [])
          .filter((u) => validCoord(u.lat, u.lng))
          .forEach((u) => pts.push([u.lat, u.lng]));
        if (!pts.length) {
          map.setView([31.9539, 35.9106], 12);
          return;
        }
        if (pts.length === 1) {
          map.setView(pts[0], 14);
          return;
        }
        map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 14 });
      } catch {
        /* map already unmounted */
      }
    };
    const id = window.setTimeout(run, 0);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [map, lots, user, unlicensed]);
  return null;
}

function formatDistance(km?: number) {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

type DriverProps = {
  mode: 'driver';
  lots: MapLot[];
  user?: { lat: number; lng: number } | null;
  selectedSiteId?: string | null;
  onRequestHandoff: (siteId: string) => void;
};

type GovProps = {
  mode: 'gov';
  lots: MapLot[];
  unlicensed?: UnlicensedPin[];
};

export type LotsMapProps = DriverProps | GovProps;

export function LotsMap(props: LotsMapProps) {
  const lots = props.lots.filter((l) => validCoord(l.lat, l.lng));
  const user = props.mode === 'driver' ? props.user : null;
  const unlicensed = (props.mode === 'gov' ? props.unlicensed ?? [] : []).filter((u) =>
    validCoord(u.lat, u.lng)
  );
  const selectedSiteId = props.mode === 'driver' ? props.selectedSiteId : null;
  // Stable key per mode — avoids Leaflet container reuse under React StrictMode
  const mapKey = props.mode;

  const icons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const status of Object.keys(STATUS_COLOR) as LicenseStatus[]) {
      map.set(status, pinIcon(STATUS_COLOR[status]));
    }
    map.set('unlicensed', pinIcon(UNLICENSED_COLOR, '!'));
    map.set('selected', pinIcon('#0b5fff'));
    return map;
  }, []);

  return (
    <div className="lots-map-wrap" dir="ltr">
      <MapContainer
        key={mapKey}
        center={[31.9539, 35.9106]}
        zoom={12}
        className="lots-map"
        scrollWheelZoom
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds lots={lots} user={user} unlicensed={unlicensed} />

        {user && validCoord(user.lat, user.lng) && (
          <CircleMarker
            center={[user.lat, user.lng]}
            radius={9}
            pathOptions={{ color: '#0b5fff', fillColor: '#38bdf8', fillOpacity: 0.9, weight: 2 }}
          >
            <Popup>
              <div dir="rtl" className="map-popup">
                <strong>موقعك الحالي</strong>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {lots.map((lot) => {
          const selected = selectedSiteId === lot.siteId;
          const icon =
            selected && props.mode === 'driver'
              ? icons.get('selected')!
              : icons.get(lot.status) ?? icons.get('approved')!;
          return (
            <Marker key={lot.siteId} position={[lot.lat, lot.lng]} icon={icon}>
              <Popup className="vallet-popup">
                <div dir="rtl" className="map-popup">
                  <strong className="map-popup-title">{lot.siteName}</strong>
                  <div className="muted">{lot.area}</div>
                  <div className="map-popup-row">
                    المشغّل: <strong>{lot.operatorName}</strong>
                  </div>
                  {lot.licenseNo && <div className="muted">ترخيص: {lot.licenseNo}</div>}
                  <div className="map-popup-row">
                    الحالة:{' '}
                    <span style={{ color: STATUS_COLOR[lot.status], fontWeight: 700 }}>
                      {STATUS_LABELS[lot.status]}
                    </span>
                  </div>
                  {formatDistance(lot.distanceKm) && (
                    <div className="map-popup-row">المسافة: {formatDistance(lot.distanceKm)}</div>
                  )}
                  {props.mode === 'driver' && lot.status === 'approved' && (
                    <button
                      type="button"
                      className="btn btn-primary map-popup-btn"
                      onClick={() => props.onRequestHandoff(lot.siteId)}
                    >
                      طلب تسليم السيارة
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {unlicensed.map((u) => (
          <Marker key={u.id} position={[u.lat, u.lng]} icon={icons.get('unlicensed')!}>
            <Popup className="vallet-popup">
              <div dir="rtl" className="map-popup">
                <strong className="map-popup-title">بلاغ فاليه غير مرخّص</strong>
                <div>{u.area}</div>
                <div className="muted">{u.description}</div>
                <div style={{ color: UNLICENSED_COLOR, fontWeight: 700 }}>{u.statusLabel}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {props.mode === 'gov' && (
        <div className="map-legend" dir="rtl">
          <span><i style={{ background: STATUS_COLOR.approved }} /> مرخّص</span>
          <span><i style={{ background: STATUS_COLOR.pending }} /> قيد المراجعة</span>
          <span><i style={{ background: STATUS_COLOR.suspended }} /> موقوف</span>
          <span><i style={{ background: UNLICENSED_COLOR }} /> بلاغ غير مرخّص</span>
        </div>
      )}
    </div>
  );
}
