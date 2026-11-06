import { Link, useLocation } from 'react-router-dom';
import { resetDemo, setRole, useStore } from '../store/useStore';
import type { Role } from '../types';

const ROLE_LABELS: Record<Role, string> = {
  gov: 'حكومة',
  operator: 'مشغّل',
  staff: 'موظف',
  driver: 'سائق',
};

const ROLE_ORDER: Role[] = ['gov', 'operator', 'staff', 'driver'];

const NAV: Record<Role, { to: string; label: string }[]> = {
  staff: [
    { to: '/staff', label: 'الرئيسية' },
    { to: '/staff/checkin', label: 'دخول' },
    { to: '/staff/checkout', label: 'خروج' },
    { to: '/staff/cars', label: 'الحالية' },
    { to: '/staff/incident', label: 'بلاغ' },
  ],
  operator: [
    { to: '/operator', label: 'اليوم' },
    { to: '/operator/requests', label: 'طلبات السائقين' },
    { to: '/operator/employees', label: 'الموظفون' },
    { to: '/operator/visits', label: 'الزيارات' },
    { to: '/operator/license', label: 'الترخيص' },
  ],
  gov: [
    { to: '/gov', label: 'الملخص' },
    { to: '/gov/map', label: 'الخريطة' },
    { to: '/gov/licenses', label: 'الطلبات' },
    { to: '/gov/operators', label: 'المشغّلون' },
    { to: '/gov/visits', label: 'تدقيق' },
    { to: '/gov/incidents', label: 'بلاغات' },
  ],
  driver: [
    { to: '/driver', label: 'المواقف' },
    { to: '/driver/status', label: 'طلباتي' },
  ],
};

export function Layout({ children }: { children: React.ReactNode }) {
  const role = useStore((s) => s.role);
  const pendingCount = useStore(
    (s) => s.handoffs.filter((h) => h.operatorId === s.currentOperatorId && h.status === 'pending').length
  );
  const loc = useLocation();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">ف</div>
          <div>
            فاليت
            <small>هيئة تنظيم الفاليه — عمّان</small>
          </div>
        </div>
        <div className="role-switch" role="tablist" aria-label="تبديل الدور">
          {ROLE_ORDER.map((r) => (
            <button
              key={r}
              className={role === r ? 'active' : ''}
              onClick={() => setRole(r)}
              type="button"
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </header>

      <main className="main">
        <div className="demo-banner">
          <span>
            وضع تجريبي — البيانات محفوظة محلياً. بدّل الدور: حكومة / مشغّل / موظف / سائق
          </span>
          <button className="btn" type="button" onClick={resetDemo}>
            إعادة البيانات
          </button>
        </div>

        <nav className="nav-tabs">
          {NAV[role].map((item) => {
            const isRequests = item.to === '/operator/requests';
            const label =
              isRequests && pendingCount > 0
                ? `${item.label} (${pendingCount})`
                : item.label;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={loc.pathname === item.to ? 'active' : ''}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {children}
      </main>
    </div>
  );
}

export function Badge({
  tone = 'default',
  children,
}: {
  tone?: 'ok' | 'warn' | 'bad' | 'info' | 'default';
  children: React.ReactNode;
}) {
  return <span className={`badge ${tone === 'default' ? '' : tone}`}>{children}</span>;
}
