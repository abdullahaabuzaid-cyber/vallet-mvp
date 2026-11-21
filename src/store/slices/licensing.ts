import type { LicenseStatus } from '@common/types';
import { api } from '@/shared/lib/api';
import { run } from '../core';

export function createOperator(input: {
  name: string;
  area: string;
  username: string;
  password: string;
  site: { name: string; area: string; lat: number; lng: number; capacity: number };
}) {
  return run(() => api<{ operator: { id: string } }>('/api/gov/operators', input), 'تم إنشاء حساب المشغّل');
}

export function submitOperatorForReview() {
  return run(() => api('/api/operator/submit', {}), 'تم إرسال الطلب للهيئة');
}

export function approveLicense(operatorId: string) {
  return run(() => api(`/api/gov/operators/${operatorId}/approve`, {}), 'تم اعتماد الترخيص وإصدار فاتورة الرسوم');
}

export function rejectLicense(operatorId: string, reason: string) {
  return run(() => api(`/api/gov/operators/${operatorId}/reject`, { reason }));
}

export function setOperatorStatus(operatorId: string, status: LicenseStatus) {
  return run(() => api(`/api/gov/operators/${operatorId}/status`, { status }));
}
