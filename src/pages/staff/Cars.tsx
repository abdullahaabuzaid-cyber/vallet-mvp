import { durationLabel, empName, useStore } from '../../store/useStore';

export default function Cars() {
  const emp = useStore((s) => s.employees.find((e) => e.id === s.currentEmployeeId)!);
  const cars = useStore((s) =>
    s.visits.filter((v) => v.siteId === emp.siteId && !v.checkOutAt)
  );

  return (
    <div className="phone-shell">
      <div className="card">
        <h2>السيارات الحالية</h2>
        <p className="muted">في عهدة الموقع الآن — {cars.length}</p>
        <table className="table">
          <thead>
            <tr>
              <th>اللوحة</th>
              <th>الإيصال</th>
              <th>المدة</th>
              <th>الموظف</th>
            </tr>
          </thead>
          <tbody>
            {cars.map((v) => (
              <tr key={v.id}>
                <td>{v.plate}</td>
                <td>{v.receiptNo}</td>
                <td>{durationLabel(v.checkInAt)}</td>
                <td>{empName(v.checkInBy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cars.length && <div className="empty">لا سيارات حالياً</div>}
      </div>
    </div>
  );
}
