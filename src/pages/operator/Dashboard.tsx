import { Link } from 'react-router-dom';
import { empName, siteName, useStore } from '../../store/useStore';
import { Badge } from '../../components/Layout';

export default function OperatorDashboard() {
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
      {pendingHandoffs.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--warning)', background: 'var(--warning-soft)' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <Badge tone="warn">{pendingHandoffs.length} طلب تسليم جديد</Badge>
              <div style={{ marginTop: 6 }}>
                سائقون بانتظار قبول تسليم سياراتهم — راجع الصندوق فوراً.
              </div>
            </div>
            <Link to="/operator/requests" className="btn btn-primary">
              فتح الطلبات
            </Link>
          </div>
        </div>
      )}

      <div className="tiles">
        <div className="tile"><div className="n">{todayVisits.length}</div><div className="l">زيارات اليوم</div></div>
        <div className="tile"><div className="n">{activeCars.length}</div><div className="l">سيارات حالية</div></div>
        <div className="tile"><div className="n">{employees.filter((e) => e.active).length}</div><div className="l">موظفون نشطون</div></div>
        <div className="tile"><div className="n">{pendingHandoffs.length}</div><div className="l">طلبات سائقين</div></div>
        <div className="tile"><div className="n">{incidents.length}</div><div className="l">بلاغات مفتوحة</div></div>
      </div>

      <div className="card">
        <h2>لوحة اليوم — {op.name}</h2>
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
                  <td>{site.name} — {site.area}</td>
                  <td>{siteToday}</td>
                  <td>{siteActive}</td>
                  <td>{siteEmp}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>آخر الزيارات النشطة</h3>
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
        {!activeCars.length && <div className="empty">لا سيارات حالياً</div>}
      </div>
    </>
  );
}
