import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { LiveDot } from './LiveDot';
import { ROLE_LABELS } from './nav';

/** Top bar for gov / operator / staff portals. */
export function PortalHeader({ onLogout }: { onLogout: () => void }) {
  const role = useStore((s) => s.role);
  const session = useStore((s) => s.session);
  return (
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
        <button type="button" className="btn btn-sm portal-back" onClick={onLogout}>
          خروج
        </button>
      </div>
    </header>
  );
}
