import { NavLink, useLocation } from 'react-router-dom';
import { NAV, NAV_ICONS as ICONS, ROLE_LABELS } from './nav';
import { Icon } from '../ui/Icon';
import { useStore } from '@/store';

export function PortalSidebar({ open, close }: { open: boolean; close: () => void }) {
  const role = useStore((s) => s.role);
  const count = useStore((s) => role === 'gov' ? s.complaints.filter((c) => c.status === 'open').length : s.handoffs.filter((h) => h.status === 'pending' && h.operatorId === s.currentOperatorId).length);
  const loc = useLocation();
  return <>
    {open && <button className="sidebar-backdrop" aria-label="إغلاق القائمة" onClick={close} />}
    <aside className={`portal-sidebar ${open ? 'is-open' : ''}`}>
      <NavLink to={`/${role}`} className="sidebar-brand" onClick={close}><span className="sidebar-logo">ف</span><div><strong>فاليت<span>VALLET</span></strong><small>إدارة أذكى. ثقة أكبر.</small></div></NavLink>
      <div className="sidebar-workspace"><span className="workspace-icon"><Icon name="shield" /></span><div><strong>مساحة {ROLE_LABELS[role]}</strong><small>عمّان · الأردن</small></div><span className="workspace-dot" /></div>
      <span className="sidebar-section">مساحة العمل</span>
      <nav aria-label="أقسام الدور">{NAV[role].map((item) => {
        const key = item.to.split('/')[2] || '';
        const badge = (role === 'gov' && key === 'complaints') || (role === 'operator' && key === 'requests');
        return <NavLink key={item.to} to={item.to} end className={loc.pathname === item.to ? 'active' : ''} onClick={close}><Icon name={ICONS[key] ?? 'grid'} /><span>{item.label}</span>{badge && count > 0 && <b>{count}</b>}</NavLink>;
      })}</nav>
      <div className="sidebar-bottom"><Icon name="spark" size={18} /><strong>كل التفاصيل بمكان واحد</strong><p>تنظيم الفاليه وحماية حقوق الجميع.</p><span>منصة فاليت <i>v2.0</i></span></div>
    </aside>
  </>;
}
