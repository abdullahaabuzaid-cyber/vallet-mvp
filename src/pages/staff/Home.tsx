import { Link } from 'react-router-dom';
import { empName, siteName, useStore } from '../../store/useStore';

export default function StaffHome() {
  const empId = useStore((s) => s.currentEmployeeId);
  const emp = useStore((s) => s.employees.find((e) => e.id === empId)!);
  const activeCars = useStore(
    (s) => s.visits.filter((v) => v.siteId === emp.siteId && !v.checkOutAt).length
  );

  return (
    <div className="phone-shell">
      <div className="card">
        <div className="muted">مرحباً، {empName(emp.id)}</div>
        <h2 style={{ marginTop: 4 }}>موقع: {emp.siteId ? siteName(emp.siteId) : '—'}</h2>
        <div className="big-actions" style={{ marginTop: 16 }}>
          <Link to="/staff/scan" className="btn btn-primary btn-big">
            صوّر النمرة (OCR)
          </Link>
          <Link to="/staff/checkin" className="btn btn-big">
            دخول سيارة
          </Link>
          <Link to="/staff/checkout" className="btn btn-big">
            خروج سيارة
          </Link>
          <Link to="/staff/incident" className="btn btn-big">
            بلاغ حادثة
          </Link>
        </div>
        <p className="muted" style={{ marginTop: 16, textAlign: 'center' }}>
          سيارات حالية:{' '}
          <strong style={{ color: 'var(--text)' }}>{activeCars}</strong>
          {' · '}
          <Link to="/staff/cars" style={{ color: 'var(--primary)' }}>
            عرض القائمة
          </Link>
        </p>
      </div>
    </div>
  );
}
