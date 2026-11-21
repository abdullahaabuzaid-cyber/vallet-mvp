import type { IncidentStatus, IncidentType } from '@common/types';
import { api } from '@/shared/lib/api';
import { run } from '../core';

export async function addIncident(input: {
  type: IncidentType;
  description: string;
  visitId?: string;
  plate?: string;
  operatorId?: string;
  lat?: number;
  lng?: number;
  area?: string;
}) {
  const r = await run(() => api<{ incident: { id: string } }>('/api/incidents', input), 'تم تسجيل البلاغ');
  return r?.incident ?? null;
}

export function updateIncidentStatus(id: string, status: IncidentStatus, fineAmount?: number) {
  return run(() => api(`/api/gov/incidents/${id}/status`, { status, fineAmount }), status === 'fined' ? 'تم تسجيل المخالفة وإصدار فاتورة الغرامة' : undefined);
}

export function ackAlert(id: string) {
  return run(() => api(`/api/gov/alerts/${encodeURIComponent(id)}/ack`, {}));
}
