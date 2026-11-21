import { Icon, type IconName } from './Icon';
export function EmptyState({ title = 'لا توجد نتائج مطابقة', description = 'جرّب تغيير الفلاتر أو مسحها لعرض كل النتائج.', icon = 'search', action }: {
  title?: string; description?: string; icon?: IconName; action?: React.ReactNode;
}) {
  return <div className="empty-state" role="status"><span className="empty-icon"><Icon name={icon} size={28} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
