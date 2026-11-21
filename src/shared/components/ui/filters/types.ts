export type FilterOption = { value: string; label: string };

/** Declarative filter fields; values live in the URL (see useFilters). */
export type FilterField =
  | { type: 'search'; placeholder: string; label?: string }
  | { type: 'select'; key: string; label: string; options: FilterOption[]; allLabel?: string }
  | { type: 'dateRange'; label?: string }
  | { type: 'sort'; options: FilterOption[] };

export const SORT_NEWEST: FilterOption[] = [
  { value: 'newest', label: 'الأحدث أولاً' },
  { value: 'oldest', label: 'الأقدم أولاً' },
];
