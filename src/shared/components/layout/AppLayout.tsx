import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logout, useStore } from '@/store';
import { DriverHeader } from './DriverHeader';
import { PortalHeader } from './PortalHeader';
import { PortalSidebar } from './PortalSidebar';
import { PortalPageHeading } from './PortalPageHeading';
import { StaffTabBar } from './StaffTabBar';
import { Toaster } from './Toaster';

/** Role shell: RTL desktop sidebar, mobile drawer, driver map-first layout. */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const role = useStore((s) => s.role);
  const loc = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const isDriver = !/^\/(gov|operator|staff)(\/|$)/.test(loc.pathname) || role === 'driver';
  async function doLogout() {
    await logout();
    navigate(role === 'driver' ? '/driver' : '/login');
  }
  return <div className={`app-shell ${isDriver ? 'shell-driver' : `shell-portal role-${role}`}`}>
    {!isDriver && <PortalSidebar open={menu} close={() => setMenu(false)} />}
    {isDriver ? <DriverHeader /> : <PortalHeader onMenu={() => setMenu(!menu)} onLogout={() => void doLogout()} />}
    <main className={`main ${isDriver ? 'main-driver' : ''}`}>
      {!isDriver && <PortalPageHeading />}
      {children}
    </main>
    {!isDriver && <footer className="app-footer"><span>فاليت · تنظيم الفاليه وحماية الحقوق</span><span>عمّان، الأردن <i className="footer-dot" /> اتصال آمن</span></footer>}
    {!isDriver && role === 'staff' && <StaffTabBar />}
    <Toaster />
  </div>;
}
