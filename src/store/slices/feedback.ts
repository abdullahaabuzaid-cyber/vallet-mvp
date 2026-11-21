import type { ComplaintCategory, ComplaintStatus } from '@common/types';
import { api } from '@/shared/lib/api';
import { run } from '../core';

export function rateVisit(visitId: string, stars: number, comment?: string) {
  return run(() => api('/api/ratings', { visitId, stars, comment }), 'شكراً لتقييمك');
}

export function fileComplaint(input: { visitId?: string; siteId?: string; category: ComplaintCategory; description: string }) {
  return run(() => api('/api/complaints', input), 'تم إرسال الشكوى للهيئة');
}

export function updateComplaint(id: number, status: ComplaintStatus, response?: string) {
  return run(() => api(`/api/gov/complaints/${id}`, { status, response }), 'تم تحديث الشكوى');
}
