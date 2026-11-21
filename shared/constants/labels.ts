import type { IncidentStatus, IncidentType } from '../types/incidents.ts';
import type { LicenseStatus } from '../types/licensing.ts';

export const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'ساري',
  rejected: 'مرفوض',
  suspended: 'موقوف',
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  damage: 'ضرر',
  lost_keys: 'فقدان مفاتيح',
  delay: 'تأخير',
  unlicensed: 'فاليه غير مرخّص',
  other: 'أخرى',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'مفتوح',
  investigating: 'قيد التحقيق',
  closed: 'مغلق',
  fined: 'مخالفة + إغلاق',
};
