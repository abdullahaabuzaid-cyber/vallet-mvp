import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout, resetDemo, useRealtimeConnected, useStore } from '../store/useStore';
import { dismissToast, useToasts } from '../lib/toast';
import type { Role } from '../types';

const ROLE_LABELS: Record<Role, string> = {
  gov: 'الهيئة',
  operator: 'مشغّل',
  staff: 'موظف',
  driver: 'سائق / صاحب سيارة',
};

const NAV: Record<Role, { to: string; label: string }[]> = {
  staff: [
    { to: '/staff', label: 'الرئيسية' },
    { to: '/staff/scan', label: 'صوّر النمرة' },
    { to: '/staff/checkin', label: 'دخول' },
    { to: '/staff/checkout', label: 'خروج' },
    { to: '/staff/cars', label: 'الحالية' },
    { to: '/staff/incident', label: 'بلاغ' },
  ],
  operator: [
    { to: '/operator', label: 'اليوم' },
    { to: '/operator/visits', label: 'سجل السيارات' },
    { to: '/operator/requests', label: 'طلبات السائقين' },
    { to: '/operator/employees', label: 'الموظفون' },
    { to: '/operator/license', label: 'التسجيل / الترخيص' },
    { to: '/operator/payments', label: 'الفواتير والدفع' },
    { to: '/operator/feedback', label: 'التقييمات والشكاوى' },
  ],
  gov: [
    { to: '/gov', label: 'الملخص' },
    { to: '/gov/alerts', label: 'تنبيهات ذكية' },
    { to: '/gov/map', label: 'الخريطة' },
    { to: '/gov/licenses', label: 'مراجعة التسجيل' },
    { to: '/gov/operators', label: 'المشغّلون' },
    { to: '/gov/visits', label: 'تدقيق' },
    { to: '/gov/incidents', label: 'بلاغات' },
    { to: '/gov/complaints', label: 'الشكاوى' },
    { to: '/gov/payments', label: 'الإيرادات' },
    { to: '/gov/reports', label: 'التقارير' },
  ],
  driver: [],
};

function Toaster() {
  const toasts = useToasts();
  const nav = useNavigate();
  if (!toasts.length) return null;
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-item tone-${t.tone}`}
          onClick={() => {
            if (t.link) nav(t.link);
            dismissToast(t.id);
          }}
        >
          <strong>{t.title}</strong>
          {t.body && <span>{t.body}</span>}
        </div>
      ))}
    </div>
  );
}

function LiveDot() {
  const live = useRealtimeConnected();
  return (
    <span className={`live-dot ${live ? 'on' : ''}`} title={live ? 'متصل — تحديثات فورية' : 'غير متصل'}>
      {live ? 'مباشر' : '…'}
    </span>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const role = useStore((s) => s.role);
  const session = useStore((s) => s.session);
  const pendingCount = useStore(
    (s) => s.handoffs.filter((h) => h.operatorId === s.currentOperatorId && h.status === 'pending').length
  );
  const openComplaints = useStore((s) => s.complaints.filter((c) => c.status === 'open').length);
  const loc = useLocation();
  const nav = useNavigate();
  const isPortalPath = /^\/(gov|operator|staff)(\/|$)/.test(loc.pathname);
  const isDriver = !isPortalPath || role === 'driver';

  async function doLogout() {
    await logout();
    nav(role === 'driver' ? '/driver' : '/login');
  }

  return (
    <div className={`app-shell ${isDriver ? 'shell-driver' : 'shell-portal'}`}>
      {isDriver ? (
        <header className="driver-topbar">
          <Link to="/driver" className="brand">
            <div className="brand-mark" aria-hidden>
              <span className="brand-mark-letter">ف</span>
            </div>
            <div className="brand-text">
              <span className="brand-name">فاليت</span>
              <small>مواقف مرخّصة · عمّان</small>
            </div>
          </Link>
          <div className="driver-top-actions">
            {session?.role === 'driver' && <LiveDot />}
            <Link to="/driver/auth" className="icon-chip" title={session?.role === 'driver' ? 'حسابي' : 'تسجيل الدخول'} aria-label="حسابي">
              {session?.role === 'driver' ? '👤' : '📱'}
            </Link>
            <Link to="/driver/status" className="icon-chip" title="طلباتي" aria-label="طلباتي">
              📋
            </Link>
            {session && session.role !== 'driver' ? (
              <Link to={`/${session.role}`} className="portal-menu-btn">
                بوابتي
              </Link>
            ) : (
              <Link to="/login" className="portal-menu-btn">
                دخول الجهات
              </Link>
            )}
          </div>
        </header>
      ) : (
        <header className="topbar">
          <Link to={`/${role}`} className="brand">
            <div className="brand-mark" aria-hidden>
              <span className="brand-mark-letter">ف</span>
            </div>
            <div className="brand-text">
              <span className="brand-name">فاليت</span>
              <small>هيئة تنظيم الفاليه — عمّان</small>
            </div>
          </Link>
          <div className="portal-header-actions">
            <LiveDot />
            {session && (
              <span className="user-chip">
                <span className={`role-chip role-${session.role}`}>{ROLE_LABELS[session.role]}</span>
                <span className="user-name">{session.name}</span>
              </span>
            )}
            <button type="button" className="btn btn-sm portal-back" onClick={() => void doLogout()}>
              خروج
            </button>
          </div>
        </header>
      )}

      <main className={`main ${isDriver ? 'main-driver' : ''}`}>
        {!isDriver && role === 'gov' && (
          <div className="demo-banner">
            <span>بيئة تجريبية: البيانات محفوظة على الخادم ومشتركة بين كل الحسابات.</span>
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => {
                if (confirm('إعادة كل البيانات التجريبية؟ سيتم حذف أي بيانات مضافة.')) void resetDemo();
              }}
            >
              إعادة البيانات
            </button>
          </div>
        )}

        {!isDriver && (
          <nav className="nav-tabs" aria-label="أقسام الدور">
            {NAV[role].map((item) => {
              let label = item.label;
              if (item.to === '/operator/requests' && pendingCount > 0) label = `${item.label} (${pendingCount})`;
              if (item.to === '/gov/complaints' && openComplaints > 0) label = `${item.label} (${openComplaints})`;
              return (
                <Link key={item.to} to={item.to} className={loc.pathname === item.to ? 'active' : ''}>
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
      <Toaster />
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
