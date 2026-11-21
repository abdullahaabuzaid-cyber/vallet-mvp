import { INCIDENT_STATUS_LABELS, INCIDENT_TYPE_LABELS, LICENSE_STATUS_LABELS } from '../../../shared/constants/labels.ts';

/** Long-form invoice kinds used in exported reports and invoice PDFs. */
export const KIND_LABELS: Record<string, string> = {
  license_fee: 'رسوم ترخيص',
  fine: 'غرامة',
  visit_fee: 'رسوم رقابة على الزيارات',
};
export const INCIDENT_TYPE: Record<string, string> = INCIDENT_TYPE_LABELS;
export const INCIDENT_STATUS: Record<string, string> = INCIDENT_STATUS_LABELS;
export const OP_STATUS: Record<string, string> = LICENSE_STATUS_LABELS;
export const paidLabel = (status: string) => (status === 'paid' ? 'مدفوعة' : 'غير مدفوعة');

export const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
export const day = (s: string) => new Date(s).toISOString().slice(0, 10);
