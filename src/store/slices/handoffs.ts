import type { HandoffRequest, Visit } from '@common/types';
import { api } from '@/shared/lib/api';
import { run } from '../core';

export async function createHandoff(siteId: string, plate: string): Promise<HandoffRequest | null> {
  const r = await run(() => api<{ handoff: HandoffRequest }>('/api/handoffs', { siteId, plate }));
  return r?.handoff ?? null;
}

export function cancelHandoff(handoffId: string) {
  return run(() => api(`/api/handoffs/${handoffId}/cancel`, {}));
}

export async function acceptHandoff(handoffId: string, employeeId: string): Promise<Visit | null> {
  const r = await run(() => api<{ visit: Visit }>(`/api/handoffs/${handoffId}/accept`, { employeeId }), 'تم قبول الطلب وإنشاء الزيارة');
  return r?.visit ?? null;
}

export function rejectHandoff(handoffId: string) {
  return run(() => api(`/api/handoffs/${handoffId}/reject`, {}));
}

/** Operator setting: auto-accept driver handoffs when the lot has room. */
export function setAutoAcceptHandoffs(enabled: boolean) {
  return run(() => api('/api/operator/auto-accept', { enabled }));
}
