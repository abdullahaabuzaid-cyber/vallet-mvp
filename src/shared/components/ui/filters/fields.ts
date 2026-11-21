import type { FilterField } from './types';
import { SORT_NEWEST } from './types';
export const searchField = (placeholder = 'ابحث بالاسم أو الرقم…'): FilterField => ({ type: 'search', placeholder });
export const dateField = { type: 'dateRange' } as const satisfies FilterField;
export const sortField: FilterField = { type: 'sort', options: SORT_NEWEST };
export const statusField = (labels: Record<string, string>): FilterField => ({ type: 'select', key: 'status', label: 'الحالة', options: Object.entries(labels).map(([value, label]) => ({ value, label })) });
export const kindField = (labels: Record<string, string>, label = 'النوع'): FilterField => ({ type: 'select', key: 'kind', label, options: Object.entries(labels).map(([value, text]) => ({ value, label: text })) });
export const VISIT_STATUS = { active: 'داخل الموقف — الكل', inside: 'مركونة', return_pending: 'مطلوبة للإرجاع', ready: 'جاهزة', delivered: 'تم التسليم' };
export const VISIT_SORT: FilterField = { type: 'sort', options: [...SORT_NEWEST, { value: 'plate', label: 'رقم اللوحة' }, { value: 'longest', label: 'الأطول مدة' }] };
