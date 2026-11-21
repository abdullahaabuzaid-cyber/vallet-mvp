import type { ComplaintCategory, ComplaintStatus, DocStatus, HandoffStatus, InvoiceKind, ReviewStatus } from '@common/types';

// Labels also used by the API (reports) live in @common.
export { INCIDENT_STATUS_LABELS, INCIDENT_TYPE_LABELS, LICENSE_STATUS_LABELS } from '@common/constants/labels';

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  missing: 'غير مرفوعة',
  uploaded: 'بانتظار المراجعة',
  accepted: 'مقبولة',
  expiring: 'تنتهي قريباً',
  rejected: 'مرفوضة',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

export const HANDOFF_STATUS_LABELS: Record<HandoffStatus, string> = {
  pending: 'بانتظار القبول',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
};

export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  damage: 'ضرر بالسيارة',
  delay: 'تأخير بالتسليم',
  lost_item: 'فقدان غرض',
  behavior: 'سوء معاملة',
  overcharge: 'رسوم زائدة',
  unlicensed: 'فاليه غير مرخّص',
  other: 'أخرى',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  open: 'جديدة',
  investigating: 'قيد المتابعة',
  resolved: 'تمت المعالجة',
  rejected: 'مرفوضة',
};

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  license_fee: 'رسوم ترخيص',
  fine: 'غرامة',
  visit_fee: 'رسوم رقابة',
};
