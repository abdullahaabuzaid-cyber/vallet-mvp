import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { LiveDot } from './LiveDot';

/** Top bar on the public / driver side. */
export function DriverHeader() {
  const session = useStore((s) => s.session);
  return (
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
        {session?.role === 'driver' && <details className="driver-account-menu"><summary className="icon-chip" aria-label="خدماتي">☰</summary><nav><Link to="/driver/book">حجز مسبق</Link><Link to="/driver/wallet">المحفظة والاشتراك</Link><Link to="/report">بلاغ عام</Link></nav></details>}
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
  );
}
