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

function pinIcon(color: string, label?: string) {
  const text = label ? `<span style="font-size:10px;font-weight:700;color:#fff;line-height:1">${label}</span>` : '';
  return L.divIcon({
    className: 'vallet-pin',
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center">${text}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
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
    const pts: [number, number][] = lots.map((l) => [l.lat, l.lng]);
    if (user) pts.push([user.lat, user.lng]);
    (unlicensed ?? []).forEach((u) => pts.push([u.lat, u.lng]));
    if (!pts.length) {
      map.setView([31.9539, 35.9106], 12);
      return;
    }
    if (pts.length === 1) {
      map.setView(pts[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 14 });
  }, [map, lots, user, unlicensed]);
  return null;
}

function formatDistance(km?: number) {
  if (km == null) return null;
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
  const lots = props.lots;
  const user = props.mode === 'driver' ? props.user : null;
  const unlicensed = props.mode === 'gov' ? props.unlicensed ?? [] : [];
  const selectedSiteId = props.mode === 'driver' ? props.selectedSiteId : null;

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

        {user && (
          <CircleMarker
            center={[user.lat, user.lng]}
            radius={9}
            pathOptions={{ color: '#0b5fff', fillColor: '#38bdf8', fillOpacity: 0.9, weight: 2 }}
          >
            <Popup>
              <div dir="rtl" className="map-popup">
                <strong>موقعك</strong>
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
              <Popup>
                <div dir="rtl" className="map-popup">
                  <strong>{lot.siteName}</strong>
                  <div className="muted">{lot.area}</div>
                  <div>
                    المشغّل: <strong>{lot.operatorName}</strong>
                  </div>
                  {lot.licenseNo && <div className="muted">ترخيص: {lot.licenseNo}</div>}
                  <div>
                    الحالة:{' '}
                    <span style={{ color: STATUS_COLOR[lot.status], fontWeight: 600 }}>
                      {STATUS_LABELS[lot.status]}
                    </span>
                  </div>
                  {formatDistance(lot.distanceKm) && (
                    <div>المسافة: {formatDistance(lot.distanceKm)}</div>
                  )}
                  {props.mode === 'driver' && lot.status === 'approved' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ marginTop: 8, width: '100%' }}
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
            <Popup>
              <div dir="rtl" className="map-popup">
                <strong>بلاغ فاليه غير مرخّص</strong>
                <div>{u.area}</div>
                <div className="muted">{u.description}</div>
                <div style={{ color: UNLICENSED_COLOR, fontWeight: 600 }}>{u.statusLabel}</div>
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
