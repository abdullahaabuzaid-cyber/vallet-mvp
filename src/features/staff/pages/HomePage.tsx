import { Link } from 'react-router-dom';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { StatCard } from '@/shared/components/ui/StatCard';
import { siteName, useStore } from '@/store';

const ACTIONS: { to: string; label: string; hint: string; icon: IconName; primary?: boolean }[] = [
  { to: '/staff/scan', label: 'صوّر النمرة', hint: 'قراءة تلقائية للوحة والوقت', icon: 'scan', primary: true },
  { to: '/staff/checkin', label: 'دخول سيارة', hint: 'استلام يدوي وإصدار إيصال', icon: 'arrow' },
  { to: '/staff/checkout', label: 'خروج سيارة', hint: 'تسليم السيارة لصاحبها', icon: 'check' },
  { to: '/staff/incident', label: 'بلاغ حادثة', hint: 'ضرر، مفاتيح، تأخير…', icon: 'shield' },
];

/** Staff home: shift summary + big one-tap actions. */
export default function HomePage() {
  const emp = useStore((s) => s.employees.find((e) => e.id === s.currentEmployeeId));
  const cars = useStore((s) => s.visits.filter((v) => v.siteId === emp?.siteId && !v.checkOutAt));
  const requested = cars.filter((v) => v.returnRequestedAt && !v.readyAt).length;
  return (
    <div className="staff-page">
      <div className="card staff-hero">
        <span className="eyebrow">مرحباً، {emp?.name}</span>
        <h2>{emp?.siteId ? siteName(emp.siteId) : '—'}</h2>
        <p>موقعك الحالي · وردية اليوم</p>
      </div>
      <div className="stat-grid">
        <StatCard label="سيارات في العهدة" value={cars.length} icon="car" />
        <StatCard label="مطلوبة للإرجاع" value={requested} icon="clock" tone="amber" />
      </div>
      <div className="action-grid">
        {ACTIONS.map((a) => (
          <Link key={a.to} to={a.to} className={`action-tile ${a.primary ? 'is-primary' : ''}`}>
            <span className="action-icon"><Icon name={a.icon} size={24} /></span>
            <strong>{a.label}</strong>
            <small>{a.hint}</small>
          </Link>
        ))}
      </div>
      <Link to="/staff/cars" className="btn" style={{ width: '100%' }}>عرض السيارات الحالية ({cars.length})</Link>
    </div>
  );
}
