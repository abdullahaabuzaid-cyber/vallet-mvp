import { useState } from 'react';
import type { FilterState } from '@/shared/hooks/useFilters';
import { Icon } from '../Icon';
import { rangeLabel } from './dates';
import { DateRangeFilter } from './DateRangeFilter';
import type { FilterField } from './types';

type Props = {
  fields: FilterField[];
  filters: FilterState;
  /** Rows shown / matching total (server lists). */
  count: number;
  total?: number;
  loading?: boolean;
  children?: React.ReactNode;
};

type Chip = { id: string; label: string; clear: () => void };

function chipsFor(fields: FilterField[], f: FilterState): Chip[] {
  const v = f.values;
  const chips: Chip[] = [];
  for (const field of fields) {
    if (field.type === 'search' && v.q) chips.push({ id: 'q', label: `بحث: ${v.q}`, clear: () => f.set('q', '') });
    if (field.type === 'select' && v[field.key]) {
      const opt = field.options.find((o) => o.value === v[field.key]);
      chips.push({ id: field.key, label: `${field.label}: ${opt?.label ?? v[field.key]}`, clear: () => f.set(field.key, '') });
    }
    if (field.type === 'dateRange' && (v.from || v.to)) {
      chips.push({
        id: 'dates',
        label: `${field.label ?? 'الفترة'}: ${rangeLabel(v.from, v.to)}`,
        clear: () => f.patch({ from: '', to: '' }),
      });
    }
  }
  return chips;
}

/** Search, selects, date range, sort, active chips, clear-all and a result count — state lives in the URL. */
export function FilterBar({ fields, filters, count, total, loading, children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const v = filters.values;
  const chips = chipsFor(fields, filters);
  const search = fields.find((f) => f.type === 'search');
  const sort = fields.find((f) => f.type === 'sort');
  return (
    <section className={`filter-bar ${expanded ? 'is-expanded' : ''}`} aria-label="الفلاتر" data-testid="filter-bar">
      <button type="button" className="btn btn-sm fb-mobile-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <Icon name="search" size={16} /> {expanded ? 'إخفاء الفلاتر' : 'تصفية وفرز'} {chips.length > 0 && `(${chips.length})`}
      </button>
      <div className="fb-main">
        {search && (
          <label className="fb-search">
            <Icon name="search" />
            <input
              type="search"
              value={v.q}
              placeholder={search.placeholder}
              aria-label={search.label ?? 'بحث'}
              onChange={(e) => filters.set('q', e.target.value)}
              data-testid="filter-search"
            />
          </label>
        )}
        {fields.map((f) =>
          f.type === 'select' ? (
            <label key={f.key} className="fb-field">
              <span className="fb-label">{f.label}</span>
              <select value={v[f.key]} onChange={(e) => filters.set(f.key, e.target.value)} data-testid={`filter-${f.key}`}>
                <option value="">{f.allLabel ?? 'الكل'}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          ) : null
        )}
        {sort && sort.type === 'sort' && (
          <label className="fb-field">
            <span className="fb-label">الترتيب</span>
            <select value={v.sort || sort.options[0].value} onChange={(e) => filters.set('sort', e.target.value)} data-testid="filter-sort">
              {sort.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        )}
        {children}
      </div>
      {fields.map((f) => (f.type === 'dateRange' ? <DateRangeFilter key="dates" filters={filters} label={f.label} /> : null))}
      <div className="fb-foot">
        <span className="fb-count" data-testid="filter-count" aria-live="polite">
          {loading ? 'جارٍ التحميل…' : <><strong>{count.toLocaleString('ar-JO')}</strong> نتيجة{total !== undefined && total > count ? ` من ${total.toLocaleString('ar-JO')}` : ''}</>}
        </span>
        <div className="fb-chips">
          {chips.map((c) => (
            <button key={c.id} type="button" className="chip" onClick={c.clear} aria-label={`إزالة ${c.label}`}>
              {c.label}
              <Icon name="x" size={14} />
            </button>
          ))}
          {chips.length > 0 && (
            <button type="button" className="chip chip-clear" onClick={filters.clear} data-testid="filter-clear">
              مسح الكل
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
