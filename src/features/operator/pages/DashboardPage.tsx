import { Link } from 'react-router-dom';
import { empName, siteName, useStore } from '@/store';
import { Badge } from '@/shared/components/ui/Badge';
import { StatCard } from '@/shared/components/ui/StatCard';

export default function DashboardPage() {
  const opId = useStore((s) => s.currentOperatorId);
  const op = useStore((s) => s.operators.find((o) => o.id === opId));
  const visits = useStore((s) => s.visits.filter((v) => v.operatorId === opId));
  const employees = useStore((s) => s.employees.filter((e) => e.operatorId === opId));
  const incidents = useStore((s) => s.incidents.filter((i) => i.operatorId === opId && i.status !== 'closed'));
  const pendingHandoffs = useStore((s) =>
    s.handoffs.filter((h) => h.operatorId === opId && h.status === 'pending')
  );

  const today = new Date().toDateString();
  const todayVisits = visits.filter((v) => new Date(v.checkInAt).toDateString() === today);
  const activeCars = visits.filter((v) => !v.checkOutAt);

  if (!op) {
    return <div className="card empty">لا بيانات للمشغّل الحالي</div>;
  }

  return (
    <>
      <div className="card promo-card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>سجل السيارات</h3>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              لوحة، دخول/خروج، استلام وتسليم، وخط زمني كامل لكل زيارة
            </p>
          </div>
          <Link to="/operator/visits" className="btn btn-primary">
            فتح السجل
          </Link>
        </div>
      </div>

      {pendingHandoffs.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--warning)', background: 'var(--warning-soft)' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <Badge tone="warn">{pendingHandoffs.length} طلب تسليم جديد</Badge>
              <div style={{ marginTop: 6 }}>سائقون بانتظار قبول تسليم سياراتهم — راجع الصندوق فوراً.</div>
            </div>
            <Link to="/operator/requests" className="btn btn-primary">
              فتح الطلبات
            </Link>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="زيارات اليوم" value={todayVisits.length} icon="car" />
        <StatCard label="سيارات حالية" value={activeCars.length} icon="pin" tone="teal" />
        <StatCard label="موظفون نشطون" value={employees.filter((e) => e.active).length} icon="users" tone="violet" />
        <StatCard label="طلبات سائقين" value={pendingHandoffs.length} icon="bell" tone="amber" />
        <StatCard label="بلاغات مفتوحة" value={incidents.length} icon="shield" tone="amber" />
      </div>

      <div className="card">
        <div className="section-head"><div><h2>لوحة اليوم — {op.name}</h2><p>الإشغال والفريق في كل موقف</p></div></div>
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>الموقع</th>
              <th>زيارات اليوم</th>
              <th>حالية</th>
              <th>موظفون</th>
            </tr>
          </thead>
          <tbody>
            {op.sites.map((site) => {
              const siteToday = todayVisits.filter((v) => v.siteId === site.id).length;
              const siteActive = activeCars.filter((v) => v.siteId === site.id).length;
              const siteEmp = employees.filter((e) => e.siteId === site.id && e.active).length;
              return (
                <tr key={site.id}>
                  <td>
                    {site.name} — {site.area}
                  </td>
                  <td>{siteToday}</td>
                  <td>{siteActive}</td>
                  <td>{siteEmp}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>آخر الزيارات النشطة</h3>
          <Link to="/operator/visits" className="btn btn-sm">
            سجل السيارات
          </Link>
        </div>
        <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>الإيصال</th>
              <th>اللوحة</th>
              <th>الموقع</th>
              <th>الموظف</th>
            </tr>
          </thead>
          <tbody>
            {activeCars.slice(0, 6).map((v) => (
              <tr key={v.id}>
                <td>{v.receiptNo}</td>
                <td>{v.plate}</td>
                <td>{siteName(v.siteId)}</td>
                <td>{empName(v.checkInBy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {!activeCars.length && <div className="empty">لا سيارات حالياً</div>}
      </div>
    </>
  );
}
