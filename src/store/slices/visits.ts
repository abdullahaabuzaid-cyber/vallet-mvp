import type { Visit, VisitExtras } from '@common/types';
import { api } from '@/shared/lib/api';
import { run } from '../core';

export async function checkIn(plate: string, extras: VisitExtras = {}): Promise<Visit | null> {
  const r = await run(() => api<{ visit: Visit }>('/api/visits/checkin', { plate, ...extras }));
  return r?.visit ?? null;
}

export function markReady(visitId: string) {
  return run(() => api(`/api/visits/${visitId}/ready`, {}), 'تم إشعار صاحب السيارة بأنها جاهزة');
}

export function requestReturn(visitId: string) {
  return run(() => api(`/api/visits/${visitId}/request-return`, {}), 'تم إرسال طلب إرجاع السيارة');
}

export function checkOut(visitId: string) {
  return run(() => api(`/api/visits/${visitId}/checkout`, {}));
}
