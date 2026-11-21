import { Badge } from '../../components/Layout';
import { checkOut, durationLabel, empName, markReady, useStore } from '../../store/useStore';

export default function Cars() {
  const emp = useStore((s) => s.employees.find((e) => e.id === s.currentEmployeeId));
  const cars = useStore((s) =>
    s.visits
      .filter((v) => (emp?.siteId ? v.siteId === emp.siteId : v.operatorId === emp?.operatorId) && !v.checkOutAt)
      .sort((a, b) => Number(!!b.returnRequestedAt) - Number(!!a.returnRequestedAt))
  );

  return (
    <div className="phone-shell">
      <div className="card">
        <h2>السيارات الحالية</h2>
        <p className="muted">في عهدة الموقع الآن — {cars.length}. السيارات المطلوبة للإرجاع تظهر أولاً.</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>اللوحة</th>
                <th>الإيصال</th>
                <th>المدة</th>
                <th>الموظف</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {cars.map((v) => (
                <tr key={v.id}>
                  <td>{v.plate}</td>
                  <td>{v.receiptNo}</td>
                  <td>{durationLabel(v.checkInAt)}</td>
                  <td>{empName(v.checkInBy)}</td>
                  <td className="row">
                    {v.readyAt ? (
                      <Badge tone="ok">جاهزة عند المدخل</Badge>
                    ) : v.returnRequestedAt ? (
                      <Badge tone="warn">مطلوبة للإرجاع</Badge>
                    ) : (
                      <Badge tone="info">مركونة</Badge>
                    )}
                    {!v.readyAt && (
                      <button type="button" className="btn btn-sm" onClick={() => void markReady(v.id)}>
                        جاهزة
                      </button>
                    )}
                    <button type="button" className="btn btn-sm btn-success" onClick={() => void checkOut(v.id)}>
                      تسليم
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!cars.length && <div className="empty">لا سيارات حالياً</div>}
      </div>
    </div>
  );
}
