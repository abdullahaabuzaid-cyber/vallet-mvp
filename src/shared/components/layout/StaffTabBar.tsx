import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icon';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/staff', label: 'الرئيسية', icon: 'grid' },
  { to: '/staff/scan', label: 'صوّر', icon: 'scan' },
  { to: '/staff/checkin', label: 'دخول', icon: 'arrow' },
  { to: '/staff/checkout', label: 'خروج', icon: 'check' },
  { to: '/staff/cars', label: 'الحالية', icon: 'car' },
];

/** Thumb-reach navigation for staff on phones. */
export function StaffTabBar() {
  return (
    <nav className="staff-tabbar" aria-label="تنقل الموظف">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end>
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
