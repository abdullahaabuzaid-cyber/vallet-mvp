import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout, resetDemo, useStore } from '@/store';
import { DriverHeader } from './DriverHeader';
import { NAV } from './nav';
import { PortalHeader } from './PortalHeader';
import { Toaster } from './Toaster';

/** App shell: driver or portal header, role tabs, toasts. */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const role = useStore((s) => s.role);
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
      {isDriver ? <DriverHeader /> : <PortalHeader onLogout={() => void doLogout()} />}

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
