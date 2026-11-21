import { Icon, type IconName } from './Icon';
export function StatCard({ label, value, detail, icon = 'chart', tone = 'blue' }: {
  label: string; value: React.ReactNode; detail?: string; icon?: IconName; tone?: 'blue' | 'teal' | 'amber' | 'violet';
}) {
  return <div className={`stat-card tone-${tone}`}><div className="stat-top"><span>{label}</span><i><Icon name={icon} /></i></div><strong className="stat-value">{value}</strong>{detail && <span className="stat-detail">{detail}</span>}</div>;
}
