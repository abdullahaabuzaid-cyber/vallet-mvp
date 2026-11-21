import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '@common/types';
import { useStore } from '@/store';

export type PortalRole = Exclude<Role, 'driver'>;

/** Portal pages: signed-out → /login, wrong role → that user's own portal. */
export function Guard({ role, children }: { role: PortalRole; children: React.ReactNode }) {
  const session = useStore((s) => s.session);
  const loc = useLocation();
  if (!session || session.role === 'driver') return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (session.role !== role) return <Navigate to={`/${session.role}`} replace />;
  return <>{children}</>;
}
