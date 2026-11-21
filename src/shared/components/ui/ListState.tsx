import { EmptyState } from './EmptyState';
export function ListSkeleton() {
  return <div className="list-skeleton" role="status" aria-label="جارٍ تحميل النتائج">{[0, 1, 2, 3].map((n) => <div key={n} className="skeleton-row"><i /><span /><span /><span /></div>)}</div>;
}
export function ListState({ loading, error, count, children }: { loading: boolean; error: string; count: number; children: React.ReactNode }) {
  if (loading) return <ListSkeleton />;
  if (error) return <div className="reg-alert" role="alert">تعذّر تحميل النتائج: {error}</div>;
  if (!count) return <EmptyState />;
  return <>{children}</>;
}
