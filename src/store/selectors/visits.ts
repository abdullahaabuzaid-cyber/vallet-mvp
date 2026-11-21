import type { Visit } from '@common/types';
import { getState } from '../core';
import { empName } from './lookups';

export function visitStatusLabel(v: Visit): 'داخل الموقف' | 'تم التسليم' | 'بانتظار التسليم' {
  if (v.checkOutAt) return 'تم التسليم';
  if (v.returnRequestedAt) return 'بانتظار التسليم';
  return 'داخل الموقف';
}

export type TimelineStep = {
  key: string;
  label: string;
  at?: string;
  by?: string;
  done: boolean;
};

/** Custody chain for a visit: request → accept → receive → park → return request → hand over. */
export function visitTimeline(v: Visit): TimelineStep[] {
  const handoff = v.handoffId ? getState().handoffs.find((h) => h.id === v.handoffId) : undefined;
  const steps: TimelineStep[] = [
    { key: 'request', label: 'طلب التسليم من المالك', at: handoff?.createdAt, done: !!handoff?.createdAt },
    {
      key: 'accepted',
      label: 'قبول الطلب',
      at: handoff?.acceptedAt,
      by: handoff?.assignedEmployeeId ? empName(handoff.assignedEmployeeId) : undefined,
      done: !!handoff?.acceptedAt,
    },
    { key: 'received', label: 'استلام السيارة', at: v.checkInAt, by: empName(v.checkInBy), done: !!v.checkInAt },
    { key: 'parked', label: 'رُكنت في الموقف', at: v.parkedAt, by: empName(v.checkInBy), done: !!v.parkedAt },
    { key: 'return_req', label: 'طلب الإرجاع من المالك', at: v.returnRequestedAt, done: !!v.returnRequestedAt },
    {
      key: 'handed',
      label: 'تسليم السيارة للمالك',
      at: v.checkOutAt,
      by: v.checkOutBy ? empName(v.checkOutBy) : undefined,
      done: !!v.checkOutAt,
    },
  ];
  // Walk-in without app request: collapse request/accepted as N/A skipped
  if (!handoff) {
    steps[0] = { ...steps[0], label: 'دخول مباشر (بدون طلب تطبيق)', done: true, at: v.checkInAt };
    steps[1] = { ...steps[1], label: '—', done: false };
  }
  return steps;
}

export function findActiveVisitByPlate(plate: string, operatorId?: string) {
  const p = plate.trim().toLowerCase();
  return getState().visits.find(
    (v) => !v.checkOutAt && v.plate.toLowerCase() === p && (!operatorId || v.operatorId === operatorId)
  );
}
