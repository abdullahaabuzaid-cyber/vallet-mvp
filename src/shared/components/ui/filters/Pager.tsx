import type { FilterState } from '@/shared/hooks/useFilters';

/** Previous / next pages for server lists (page number lives in the URL). */
export function Pager({ filters, total, pageSize }: { filters: FilterState; total: number; pageSize: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const page = Math.min(pages, Math.max(1, Number.parseInt(filters.values.page, 10) || 1));
  const go = (n: number) => filters.set('page', n > 1 ? String(n) : '');
  return (
    <nav className="pager" aria-label="الصفحات">
      <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => go(page - 1)}>السابق</button>
      <span>صفحة {page} من {pages}</span>
      <button type="button" className="btn btn-sm" disabled={page >= pages} onClick={() => go(page + 1)}>التالي</button>
    </nav>
  );
}
