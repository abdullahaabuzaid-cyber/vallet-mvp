import { useLocation } from 'react-router-dom';
import { useStore } from '@/store';
import { LiveDot } from './LiveDot';
import { NAV, ROLE_LABELS } from './nav';
import { Icon } from '../ui/Icon';

export function PortalHeader({ onLogout, onMenu }: { onLogout: () => void; onMenu: () => void }) {
  const role = useStore((s) => s.role);
  const session = useStore((s) => s.session);
  const loc = useLocation();
  const title = NAV[role].find((n) => n.to === loc.pathname)?.label ?? 'لوحة التحكم';
  return <header className="topbar portal-topbar">
    <div className="portal-breadcrumb"><button type="button" className="icon-btn mobile-menu" aria-label="فتح القائمة" onClick={onMenu}><Icon name="menu" /></button><span>مساحة {ROLE_LABELS[role]}</span><span className="breadcrumb-slash">/</span><strong>{title}</strong></div>
    <div className="portal-header-actions"><LiveDot /><span className="header-divider" /><div className="user-chip"><span className="user-avatar">{session?.name.trim().split(/\s+/)[0].slice(0, 2)}</span><div><strong>{session?.name}</strong><small>{ROLE_LABELS[role]}</small></div></div><button className="icon-btn" type="button" aria-label="خروج" title="خروج" onClick={onLogout}><Icon name="arrow" size={18} /></button></div>
  </header>;
}
