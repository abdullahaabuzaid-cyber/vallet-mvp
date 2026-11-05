import { useMemo, useState } from 'react';
import { empName, formatDate, formatTime, operatorName, useStore } from '../../store/useStore';

export default function GovVisits() {
  const visits = useStore((s) => s.visits);
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return visits.slice(0, 15);
    return visits.filter((v) => {
      const emp = empName(v.checkInBy).toLowerCase();
      return (
        v.plate.toLowerCase().includes(query) ||
        v.receiptNo.toLowerCase().includes(query) ||
        emp.includes(query) ||
        operatorName(v.operatorId).toLowerCase().includes(query)
      );
    });
  }, [visits, q]);

  return (
    <div className="card">
      <h2>تدقيق الزيارات</h2>
      <div className="field">
        <label>رقم الإيصال / اللوحة / الموظف</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="12-34567 أو V-240871 أو أحمد" />
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>الإيصال</th>
            <th>اللوحة</th>
            <th>المشغّل</th>
            <th>الموظف</th>
            <th>دخول</th>
            <th>خروج</th>
          </tr>
        </thead>
        <tbody>
          {results.map((v) => (
            <tr key={v.id}>
              <td>{v.receiptNo}</td>
              <td>{v.plate}</td>
              <td>{operatorName(v.operatorId)}</td>
              <td>{empName(v.checkInBy)}</td>
              <td>{formatDate(v.checkInAt)} {formatTime(v.checkInAt)}</td>
              <td>{v.checkOutAt ? formatTime(v.checkOutAt) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!results.length && <div className="empty">لا نتائج</div>}
    </div>
  );
}
