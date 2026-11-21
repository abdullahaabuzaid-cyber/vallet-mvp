import type { LicenseStatus } from '@common/types';
import { INCIDENT_STATUS_LABELS } from '@/shared/constants/labels';
import { distanceKm, isFiniteCoord, type LatLng } from '@/shared/lib/geo';
import { getState } from '../core';
import { siteById } from './lookups';

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

function lots(filter: (status: LicenseStatus) => boolean, origin?: LatLng): MapLot[] {
  const out: MapLot[] = [];
  for (const op of getState().operators) {
    if (!filter(op.status)) continue;
    for (const site of op.sites) {
      if (!isFiniteCoord(site.lat) || !isFiniteCoord(site.lng)) continue;
      out.push({
        siteId: site.id,
        siteName: site.name,
        area: site.area,
        operatorId: op.id,
        operatorName: op.name,
        licenseNo: op.licenseNo,
        status: op.status,
        lat: site.lat,
        lng: site.lng,
        distanceKm: origin ? distanceKm(origin, site) : undefined,
      });
    }
  }
  if (origin) out.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return out;
}

/** Licensed (approved) lots sorted by distance from `origin` (driver view). */
export function licensedLotsNear(origin: LatLng) {
  return lots((s) => s === 'approved', origin) as (MapLot & { distanceKm: number })[];
}

/** All operator lots for gov / map views, optionally with distance from origin. */
export function allLotsForMap(origin?: LatLng) {
  return lots(() => true, origin);
}

/** Reported unlicensed-valet locations. */
export function unlicensedPins() {
  return getState().incidents
    .filter((i) => i.type === 'unlicensed' && isFiniteCoord(i.lat) && isFiniteCoord(i.lng))
    .map((i) => ({
      id: i.id,
      area: i.area ?? 'عمّان',
      description: i.description,
      lat: i.lat as number,
      lng: i.lng as number,
      statusLabel: INCIDENT_STATUS_LABELS[i.status],
    }));
}

export function siteOccupancy(siteId: string) {
  return getState().visits.filter((v) => v.siteId === siteId && !v.checkOutAt).length;
}

export function siteHasCapacity(siteId: string) {
  const found = siteById(siteId);
  if (!found) return false;
  const cap = found.site.capacity || 10;
  return siteOccupancy(siteId) < cap;
}
