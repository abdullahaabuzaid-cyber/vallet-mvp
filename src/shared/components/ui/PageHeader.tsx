import { Icon, type IconName } from './Icon';
export function PageHeader({ title, subtitle, eyebrow, icon = 'grid', children }: {
  title: string; subtitle?: string; eyebrow?: string; icon?: IconName; children?: React.ReactNode;
}) {
  return <div className="page-header"><div className="page-heading"><span className="page-heading-icon"><Icon name={icon} size={24} /></span><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></div><div className="page-header-actions">{children}</div></div>;
}
