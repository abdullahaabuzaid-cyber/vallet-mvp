import type { FilterState } from '@/shared/hooks/useFilters';
import { DATE_PRESETS } from './dates';

/** Preset chips (today / 7 / 30 days / all) plus custom from–to inputs. */
export function DateRangeFilter({ filters, label = 'الفترة' }: { filters: FilterState; label?: string }) {
  const { from, to } = filters.values;
  const setRange = (f: string, t: string) => filters.patch({ from: f, to: t });
  return (
    <div className="fb-field fb-dates">
      <span className="fb-label">{label}</span>
      <div className="fb-date-row">
        <div className="segmented" role="group" aria-label={label}>
          {DATE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={from === p.from() && to === p.to() ? 'active' : ''}
              onClick={() => setRange(p.from(), p.to())}
            >
              {p.label}
            </button>
          ))}
          <button type="button" className={!from && !to ? 'active' : ''} onClick={() => setRange('', '')}>
            الكل
          </button>
        </div>
        <input type="date" aria-label="من تاريخ" value={from} max={to || undefined} onChange={(e) => filters.set('from', e.target.value)} />
        <input type="date" aria-label="إلى تاريخ" value={to} min={from || undefined} onChange={(e) => filters.set('to', e.target.value)} />
      </div>
    </div>
  );
}
