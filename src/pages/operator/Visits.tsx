import { empName, formatTime, siteName, useStore } from '../../store/useStore';

export default function OperatorVisits() {
  const opId = useStore((s) => s.currentOperatorId);
  const visits = useStore((s) => s.visits.filter((v) => v.operatorId === opId));

  return (
    <div className="card">
      <h2>سجل الزيارات</h2>
      <p className="muted">سجل كامل للدخول والخروج</p>
      <table className="table">
        <thead>
          <tr>
            <th>الإيصال</th>
            <th>اللوحة</th>
            <th>الموقع</th>
            <th>الموظف</th>
            <th>دخول</th>
            <th>خروج</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((v) => (
            <tr key={v.id}>
              <td>{v.receiptNo}</td>
              <td>{v.plate}</td>
              <td>{siteName(v.siteId)}</td>
              <td>{empName(v.checkInBy)}</td>
              <td>{formatTime(v.checkInAt)}</td>
              <td>{v.checkOutAt ? formatTime(v.checkOutAt) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
