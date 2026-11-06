import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { resetDemo, setRole, useStore } from '../store/useStore';
import type { Role } from '../types';

const ROLE_LABELS: Record<Role, string> = {
  gov: 'حكومة',
  operator: 'مشغّل',
  staff: 'موظف',
  driver: 'سائق / صاحب سيارة',
};

const PORTAL_ROLES: Role[] = ['gov', 'operator', 'staff'];

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
  const isDriver = role === 'driver';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className={`app-shell ${isDriver ? 'shell-driver' : 'shell-portal'}`}>
      {isDriver ? (
        <header className="driver-topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden>
              <span className="brand-mark-letter">ف</span>
            </div>
            <div className="brand-text">
              <span className="brand-name">فاليت</span>
              <small>مواقف مرخّصة · عمّان</small>
            </div>
          </div>
          <div className="driver-top-actions" ref={menuRef}>
            <Link to="/driver/status" className="icon-chip" title="طلباتي">
              📋
            </Link>
            <button
              type="button"
              className="portal-menu-btn"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              دخول الجهات
            </button>
            {menuOpen && (
              <div className="portal-menu" role="menu">
                <div className="portal-menu-title">بوابات التشغيل</div>
                {PORTAL_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setRole(r);
                      setMenuOpen(false);
                    }}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
                <button type="button" className="portal-menu-reset" onClick={() => { resetDemo(); setMenuOpen(false); }}>
                  إعادة البيانات التجريبية
                </button>
              </div>
            )}
          </div>
        </header>
      ) : (
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden>
              <span className="brand-mark-letter">ف</span>
            </div>
            <div className="brand-text">
              <span className="brand-name">فاليت</span>
              <small>هيئة تنظيم الفاليه — عمّان</small>
            </div>
          </div>
          <div className="portal-header-actions">
            <button type="button" className="btn btn-sm portal-back" onClick={() => setRole('driver')}>
              ← تطبيق السائق
            </button>
            <div className="role-switch" role="tablist" aria-label="تبديل الدور">
              {(['gov', 'operator', 'staff'] as Role[]).map((r) => (
                <button
                  key={r}
                  className={role === r ? 'active' : ''}
                  onClick={() => setRole(r)}
                  type="button"
                  role="tab"
                  aria-selected={role === r}
                >
                  {ROLE_LABELS[r].split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </header>
      )}

      <main className={`main ${isDriver ? 'main-driver' : ''}`}>
        {!isDriver && (
          <div className="demo-banner">
            <span>وضع تجريبي للجهات — البيانات محفوظة محلياً على جهازك.</span>
            <button className="btn btn-sm" type="button" onClick={resetDemo}>
              إعادة البيانات
            </button>
          </div>
        )}

        {!isDriver && (
          <nav className="nav-tabs" aria-label="أقسام الدور">
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
        )}

        {children}
      </main>

      {!isDriver && (
        <footer className="app-footer">
          <span>فاليت · منصة حكومية لتنظيم الفاليه في عمّان</span>
        </footer>
      )}
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
