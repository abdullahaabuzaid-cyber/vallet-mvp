import type { Visit } from '@common/types';
import type { BadgeTone } from '@/shared/components/ui/Badge';
import { visitStatusLabel } from '@/store';

export function statusTone(v: Visit): BadgeTone {
  const s = visitStatusLabel(v);
  if (s === 'تم التسليم') return 'ok';
  if (s === 'بانتظار التسليم') return 'warn';
  return 'info';
}

/** "Make · Model · Color" or "—". */
export function carLabel(v: Visit) {
  const parts = [v.carMake, v.carModel, v.carColor].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}
